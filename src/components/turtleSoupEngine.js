const SYNONYMS = [
  [/地板|地上/g, '地面'],
  [/厕所|卫生间/g, '洗手间'],
  [/嫌疑人|犯人/g, '小偷'],
  [/刚刚|刚才/g, '刚'],
  [/店门外|店外|门外|正门外|门口/g, '外面'],
  [/身上的是/g, '身上是'],
  [/雨水/g, '雨'],
  [/有没有|是否有/g, '有'],
  [/是不是|是否是/g, '是'],
  [/为什么会/g, '为什么']
];

export const normalizeQuestion = input => {
  let normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[？?！!。，、；;：“”"'（）()\s]/g, '');
  SYNONYMS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  return normalized.replace(/[吗呢吧呀么]+$/g, '');
};

const bigrams = value => {
  if (value.length < 2) return new Set(value ? [value] : []);
  const result = new Set();
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2));
  }
  return result;
};

const diceSimilarity = (left, right) => {
  const leftSet = bigrams(normalizeQuestion(left));
  const rightSet = bigrams(normalizeQuestion(right));
  if (leftSet.size === 0 || rightSet.size === 0) return 0;
  let overlap = 0;
  leftSet.forEach(value => {
    if (rightSet.has(value)) overlap += 1;
  });
  return 2 * overlap / (leftSet.size + rightSet.size);
};

const scoreQuestionNode = (question, node) => {
  const normalized = normalizeQuestion(question);
  const patterns = [node.question, ...(node.patterns || [])];
  const exact = patterns.some(pattern => {
    const normalizedPattern = normalizeQuestion(pattern);
    return normalized === normalizedPattern ||
      (normalizedPattern.length >= 3 && normalized.includes(normalizedPattern));
  });
  if (exact && normalized.length >= 3) return 1;

  const matchedKeywords = (node.keywords || []).filter(keyword =>
    normalized.includes(normalizeQuestion(keyword))
  ).length;
  const keywordScore = node.keywords?.length
    ? matchedKeywords / Math.min(3, node.keywords.length)
    : 0;
  const semanticScore = Math.max(...patterns.map(pattern => diceSimilarity(question, pattern)));
  return Math.min(1, keywordScore * 0.62 + semanticScore * 0.38);
};

export const getAvailableQuestionNodes = (soup, revealedFactIds) => {
  const revealed = new Set(revealedFactIds);
  return soup.questionNodes.filter(node =>
    (node.requires || []).every(factId => revealed.has(factId))
  );
};

export const matchQuestion = (question, soup) => {
  const rawQuestion = String(question || '').trim();
  const normalized = normalizeQuestion(question);
  if (normalized.length < 2) {
    return { type: 'invalid', reply: '问题太短了，请描述得更具体一些。' };
  }

  const possibleClauses = rawQuestion
    .split(/并且|而且|同时|还是|或者|以及|但是|然后|随后|接着|但|和|又|且|或|并(?!非)|[，,。.;；、？！!?]/)
    .map(part => part.trim())
    .filter(Boolean);
  const clauseScores = possibleClauses.map(part =>
    Math.max(
      ...soup.questionNodes.map(node => scoreQuestionNode(part, node))
    )
  );
  const isContextFragment = part => {
    const clause = normalizeQuestion(
      part.replace(/是不是|有没有|是否是|是否有/g, '')
    );
    return /^(?:这件事|男人|店员|他|雨伞|地面)$/.test(clause) ||
      /^(?:男人|店员|他)?(?:在.*(?:里|内|外|中|上|下|旁|附近|店|商店|仓库|洗手间|厕所|门口)|有可能|可能|也许|大概|昨天|今天|刚才|当时|故意|为什么|怎么|如何)$/.test(clause);
  };
  const matchedClauseCount = clauseScores.filter((score, index) =>
    score >= 0.5 && !isContextFragment(possibleClauses[index])
  ).length;
  const hypothesisClauseCount = possibleClauses.filter(part => {
    const clause = part.replace(/是不是|有没有|是否是|是否有/g, '');
    return !isContextFragment(part) && clause.length >= 3 &&
      /(?:没有|不在|偷|用过|来自|进入|进来|进店|重要|认识|参与|淋湿|弄湿|丢|少|(?:是|有)(?!可能).{2,})/.test(clause);
  }).length;
  const hasRecognizedClauseWithUnknownCompanion =
    clauseScores.some((score, index) =>
      score >= 0.58 && !isContextFragment(possibleClauses[index])
    ) &&
    possibleClauses.some((part, index) =>
      clauseScores[index] < 0.58 && !isContextFragment(part)
    );
  const hasMultipleSentenceFragments = rawQuestion
    .split(/[。.;；、？！!?]/)
    .filter(part => normalizeQuestion(part).length >= 2)
    .length >= 2;
  if (
    matchedClauseCount >= 2 ||
    hypothesisClauseCount >= 2 ||
    hasRecognizedClauseWithUnknownCompanion ||
    hasMultipleSentenceFragments
  ) {
    return {
      type: 'invalid',
      reply: '一次只验证一个假设。请把这个问题拆成两个可以分别回答的问题。'
    };
  }
  if (
    /从(店门外|店外|门外|外面|正门|门口).*(进入|进来|进店)/.test(rawQuestion) &&
    !/(刚|当时|报警时|冲进)/.test(rawQuestion)
  ) {
    return {
      type: 'invalid',
      reply: '时间点需要说清楚：你是问他打烊前如何进入，还是报警时是否刚从暴雨中进来？'
    };
  }
  if (/(告诉|公布|直接看|揭晓).*(答案|汤底|真相)/.test(rawQuestion)) {
    return {
      type: 'invalid',
      reply: '可以使用下方的“直接查看最终故事”，或者继续提问后自己还原。'
    };
  }

  // Free-form questions may jump ahead; dependency rules only control which
  // prompts are proactively suggested, never force the host to answer wrongly.
  const questionVariants = [question, ...possibleClauses];
  const subject = rawQuestion.match(/^(男人|店员|他)/)?.[1];
  if (subject && possibleClauses.length > 1) {
    questionVariants.push(`${subject}${possibleClauses[possibleClauses.length - 1]}`);
  }
  const ranked = soup.questionNodes
    .map(node => ({
      node,
      score: Math.max(...questionVariants.map(variant => scoreQuestionNode(variant, node)))
    }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const second = ranked[1];

  if (best && best.score >= 0.58 && (!second || best.score - second.score >= 0.06)) {
    const polarityText = rawQuestion.replace(/是不是|有没有|是否是|是否有/g, '');
    const isNegatedYesNo = /(没有|没|不是|不在|并非|未).*(吗|么|[?？])?$/.test(polarityText);
    const verdict = isNegatedYesNo && ['yes', 'no'].includes(best.node.verdict)
      ? best.node.verdict === 'yes' ? 'no' : 'yes'
      : best.node.verdict;
    const reply = isNegatedYesNo
      ? best.node.reply.replace(/^(是|不是|没有)[。！]?\s*/, '')
      : best.node.reply;
    return { type: 'answer', node: best.node, verdict, reply, confidence: best.score };
  }

  if (best && best.score >= 0.32) {
    return {
      type: 'clarify',
      reply: '这个问题有点模糊，你更接近下面哪一种意思？',
      candidates: ranked.slice(0, 3).map(item => item.node)
    };
  }

  return {
    type: 'irrelevant',
    reply: '这和事件核心关系不大。换个角度，关注人物是如何进入商店、身上的水从哪里来。'
  };
};

export const checkReconstruction = (soup, selectedNodeIds) => {
  const expected = new Set(soup.solutionFactIds);
  const selected = new Set(selectedNodeIds);
  return expected.size === selected.size &&
    [...expected].every(factId => selected.has(factId));
};
