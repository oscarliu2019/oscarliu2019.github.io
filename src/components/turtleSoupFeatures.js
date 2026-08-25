const SYNONYMS = [
  [/地板|地上/g, '地面'],
  [/厕所|卫生间|盥洗室/g, '洗手间'],
  [/嫌疑人|犯人|罪犯/g, '凶手'],
  [/刚刚|刚才/g, '刚'],
  [/店门外|店外|门外|正门外|门口/g, '外面'],
  [/雨水/g, '雨'],
  [/有没有|是否有/g, '有'],
  [/是不是|是否是/g, '是'],
  [/就是|正是/g, '是'],
  [/是就/g, '是'],
  [/为什么会/g, '为什么']
];

export const normalizeQuestion = input => {
  let value = String(input || '')
    .toLowerCase()
    .replace(/[？?！!。，、；;：:“”"'（）()[\]【】《》〈〉\s]/g, '')
    .replace(/^我有个疑问(.+?)对不对$/, '$1')
    .replace(/^按照这个故事(.+?)是真的吗$/, '$1')
    .replace(
      /^(我有个疑问|能告诉我|按照这个故事|麻烦问一下|我想问一下|想知道|请问)/,
      ''
    );

  SYNONYMS.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement);
  });

  return value
    .replace(/对不对$/g, '')
    .replace(/[吗呢吧呀啊嘛]+$/g, '');
};

export const hashQuestionFeature = value => {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });

const applyAliases = (input, aliases) => {
  let value = normalizeQuestion(input);
  aliases.forEach(([alias, canonical]) => {
    value = value.replaceAll(alias, canonical);
  });
  return value;
};

export const createQuestionVocabulary = (inputs, aliases) => {
  const vocabulary = new Set();
  inputs.forEach(input => {
    for (const part of segmenter.segment(applyAliases(input, aliases))) {
      if (part.isWordLike) vocabulary.add(part.segment);
    }
  });
  return vocabulary;
};

export const vectorizeQuestion = (
  input,
  dimension,
  aliases = [],
  vocabulary = null
) => {
  let value = applyAliases(input, aliases);
  if (vocabulary) {
    value = [...segmenter.segment(value)]
      .map(part =>
        part.isWordLike && !vocabulary.has(part.segment)
          ? '未知'
          : part.segment
      )
      .join('');
  }
  const counts = new Map();

  for (let size = 1; size <= 3; size += 1) {
    for (let index = 0; index <= value.length - size; index += 1) {
      const bucket =
        hashQuestionFeature(`${size}:${value.slice(index, index + size)}`) %
        dimension;
      counts.set(bucket, (counts.get(bucket) || 0) + 1);
    }
  }

  [
    ['death', /死|死亡|尸体|亡魂|活着/],
    ['kill', /杀|害死|凶手|犯人/],
    ['identity', /是|身份|其实|真正/],
    ['place', /哪里|地点|地府|医院|房间|井|山洞/],
    ['cause', /为什么|原因|导致|因为/],
    ['exist', /有|存在|出现/],
    ['time', /之前|之后|已经|后来|最后|当时/],
    ['unknown', /外星|火星|机器人|魔法|月球|恐龙|股票/]
  ].forEach(([name, pattern]) => {
    if (pattern.test(value)) {
      const bucket = hashQuestionFeature(`r:${name}`) % dimension;
      counts.set(bucket, (counts.get(bucket) || 0) + 2);
    }
  });

  const norm = Math.sqrt(
    [...counts.values()].reduce((sum, count) => sum + count * count, 0)
  ) || 1;

  return new Map(
    [...counts].map(([index, count]) => [index, count / norm])
  );
};
