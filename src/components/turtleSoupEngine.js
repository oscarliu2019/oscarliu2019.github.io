import classifierModel from '../data/turtleSoupModel.json';
import {
  normalizeQuestion,
  vectorizeQuestion
} from './turtleSoupFeatures';

const DIMENSION = classifierModel.dimension;
const VOCABULARY = new Set(classifierModel.vocabulary);
const normalize = normalizeQuestion;
const vectorize = input =>
  vectorizeQuestion(
    input,
    DIMENSION,
    classifierModel.aliases,
    VOCABULARY
  );

export { normalizeQuestion };

const createDecoyNode = (soup, nodeId) => {
  const statement = (soup.decoyStatements || []).find(
    item => `decoy-${item.id}` === nodeId
  );
  if (!statement) return null;
  return {
    id: nodeId,
    question: statement.question || statement.text,
    verdict: 'no',
    reply: statement.reply || `${statement.text}并不是真相。`,
    reveals: [],
    patterns: statement.patterns || [],
    requires: []
  };
};

const getNodeById = (soup, nodeId) =>
  soup.questionNodes.find(node => node.id === nodeId) ||
  createDecoyNode(soup, nodeId);

const scoreQuestion = (question, soup) => {
  const vector = vectorize(question);
  const weightedVector = new Map(
    [...vector].map(([index, value]) => [
      index,
      value * classifierModel.idf[index]
    ])
  );
  const vectorNorm = Math.sqrt(
    [...weightedVector.values()].reduce(
      (sum, value) => sum + value * value,
      0
    )
  );
  const grouped = new Map();
  classifierModel.labels.forEach(label => {
    let score = 0;
    label.weights.forEach(([index, weight]) => {
      score += ((weightedVector.get(index) || 0) / vectorNorm) * weight;
    });
    const key =
      `${label.soupId || ''}:${label.nodeId}:${label.verdict}:` +
      `${label.polarityLocked ? 1 : 0}`;
    const current = grouped.get(key);
    if (!current || score > current.score) {
      grouped.set(key, { ...label, score });
    }
  });
  const scores = [...grouped.values()].sort(
    (left, right) => right.score - left.score
  );
  const currentScores = scores.filter(label => label.soupId === soup.id);
  const best = currentScores[0];
  const second = currentScores[1];
  const bestForeign = scores.find(label =>
    label.soupId && label.soupId !== soup.id
  );
  const bestUnknown = scores.find(label => !label.soupId);
  const foreignDominates =
    bestForeign?.score > best.score + classifierModel.foreignTolerance;
  const unknownDominates = bestUnknown?.score >= best.score;

  if (foreignDominates || unknownDominates) {
    const rejected = foreignDominates ? bestForeign : bestUnknown;
    return {
      ...rejected,
      nodeId: `__unknown__:${rejected.nodeId}`,
      accepted: true,
      margin: rejected.score - best.score
    };
  }

  return {
    ...best,
    margin: best.score - (second?.score || 0),
    accepted:
      best.score >= classifierModel.threshold &&
      best.score - (second?.score || 0) >= classifierModel.margin
  };
};

const exactRecords = soup => {
  const records = [];
  soup.questionNodes.forEach(node => {
    records.push({
      node,
      text: node.question,
      verdict: node.verdict,
      polarityLocked: false
    });
    (node.patterns || []).forEach(pattern => {
      records.push({
        node,
        text: typeof pattern === 'string' ? pattern : pattern.text,
        verdict: typeof pattern === 'string' ? node.verdict : pattern.verdict,
        reply: typeof pattern === 'string' ? node.reply : pattern.reply,
        polarityLocked: typeof pattern !== 'string'
      });
    });
    (node.reveals || []).forEach(factId => {
      const fact = soup.facts.find(item => item.id === factId);
      if (fact) {
        records.push({
          node,
          text: fact.text,
          verdict: 'yes',
          reply: fact.text,
          polarityLocked: true
        });
      }
    });
  });
  (soup.decoyStatements || []).forEach(statement => {
    const node = createDecoyNode(soup, `decoy-${statement.id}`);
    [statement.text, ...(statement.patterns || [])].forEach(text => {
      records.push({
        node,
        text,
        verdict: 'no',
        reply: statement.reply,
        polarityLocked: true
      });
    });
  });
  return records;
};

const isSingleTypo = (left, right) => {
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left.length === right.length) {
    const differences = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) differences.push(index);
    }
    return differences.length === 1 ||
      (
        differences.length === 2 &&
        differences[1] === differences[0] + 1 &&
        left[differences[0]] === right[differences[1]] &&
        left[differences[1]] === right[differences[0]]
      );
  }
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  let shortIndex = 0;
  let longIndex = 0;
  let skipped = false;
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
    } else if (!skipped) {
      skipped = true;
      longIndex += 1;
    } else {
      return false;
    }
  }
  return true;
};

const invertVerdict = verdict => verdict === 'yes' ? 'no' : verdict === 'no' ? 'yes' : verdict;

const isNegated = question => /不是|并非|没有|没在|不会|不能|不可能|没(?=从|去|来|进|出|被|做|吃|杀|偷)/.test(
  String(question || '')
    .replace(/没有.+?而是|不是.+?而是|并非.+?而是/g, '')
    .replace(/有没有|是不是|是否有|是否是/g, '')
);

const nextQuestion = (soup, revealedFactIds, askedIds) =>
  getAvailableQuestionNodes(soup, revealedFactIds).find(
    node => !askedIds.includes(node.id)
  );

const conversationReply = (question, soup, options) => {
  const value = normalize(question)
    .replace(/^(麻烦问一下|请教一下|想请问|请问一下|请问)/, '');
  if (/^(你好|嗨|哈喽|在吗|主持人好)$/.test(value)) {
    return '我在。你可以围绕人物、地点、时间、动机或异常细节提问。';
  }
  if (
    /^(你|你本人|主持人)/.test(value) ||
    /(你说的话|你的回答|主持人说的话|主持人的回答)/.test(value)
  ) {
    return '我是这局海龟汤的规则主持人，不是故事中的角色。我只根据题目事实回答。';
  }
  if (/^(谢谢|谢了|明白了|懂了|好的|好)$/.test(value)) {
    return '继续吧。把已经确认的事实连起来，真相就快出来了。';
  }
  if (/^(怎么玩|规则|游戏规则|怎么提问|我该怎么问)$/.test(value)) {
    return '一次提出一个可以用“是”或“不是”判断的假设。我会根据题目事实回答。';
  }
  if (/^(接下来|接下来问什么|然后呢|给点方向|给个方向|我不知道|没思路|卡住了)$/.test(value)) {
    const node = nextQuestion(
      soup,
      options.revealedFactIds || [],
      options.askedIds || []
    );
    return node
      ? `可以继续调查这个方向：“${node.question}”`
      : '你已经掌握了主要线索，可以尝试还原真相。';
  }
  return null;
};

export const getAvailableQuestionNodes = (soup, revealedFactIds) => {
  const revealed = new Set(revealedFactIds);
  return soup.questionNodes.filter(node =>
    (node.requires || []).every(factId => revealed.has(factId))
  );
};

export const answerQuestionNode = (node, question, options = {}) => {
  const baseVerdict = options.verdict || node.verdict;
  const verdict = !options.polarityLocked && isNegated(question)
    ? invertVerdict(baseVerdict)
    : baseVerdict;
  const repeated = (options.askedIds || []).includes(node.id);
  return {
    verdict,
    reply: verdict === 'yes' ? '是' : verdict === 'no' ? '不是' : '无关',
    repeated
  };
};

export const matchQuestion = (question, soup, options = {}) => {
  const normalized = normalize(question);
  if (normalized.length < 2) {
    return {
      type: 'invalid',
      reply: '这个问题太短了。请把人物、地点或行为说具体一点。'
    };
  }

  const conversation = conversationReply(question, soup, options);
  if (conversation) return { type: 'conversation', reply: conversation };

  const records = exactRecords(soup);
  const exact = records.find(record =>
    normalize(record.text) === normalized
  );
  if (exact) {
    const response = answerQuestionNode(exact.node, question, {
      ...options,
      verdict: exact.verdict,
      reply: exact.reply,
      polarityLocked: exact.polarityLocked
    });
    return {
      type: 'answer',
      node: exact.node,
      verdict: response.verdict,
      reply: response.reply,
      repeated: response.repeated,
      confidence: 1
    };
  }

  const typoMatches = records.filter(record =>
    isSingleTypo(normalize(record.text), normalized)
  );
  const typoGroups = new Map(
    typoMatches.map(record => [
      `${record.node.id}:${record.verdict}:${record.polarityLocked ? 1 : 0}`,
      record
    ])
  );
  if (typoGroups.size === 1) {
    const typo = [...typoGroups.values()][0];
    const response = answerQuestionNode(typo.node, question, {
      ...options,
      verdict: typo.verdict,
      reply: typo.reply,
      polarityLocked: typo.polarityLocked
    });
    return {
      type: 'answer',
      node: typo.node,
      verdict: response.verdict,
      reply: response.reply,
      repeated: response.repeated,
      confidence: 0.99
    };
  }

  if (/(为什么|为何|怎么会|什么原因|原因是什么)/.test(question)) {
    return {
      type: 'invalid',
      reply: '请先把原因改成一个可以用“是”或“不是”判断的假设。'
    };
  }

  const prediction = scoreQuestion(question, soup);
  if (prediction?.accepted) {
    if (prediction.nodeId.startsWith('__unknown__:')) {
      return {
        type: 'irrelevant',
        verdict: 'irrelevant',
        reply: '无关'
      };
    }
    const node = getNodeById(soup, prediction.nodeId);
    if (node) {
      const response = answerQuestionNode(node, question, {
        ...options,
        verdict: prediction.verdict,
        polarityLocked: prediction.polarityLocked
      });
      return {
        type: 'answer',
        node,
        verdict: response.verdict,
        reply: response.reply,
        repeated: response.repeated,
        confidence: prediction.score
      };
    }
  }

  if (prediction && prediction.score >= classifierModel.threshold * 0.75) {
    return {
      type: 'clarify',
      reply: '这个问题和当前故事有关，但意思还不够明确。请换一种说法，或补充具体的人物和行为。'
    };
  }

  return {
    type: 'irrelevant',
    verdict: 'irrelevant',
    reply: '无关'
  };
};

export const checkReconstruction = (soup, selectedNodeIds) => {
  const expected = new Set(soup.solutionFactIds);
  const selected = new Set(selectedNodeIds);
  return expected.size === selected.size &&
    [...expected].every(factId => selected.has(factId));
};
