const SYNONYMS = [
  [/地板|地上/g, '地面'],
  [/厕所|卫生间|盥洗室/g, '洗手间'],
  [/嫌疑人|犯人|罪犯/g, '小偷'],
  [/刚刚|刚才/g, '刚'],
  [/店门外|店外|门外|正门外|门口/g, '外面'],
  [/身上的是/g, '身上是'],
  [/雨水/g, '雨'],
  [/有没有|是否有/g, '有'],
  [/是不是|是否是/g, '是'],
  [/就是|正是/g, '是'],
  [/为什么会/g, '为什么'],
  [/晓得|知不知道/g, '知道'],
  [/有关联|有联系|有关系/g, '相关'],
  [/要紧|关键吗/g, '重要']
];

const QUESTION_FILLERS = [
  '请问',
  '麻烦问一下',
  '请教一下',
  '劳驾问下',
  '想请问',
  '麻烦问',
  '请教',
  '劳驾问',
  '一下',
  '我想问',
  '想知道',
  '叙述者',
  '主角',
  '能不能',
  '可以说',
  '告诉我',
  '所以',
  '那么',
  '然后',
  '这个',
  '这件事',
  '这件事情',
  '是不是',
  '有没有',
  '是否',
  '真的',
  '可能',
  '大概',
  '一名',
  '一个',
  '一只',
  '刚',
  '究竟',
  '到底',
  '请'
];

const YES_PREFIXES = ['是。', '对。', '没错。', '可以这么理解。'];
const NO_PREFIXES = ['不是。', '不对。', '没有。', '并非如此。'];
const IRRELEVANT_PREFIXES = ['无关。', '这不是关键。', '这条线索和核心真相关系不大。'];
const GENERIC_TOPIC_WORDS = new Set([
  '叙述者',
  '主角',
  '男人',
  '女人',
  '孩子',
  '儿子',
  '女儿',
  '哥哥',
  '弟弟',
  '丈夫',
  '妻子',
  '爸爸',
  '妈妈',
  '父亲',
  '母亲',
  '父母',
  '家人',
  '母子',
  '亲生',
  '自己',
  '身份',
  '时间',
  '地点',
  '行为',
  '事情',
  '东西',
  '事实',
  '真相',
  '死亡',
  '杀死',
  '发生',
  '真正',
  '最后'
]);
const ROLE_WORDS = [
  '男人',
  '女人',
  '男孩',
  '女孩',
  '孩子',
  '儿子',
  '女儿',
  '哥哥',
  '弟弟',
  '丈夫',
  '妻子',
  '爸爸',
  '妈妈',
  '父亲',
  '母亲',
  '爷爷',
  '老妇人',
  '少妇',
  '机器人',
  '外星人'
];
const COMMON_SURNAME =
  '[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛范彭郎鲁韦昌马苗凤花方俞任袁柳唐罗薛伍余米贝姚孟顾尹江钟蔡田樊胡凌霍万柯卢莫邓程崔龚]';

const normalizeText = input => {
  let value = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[？?！!。，、；;：:“”"'（）()[\]【】《》〈〉\s]/g, '');
  SYNONYMS.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement);
  });
  return value;
};

export const normalizeQuestion = input =>
  normalizeText(input).replace(/[吗呢吧呀啊嘛]+$/g, '');

const normalizeMeaning = input => {
  let value = normalizeQuestion(input);
  QUESTION_FILLERS.forEach(filler => {
    value = value.replaceAll(filler, '');
  });
  return value
    .replace(/是一(?:只|个|名|错)?(?=[\u4e00-\u9fff]{1,4}$)/g, '是')
    .replace(/是(?=被|从)/g, '')
    .replace(/^(我|他|她|它|我们|他们|她们|那|所以)+/g, '');
};

const ngrams = (value, size) => {
  if (!value) return new Set();
  if (value.length <= size) return new Set([value]);
  const result = new Set();
  for (let index = 0; index <= value.length - size; index += 1) {
    result.add(value.slice(index, index + size));
  }
  return result;
};

const diceSimilarity = (left, right, size = 2) => {
  const leftSet = ngrams(normalizeMeaning(left), size);
  const rightSet = ngrams(normalizeMeaning(right), size);
  if (leftSet.size === 0 || rightSet.size === 0) return 0;
  let overlap = 0;
  leftSet.forEach(value => {
    if (rightSet.has(value)) overlap += 1;
  });
  return 2 * overlap / (leftSet.size + rightSet.size);
};

const editSimilarity = (left, right) => {
  const source = normalizeMeaning(left);
  const target = normalizeMeaning(right);
  if (!source || !target) return 0;
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const current = [sourceIndex];
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      current[targetIndex] = Math.min(
        current[targetIndex - 1] + 1,
        previous[targetIndex] + 1,
        previous[targetIndex - 1] +
          (source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return 1 - previous[target.length] / Math.max(source.length, target.length);
};

const textSimilarity = (left, right) =>
  Math.max(
    diceSimilarity(left, right, 2) * 0.72 + diceSimilarity(left, right, 3) * 0.28,
    editSimilarity(left, right) * 0.94
  );

const hashText = input => {
  let hash = 2166136261;
  for (const character of String(input)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const pickStable = (values, seed) => values[hashText(seed) % values.length];

const stripVerdictPrefix = text =>
  String(text || '').replace(/^(是|对|没错|不是|不对|没有|无关|并非如此)[。！!，,\s]*/, '');

const getAnswerPrefix = (verdict, question, seed) => {
  const normalized = normalizeQuestion(question);
  if (!verdict) return '';
  const negativeWording = /(?:不是|并非|没有|没在|未曾|不曾|不会|不能|不可能|没(?=从|去|来|进|出|被|把|做|吃|杀|偷|看|听|说|拿|带))/.test(
    String(question || '').replace(/有没有|是否有|是不是|是否是/g, '')
  );
  if (verdict === 'yes') {
    if (negativeWording) return '是。';
    if (/有|存在|发生/.test(normalized)) return '有。';
    if (/是|属于|来自|在/.test(normalized)) return '是。';
    return pickStable(YES_PREFIXES, seed);
  }
  if (verdict === 'no') {
    if (negativeWording) return '不是。';
    if (/有|存在|发生/.test(normalized)) return '没有。';
    if (/是|属于|来自|在/.test(normalized)) return '不是。';
    return pickStable(NO_PREFIXES, seed);
  }
  return pickStable(IRRELEVANT_PREFIXES, seed);
};

const invertVerdict = verdict => {
  if (verdict === 'yes') return 'no';
  if (verdict === 'no') return 'yes';
  return verdict;
};

const isNegatedQuestion = question => {
  const value = String(question || '')
    .replace(/有没有|是否有|是不是|是否是/g, '')
    .replace(/[？?！!。，、；;：:“”"'（）()\s]/g, '');
  return /(?:不是|并非|没有|没在|未曾|不曾|不会|不能|不可能|没(?=从|去|来|进|出|被|把|做|吃|杀|偷|看|听|说|拿|带))/.test(value);
};

const neutralizePolarity = question => String(question || '')
  .replace(/不是|并非|不为/g, '是')
  .replace(/没有被|没被/g, '被')
  .replace(/没有从|没从/g, '从')
  .replace(/没有|没在|未在/g, '有')
  .replace(/没(?=从|去|来|进|出|被|把|做|吃|杀|偷|看|听|说|拿|带)/g, '')
  .replace(/不会|不能|不可能/g, '会');

const getEntityRecords = soup => (soup.entities || []).map(entity => {
  if (typeof entity === 'string') return { name: entity, aliases: [entity] };
  return {
    name: entity.name,
    aliases: [entity.name, ...(entity.aliases || [])]
  };
});

const extractEntities = (text, soup) => {
  const normalized = normalizeQuestion(text);
  return getEntityRecords(soup).filter(entity =>
    entity.aliases.some(alias => normalized.includes(normalizeQuestion(alias)))
  );
};

const nodeSearchRecords = (node, soup) => {
  const factTexts = (node.reveals || []).map(factId =>
    soup.facts.find(fact => fact.id === factId)?.text || ''
  );
  return [
    {
      text: node.question,
      verdict: node.verdict,
      reply: node.reply,
      polarityLocked: false
    },
    ...(node.patterns || []).map(pattern => typeof pattern === 'string'
      ? {
          text: pattern,
          verdict: node.verdict,
          reply: node.reply,
          polarityLocked: false
        }
      : {
          text: pattern.text,
          verdict: pattern.verdict,
          reply: pattern.reply || node.reply,
          polarityLocked: true
        }
    ),
    ...(node.aliases || []).map(alias => typeof alias === 'string'
      ? {
          text: alias,
          verdict: node.verdict,
          reply: node.reply,
          polarityLocked: false
        }
      : {
          text: alias.text,
          verdict: alias.verdict,
          reply: alias.reply || node.reply,
          polarityLocked: true
        }
    ),
    ...(node.topics || []).map(text => ({
      text,
      verdict: node.verdict,
      reply: node.reply,
      polarityLocked: false
    })),
    {
      text: stripVerdictPrefix(node.reply),
      verdict: 'yes',
      reply: node.reply,
      polarityLocked: true
    },
    ...factTexts.map(text => ({
      text,
      verdict: 'yes',
      reply: text,
      polarityLocked: true
    }))
  ].filter(record => record.text);
};

const keywordWeight = keyword => Math.max(1, normalizeMeaning(keyword).length);

const scoreNode = (question, node, soup, lastNodeId) => {
  const matchingQuestion = neutralizePolarity(question);
  const normalized = normalizeQuestion(matchingQuestion);
  const meaning = normalizeMeaning(matchingQuestion);
  const records = nodeSearchRecords(node, soup);
  const texts = records.map(record => record.text);
  const normalizedTexts = texts.map(normalizeQuestion);
  const meaningTexts = texts.map(normalizeMeaning);
  const exact = normalizedTexts.some(text => text && text === normalized) ? 1 : 0;
  const containment = meaningTexts.reduce((best, text) => {
    if (!meaning || !text || Math.min(meaning.length, text.length) < 4) return best;
    if (!meaning.includes(text) && !text.includes(meaning)) return best;
    const ratio = Math.min(meaning.length, text.length) / Math.max(meaning.length, text.length);
    return Math.max(best, 0.72 + ratio * 0.22);
  }, 0);
  const similarity = texts.reduce(
    (best, text) => Math.max(best, textSimilarity(matchingQuestion, text)),
    0
  );
  const keywords = [...(node.keywords || []), ...(node.topics || [])];
  const matchedKeywords = keywords.filter(keyword =>
    meaning.includes(normalizeMeaning(keyword))
  );
  const totalKeywordWeight = keywords
    .map(keywordWeight)
    .sort((left, right) => right - left)
    .slice(0, 3)
    .reduce((sum, weight) => sum + weight, 0);
  const matchedKeywordWeight = matchedKeywords
    .map(keywordWeight)
    .sort((left, right) => right - left)
    .slice(0, 3)
    .reduce((sum, weight) => sum + weight, 0);
  const keywordCoverage = totalKeywordWeight
    ? Math.min(1, matchedKeywordWeight / totalKeywordWeight)
    : 0;
  const longestKeyword = matchedKeywords.reduce(
    (length, keyword) => Math.max(length, normalizeMeaning(keyword).length),
    0
  );
  const keywordFocus = meaning
    ? Math.min(1, longestKeyword / Math.max(2, meaning.length) * 1.5)
    : 0;
  const queryEntities = extractEntities(question, soup);
  const nodeEntityNames = extractEntities(texts.join(''), soup).map(entity => entity.name);
  const entityOverlap = queryEntities.length
    ? queryEntities.filter(entity => nodeEntityNames.includes(entity.name)).length / queryEntities.length
    : 0;
  const lexical = similarity * 0.42 +
    Math.max(keywordCoverage, keywordFocus) * 0.43 +
    entityOverlap * 0.15;
  const contextBoost = node.id === lastNodeId && meaning.length <= 6 ? 0.12 : 0;
  const semanticMatches = records.map(record => ({
    ...record,
    score: Math.max(
      normalizeQuestion(record.text) === normalized ? 1 : 0,
      textSimilarity(matchingQuestion, record.text)
    )
  })).sort((left, right) => right.score - left.score);
  const semanticMatch = semanticMatches[0];
  const useSemanticPolarity = semanticMatch && semanticMatch.score >= 0.54;
  return {
    score: Math.min(1, Math.max(
      exact,
      containment,
      semanticMatch.score * 0.82,
      lexical + contextBoost
    )),
    verdict: useSemanticPolarity ? semanticMatch.verdict : node.verdict,
    reply: useSemanticPolarity ? semanticMatch.reply : node.reply,
    polarityLocked: useSemanticPolarity ? semanticMatch.polarityLocked : false
  };
};

const createSearchNodes = soup => {
  const nodes = [...soup.questionNodes];
  const linkedFacts = new Set(nodes.flatMap(node => node.reveals || []));
  soup.facts
    .filter(fact => !linkedFacts.has(fact.id))
    .forEach(fact => {
      nodes.push({
        id: `fact-${fact.id}`,
        question: fact.text,
        verdict: 'yes',
        reply: fact.text,
        reveals: [fact.id],
        patterns: [fact.text],
        keywords: []
      });
    });
  (soup.decoyStatements || []).forEach(statement => {
    nodes.push({
      id: `decoy-${statement.id}`,
      question: statement.question || statement.text,
      verdict: 'no',
      reply: statement.reply || `${statement.text}并不是真相。`,
      reveals: [],
      patterns: [statement.text, ...(statement.patterns || [])],
      keywords: statement.keywords || []
    });
  });
  return nodes;
};

const rankQuestionNodes = (question, soup, lastNodeId) =>
  createSearchNodes(soup)
    .map(node => ({ node, ...scoreNode(question, node, soup, lastNodeId) }))
    .sort((left, right) => right.score - left.score);

const splitQuestion = question => String(question || '')
  .split(/并且|而且|同时(?!间)|还是|或者|以及|但是|随后|接着|但|[。.;；？！!?]/)
  .map(part => part.trim())
  .filter(Boolean);

const isContextFragment = (input, soup) => {
  const value = normalizeMeaning(input);
  const isEntity = getEntityRecords(soup).some(entity =>
    entity.aliases.some(alias => normalizeMeaning(alias) === value)
  );
  return !value ||
    isEntity ||
    /^(?:男人|女人|店员|他|她|它|这个|那个|这里|那里|重要|相关)$/.test(value) ||
    /^(?:在.*(?:里|内|外|中|上|下|旁|附近)|为什么|怎么|如何)$/.test(value);
};

const hasMultipleHypotheses = (question, soup) => {
  const clauses = splitQuestion(question);
  if (
    /并且|而且|同时(?!间)|或者|以及/.test(question) &&
    clauses.filter(part => normalizeMeaning(part).length >= 2).length >= 2
  ) {
    return true;
  }
  const commaClauses = String(question).split(/[，,]/).map(part => part.trim()).filter(Boolean);
  const meaningfulCommaClauses = commaClauses.filter(part =>
    normalizeMeaning(part).length >= 2
  );
  if (
    meaningfulCommaClauses.length >= 2 &&
    meaningfulCommaClauses.slice(1).some(part => /也|是|有|在|杀|偷|死/.test(part))
  ) {
    return true;
  }
  if (clauses.length < 2) return false;
  const meaningful = clauses.filter(part => !isContextFragment(part, soup));
  if (meaningful.length < 2) return false;
  const matched = meaningful.filter(part =>
    rankQuestionNodes(part, soup, null)[0]?.score >= 0.48
  );
  const hypothetical = meaningful.filter(part =>
    /(?:没有|不是|不在|偷|用过|来自|进入|进来|进店|认识|参与|淋湿|弄湿|丢|少|(?:是|有)(?!可能).{2,})/.test(part)
  );
  return matched.length >= 2 || hypothetical.length >= 2;
};

const getNodeById = (soup, nodeId) =>
  createSearchNodes(soup).find(node => node.id === nodeId) || null;

const getExactMatch = (question, soup) => {
  const normalized = normalizeQuestion(question);
  for (const node of createSearchNodes(soup)) {
    const record = nodeSearchRecords(node, soup).find(item =>
      normalizeQuestion(item.text) === normalized
    );
    if (record) return { node, ...record };
  }
  return null;
};

const getFramedMatch = (question, soup) => {
  const normalized = normalizeMeaning(
    neutralizePolarity(normalizeSentenceFrame(question))
  );
  if (normalized.length < 2) return null;
  for (const node of createSearchNodes(soup)) {
    const record = nodeSearchRecords(node, soup).find(item =>
      normalizeMeaning(
        neutralizePolarity(normalizeSentenceFrame(item.text))
      ) === normalized
    );
    if (record) return { node, ...record };
  }
  return null;
};

const getTopicWords = soup => [
  ...getEntityRecords(soup).flatMap(entity => entity.aliases),
  ...(soup.questionNodes || []).flatMap(node => [
    ...(node.keywords || []),
    ...(node.topics || [])
  ])
].map(normalizeMeaning).filter(word =>
  word.length >= 2 && !GENERIC_TOPIC_WORDS.has(word)
);

const getKnownConceptTerms = soup => [
  ...getTopicWords(soup),
  ...getEntityRecords(soup).flatMap(entity => entity.aliases.map(normalizeMeaning)),
  ...createSearchNodes(soup).flatMap(node =>
    nodeSearchRecords(node, soup).map(record => normalizeMeaning(record.text))
  )
].filter(Boolean);

const questionTouchesSoup = (question, soup) => {
  const meaning = normalizeMeaning(question);
  if (getTopicWords(soup).some(word => meaning.includes(word))) return true;
  return Math.max(
    textSimilarity(question, soup.surface),
    ...soup.facts.map(fact => textSimilarity(question, fact.text))
  ) >= 0.34;
};

const questionHasForeignAnchor = (question, soup, catalog) => {
  if (!catalog || catalog.length <= 1) return false;
  const meaning = normalizeMeaning(question);
  const currentTerms = new Set(getTopicWords(soup));
  return catalog
    .filter(item => item.id !== soup.id)
    .flatMap(getTopicWords)
    .filter(term => !currentTerms.has(term))
    .some(term => meaning.includes(term));
};

const questionHasMissingRole = (question, soup) => {
  const normalized = normalizeQuestion(question);
  const currentAliases = new Set(
    getEntityRecords(soup).flatMap(entity => entity.aliases.map(normalizeQuestion))
  );
  return ROLE_WORDS.some(role =>
    normalized.includes(role) && !currentAliases.has(normalizeQuestion(role))
  );
};

const normalizeSentenceFrame = question => normalizeQuestion(question)
  .replace(/^(麻烦问一下|请教一下|劳驾问下|想请问|请问一下|请问|我想问一下|我想问|想知道)/, '')
  .replace(/^是(?=.+(?:是|有|在|来自|属于|会|杀|偷|吃|搬|逃|死|被|绑|成为|表演|送))/, '');

const questionHasUnknownSubject = (question, soup) => {
  const normalized = neutralizePolarity(normalizeSentenceFrame(question))
    .replace(/^(难道|所以|那么)+/, '');
  const match = normalized.match(/^(.{1,10}?)(?:是|会|在|有|来自|杀|偷|吃|看见|知道)/);
  if (!match) return false;
  const subject = match[1].replace(/的/g, '');
  const subjectParts = subject.split(/[和与及、]/).filter(Boolean);
  const entities = getEntityRecords(soup);
  const knownTerms = getKnownConceptTerms(soup);
  return subjectParts.some(part => {
    if (/^(我|他|她|它|我们|他们|她们|主角|叙述者|这个人|那个人|这里|那里|有人|谁|三个人|一家人)$/.test(part)) {
      return false;
    }
    const knownEntity = entities.some(entity => entity.aliases.some(alias => {
      const normalizedAlias = normalizeQuestion(alias);
      return part === normalizedAlias || normalizedAlias === part;
    }));
    const knownPhrase = part.length >= 2 && knownTerms.some(term => term.includes(part));
    return !knownEntity && !knownPhrase;
  });
};

const questionHasUnknownIdentityObject = (question, soup) => {
  const normalized = neutralizePolarity(normalizeSentenceFrame(question));
  const match = normalized.match(/^.{1,12}?(?:不是|是|属于|算不算|算是)(.+)$/);
  if (!match) return false;
  const object = normalizeMeaning(match[1]);
  const knownTerms = getKnownConceptTerms(soup)
    .map(term => term.replace(/^(并不)?是/, ''))
    .filter(Boolean);
  const directlyKnown = knownTerms.some(term => {
    if (object === term) return true;
    if (object.length >= 4 && term.includes(object)) return true;
    const similarity = editSimilarity(object, term);
    return similarity >= 0.75;
  });
  if (directlyKnown) return false;
  let residue = object.replace(/[的地得写做成变]/g, '');
  [...new Set(knownTerms)]
    .sort((left, right) => right.length - left.length)
    .forEach(term => {
      if (term.length >= 2) residue = residue.replaceAll(term, '');
    });
  return residue.length > 0;
};

const questionHasUnknownPersonName = (question, soup) => {
  const pattern = new RegExp(
    `(?:看|杀|偷|找|认识|偷窥|救|骗|问|跟|和|与)(${COMMON_SURNAME}[\\u4e00-\\u9fff]{1,2})`,
    'g'
  );
  const currentTerms = new Set(getKnownConceptTerms(soup));
  return [...String(question || '').matchAll(pattern)].some(match =>
    ![...currentTerms].some(term => term.includes(match[1]) || match[1].includes(term))
  );
};

const questionHasUnknownActionObject = (question, soup) => {
  const normalized = neutralizePolarity(normalizeSentenceFrame(question));
  const match = normalized.match(
    /(?:杀死|杀了|杀害|偷走|偷了|吃掉|吃了|牺牲|囚禁|袭击|偷窥|欺骗|骗了|救下|救了)(.+)$/
  );
  if (!match) return false;
  const object = normalizeMeaning(match[1]).replace(/^(了|过|掉|下)+/, '');
  const knownTerms = getKnownConceptTerms(soup);
  return object.split(/[和与及、]/).filter(Boolean).some(part => {
    if (/^(自己|我|他|她|它|我们|他们|她们|所有人|大家|朋友|家人|尸体)$/.test(part)) {
      return false;
    }
    return !knownTerms.some(term =>
      part === term ||
      part.includes(term) ||
      term.includes(part) ||
      editSimilarity(part, term) >= 0.75
    );
  });
};

const questionHasUnknownAttribute = (question, soup) => {
  const normalized = neutralizePolarity(normalizeSentenceFrame(question));
  const match = normalized.match(/^(.{1,10}?)(?:有|会)(.+)$/);
  if (!match) return false;
  const attribute = normalizeMeaning(match[2]);
  const knownTerms = getKnownConceptTerms(soup);
  return !knownTerms.some(term =>
    attribute === term ||
    (
      attribute.length >= 2 &&
      (attribute.includes(term) || term.includes(attribute))
    ) ||
    editSimilarity(attribute, term) >= 0.75
  );
};

const getNextQuestion = (soup, revealedFactIds, askedIds) =>
  getAvailableQuestionNodes(soup, revealedFactIds).find(node =>
    !askedIds.includes(node.id)
  ) || null;

const matchConversationIntent = (question, soup, options) => {
  const normalized = normalizeSentenceFrame(question);
  const lastNode = getNodeById(soup, options.lastNodeId);
  if (/^(你好|嗨|哈喽|在吗|主持人好)$/.test(normalized)) {
    return {
      type: 'conversation',
      reply: '我在。你可以围绕人物、地点、时间、动机或异常细节，问一个能用“是”或“不是”回答的问题。'
    };
  }
  if (
    /^(你|你本人|主持人)/.test(normalized) ||
    /(你说的话|你的回答|主持人说的话|主持人的回答)/.test(normalized)
  ) {
    return {
      type: 'conversation',
      reply: '我是这局海龟汤的规则主持人，不是故事中的角色。我只根据题目事实回答。'
    };
  }
  if (/^(谢谢|谢了|明白了|懂了|好的|好)$/.test(normalized)) {
    return {
      type: 'conversation',
      reply: '继续吧。把已经确认的事实连起来，真相就快出来了。'
    };
  }
  if (/^(那)?(他|她|它|这个|那个)$/.test(normalized)) {
    return {
      type: 'conversation',
      reply: lastNode
        ? '你想继续问哪一方面？可以具体问这个对象的身份、地点、行为、动机，或者这条线索是否重要。'
        : '你指的是谁，以及想确认什么行为？把问题说完整一点。'
    };
  }
  if (/^(怎么玩|规则|游戏规则|怎么提问|我该怎么问)$/.test(normalized)) {
    return {
      type: 'conversation',
      reply: '一次提出一个可以用“是”或“不是”判断的假设。我会回答并记录事实，找齐核心线索后就能还原真相。'
    };
  }
  if (/^(接下来|接下来问什么|然后呢|给点方向|给个方向)$/.test(normalized)) {
    const nextNode = getNextQuestion(soup, options.revealedFactIds, options.askedIds);
    return {
      type: 'conversation',
      reply: nextNode
        ? `可以继续调查这个方向：“${nextNode.question}”`
        : '你掌握的事实已经足够多了，试着还原完整的因果链。'
    };
  }
  if (/^(?:我)?(?:完全)?(?:猜错了?|不知道了?|不会了?|没思路了?|想不到了?|放弃了?|卡住了?)(?:怎么办)?$/.test(normalized)) {
    const nextNode = getNextQuestion(soup, options.revealedFactIds, options.askedIds);
    return {
      type: 'conversation',
      reply: nextNode
        ? `没关系，先缩小范围。你可以试着问：“${nextNode.question}”`
        : '你已经掌握了主要线索，先把已确认事实按时间和因果顺序连起来。'
    };
  }
  if (/^(为什么|为什么呢|怎么说|什么意思|这是什么意思)$/.test(normalized)) {
    return {
      type: 'conversation',
      reply: lastNode
        ? `因为${stripVerdictPrefix(lastNode.reply)}`
        : '你需要先告诉我具体在问哪条线索。'
    };
  }
  if (/^(这个重要|这重要|这条线索重要|这个相关|这相关)$/.test(normalized)) {
    if (!lastNode) {
      return {
        type: 'conversation',
        reply: '你指的是哪条线索？把对象或事件说具体一点。'
      };
    }
    const relevant = (lastNode.reveals || []).length > 0;
    return {
      type: 'conversation',
      verdict: relevant ? 'yes' : 'irrelevant',
      reply: relevant
        ? `是，这条线索值得保留。${stripVerdictPrefix(lastNode.reply)}`
        : '这条信息不影响核心因果链。'
    };
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
  const baseVerdict = Object.prototype.hasOwnProperty.call(options, 'verdict')
    ? options.verdict
    : node.verdict;
  const negated = !options.polarityLocked && isNegatedQuestion(question);
  const verdict = negated ? invertVerdict(baseVerdict) : baseVerdict;
  const prefix = getAnswerPrefix(
    verdict,
    question,
    `${question}:${node.id}:${options.turn || 0}`
  );
  const explanation = stripVerdictPrefix(options.reply || node.reply);
  const repeated = (options.askedIds || []).includes(node.id);
  return {
    verdict,
    reply: `${repeated ? '这个问题刚才已经确认过了。' : ''}${prefix}${explanation}`,
    repeated
  };
};

export const matchQuestion = (question, soup, options = {}) => {
  const context = {
    askedIds: options.askedIds || [],
    revealedFactIds: options.revealedFactIds || [],
    lastNodeId: options.lastNodeId || null,
    catalog: options.catalog || [soup],
    turn: options.turn || 0
  };
  const normalized = normalizeQuestion(question);
  if (normalized.length < 2) {
    return {
      type: 'invalid',
      reply: '这个问题太短了。把人物、地点或行为说具体一点，我才能判断。'
    };
  }

  const conversation = matchConversationIntent(question, soup, context);
  if (conversation) return conversation;

  const exactMatch = getExactMatch(question, soup);
  if (exactMatch) {
    const response = answerQuestionNode(exactMatch.node, question, {
      ...context,
      verdict: exactMatch.verdict,
      reply: exactMatch.reply,
      polarityLocked: exactMatch.polarityLocked
    });
    return {
      type: 'answer',
      node: exactMatch.node,
      verdict: response.verdict,
      reply: response.reply,
      repeated: response.repeated,
      confidence: 1
    };
  }

  const framedMatch = getFramedMatch(question, soup);
  if (framedMatch) {
    const response = answerQuestionNode(framedMatch.node, question, {
      ...context,
      verdict: framedMatch.verdict,
      reply: framedMatch.reply,
      polarityLocked: framedMatch.polarityLocked
    });
    return {
      type: 'answer',
      node: framedMatch.node,
      verdict: response.verdict,
      reply: response.reply,
      repeated: response.repeated,
      confidence: 0.98
    };
  }

  if (
    !context.lastNodeId &&
    /^(他|她|它|他们|她们|它们)(?:是|有|在|会|被|把|从|已经|后来|最后)/.test(normalized)
  ) {
    return {
      type: 'clarify',
      reply: '这里的指代还不明确。请直接说出人物或对象，再说明你想确认的事情。'
    };
  }

  if (hasMultipleHypotheses(question, soup)) {
    return {
      type: 'invalid',
      reply: '你一次问了不止一件事，我没法只回答一个“是”或“不是”。请拆开来问。'
    };
  }

  if (/(告诉|公布|直接看|揭晓).*(答案|汤底|真相)/.test(question)) {
    return {
      type: 'conversation',
      reply: '现在揭晓就不好玩了。你可以继续调查，也可以使用页面底部的“直接查看最终故事”。'
    };
  }

  if (/(为什么|为何|怎么会|什么原因|原因是什么)/.test(question)) {
    const example = soup.questionNodes.find(node =>
      node.verdict === 'yes' || node.verdict === 'no'
    )?.question;
    return {
      type: 'invalid',
      reply: `我只能回答“是”“不是”或“无关”。把原因拆成一个具体假设再问${example ? `，例如“${example}”` : ''}。`
    };
  }

  const clauses = splitQuestion(question);
  const variants = [question, ...clauses];
  const lastNode = getNodeById(soup, context.lastNodeId);
  if (lastNode && normalized.length <= 8) {
    variants.push(`${lastNode.question}${question}`);
  }
  const ranked = createSearchNodes(soup)
    .map(node => {
      const scores = variants
        .map(variant => scoreNode(variant, node, soup, context.lastNodeId))
        .sort((left, right) => right.score - left.score);
      return { node, ...scores[0] };
    })
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const second = ranked[1];
  const margin = best ? best.score - (second?.score || 0) : 0;
  const highlySpecific = best && (
    best.score >= 0.86 ||
    (best.score >= 0.7 && margin >= 0.2) ||
    (best.score >= 0.52 && margin >= 0.08)
  );
  const structurallyCompatible =
    !questionHasMissingRole(question, soup) &&
    !questionHasUnknownSubject(question, soup) &&
    !questionHasUnknownIdentityObject(question, soup) &&
    !questionHasUnknownPersonName(question, soup) &&
    !questionHasUnknownActionObject(question, soup) &&
    !questionHasUnknownAttribute(question, soup);
  const domainRelevant =
    structurallyCompatible &&
    !questionHasForeignAnchor(question, soup, context.catalog) &&
    (questionTouchesSoup(question, soup) || highlySpecific) &&
    Boolean(best);

  if (
    best &&
    !best.node.strict &&
    domainRelevant &&
    (
      (best.score >= 0.52 && margin >= 0.055) ||
      best.score >= 0.86
    )
  ) {
    const response = answerQuestionNode(best.node, question, {
      ...context,
      verdict: best.verdict,
      reply: best.reply,
      polarityLocked: best.polarityLocked
    });
    return {
      type: 'answer',
      node: best.node,
      verdict: response.verdict,
      reply: response.reply,
      repeated: response.repeated,
      confidence: best.score
    };
  }

  if (best && domainRelevant && best.score >= 0.27) {
    return {
      type: 'clarify',
      reply: '我大概明白你的方向，但还不能确定你具体在问哪一件事。请补充明确的人物、行为或时间点。'
    };
  }

  if (!domainRelevant) {
    if (best && best.score >= 0.35) {
      return {
        type: 'clarify',
        reply: '这个说法和某条线索有些接近，但我不能确定你表达的是同一个意思。请换一种更具体的说法。'
      };
    }
    const mentionedEntities = extractEntities(question, soup);
    if (mentionedEntities.length > 0) {
      return {
        type: 'clarify',
        reply: `我知道你在问${mentionedEntities.map(entity => entity.name).join('、')}，但还不清楚你要确认的具体行为。请把假设说完整一点。`
      };
    }
    return {
      type: 'irrelevant',
      verdict: 'irrelevant',
      reply: pickStable([
        '这和事件的核心真相没有关系。换个方向问问人物、地点、时间或异常痕迹。',
        '这条线索可以排除，不会影响真相。试着关注汤面中反常的细节。',
        '无关。主持人建议你回到事件发生的地点、人物行为和时间顺序。'
      ], `${question}:${context.turn}`)
    };
  }

  return {
    type: 'invalid',
    reply: `这个问法还不能明确判断。请把它改成一个单独的假设，例如“${soup.questionNodes[0].question}”`
  };
};

export const checkReconstruction = (soup, selectedNodeIds) => {
  const expected = new Set(soup.solutionFactIds);
  const selected = new Set(selectedNodeIds);
  return expected.size === selected.size &&
    [...expected].every(factId => selected.has(factId));
};
