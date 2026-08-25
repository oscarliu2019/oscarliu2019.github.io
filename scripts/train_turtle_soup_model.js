const fs = require('fs');
const path = require('path');
const Module = require('module');
const babel = require('@babel/core');
const tyccl = require('node-tyccl');

const root = path.resolve(__dirname, '..');
const dataFile = path.join(root, 'src/data/turtleSoups.js');
const outputFile = path.join(root, 'src/data/turtleSoupModel.json');
const featuresFile = path.join(root, 'src/components/turtleSoupFeatures.js');
const trainingPhrasesFile = path.join(
  root,
  'src/data/turtleSoupTrainingPhrases.js'
);
const dimension = 4096;
const synonymGroups = [
  ['死亡', '死了', '去世', '没命', '丧命'],
  ['杀死', '杀害', '害死', '弄死'],
  ['凶手', '犯人', '杀人者'],
  ['妻子', '老婆', '夫人'],
  ['丈夫', '老公', '先生'],
  ['孩子', '小孩', '男孩'],
  ['母亲', '妈妈'],
  ['父亲', '爸爸'],
  ['知道', '发现', '察觉'],
  ['地府', '阴间', '死后世界'],
  ['绑架', '绑走', '拐走', '抓走'],
  ['真的', '其实', '实际'],
  ['有关', '相关', '有关系'],
  ['精神病院', '病院', '精神医疗机构'],
  ['风干', '晒干', '脱水晾干'],
  ['蚊子', '蚊虫', '吸血虫'],
  ['老鼠', '耗子', '鼠类'],
  ['偷窥', '监视', '偷看', '窥视', '盯着'],
  ['安全感', '安心感', '安心'],
  ['盲人', '失明', '双眼失明', '看不见'],
  ['故意', '有意', '刻意', '蓄意'],
  ['尖锐物体', '利器', '尖物'],
  ['小偷', '盗贼', '窃贼', '入室盗贼'],
  ['杀死', '灭口', '夺命', '取性命'],
  ['求救', '求援', '呼救', '发出警告'],
  ['地府', '冥界', '阴间', '死后世界'],
  ['题材', '素材', '创作灵感'],
  ['幻觉', '幻象', '幻境', '虚假景象'],
  ['世界', '时空', '空间'],
  ['棺材', '棺木', '棺椁', '木棺'],
  ['死亡', '断气', '遇难', '丧命'],
  ['宿舍', '寝室'],
  ['囚禁', '拘禁', '关押'],
  ['胎儿', '未出生的孩子', '腹中孩子'],
  ['第二人格', '副人格', '另一个意识'],
  ['牺牲', '献出生命', '舍命']
];
const genericUnknown = [
  '今天天气好吗',
  '你喜欢吃什么',
  '这是外星人干的吗',
  '有人会魔法吗',
  '故事发生在月球吗',
  '有人来自火星吗',
  '主角来自外星球吗',
  '故事里有外星人吗',
  '主角会开宇宙飞船吗',
  '这和股票有关吗',
  '他们吃的是披萨吗',
  '我不知道该问什么',
  '这个故事好玩吗',
  '你能唱歌吗',
  '答案是随机的吗',
  '这里有机器人吗',
  '主角认识柯南吗',
  '有人穿越到恐龙时代吗',
  '今天星期几',
  '故事中有一只猫吗',
  '男人会飞吗',
  '他们在北京吗',
  '主角中了彩票吗',
  '女人爱吃苹果吗',
  '这里发生过地震吗',
  '凶手用的是手枪吗',
  '有人开着飞机吗',
  '故事发生在古代吗',
  '主角会游泳吗',
  '他们正在做梦吗',
  '有人养了一条狗吗',
  '主角会说外语吗',
  '这里发生过战争吗',
  '他们乘坐宇宙飞船吗',
  '凶手使用炸弹了吗',
  '故事和考试有关吗',
  '有人住在海底吗',
  '主角获得超能力了吗',
  '主角是警察吗',
  '主角是律师吗',
  '主角是医生吗',
  '主角是明星吗',
  '主角是富豪吗',
  '故事里有一匹马会说话吗',
  '那匹马能开口讲话吗',
  '有人用弓箭吗',
  '有人使用激光武器吗',
  '男人中彩票了吗',
  '他们养鹦鹉吗',
  '主角会隐身吗',
  '故事里有龙吗',
  '这里出现怪兽了吗',
  '有人拥有读心术吗',
  '主角来自未来城市吗',
  '他们在参加考试吗',
  '故事发生在美国吗',
  '有人正在看电影吗',
  '主角养宠物了吗'
];
const synonymCache = new Map();

const loadModule = file => {
  const code = babel.transformFileSync(file, {
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code;
  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(path.dirname(file));
  loaded._compile(code, file);
  return loaded.exports;
};

const {
  createQuestionVocabulary,
  normalizeQuestion: normalize,
  vectorizeQuestion
} = loadModule(featuresFile);
const { TURTLE_SOUP_TRAINING_PHRASES } = loadModule(trainingPhrasesFile);
let featureAliases = [];
let featureVocabulary = null;
const features = input =>
  vectorizeQuestion(
    input,
    dimension,
    featureAliases,
    featureVocabulary
  );

const augment = (text, soup) => {
  const variants = new Set([text]);
  const clean = String(text || '').replace(/[？?！!。]+$/g, '');
  variants.add(clean);
  ['请问', '我想问一下', '麻烦问一下', '想知道'].forEach(prefix => {
    variants.add(`${prefix}${clean}`);
  });
  ['吗', '嘛', '对吗', '是不是'].forEach(suffix => {
    variants.add(`${clean}${suffix}`);
  });
  synonymGroups.forEach(group => {
    group.forEach(source => {
      if (!clean.includes(source)) return;
      group.filter(target => target !== source).forEach(target => {
        variants.add(clean.replaceAll(source, target));
      });
    });
  });
  (soup.entities || []).forEach(entity => {
    const aliases = typeof entity === 'string'
      ? [entity]
      : [entity.name, ...(entity.aliases || [])];
    aliases.forEach(source => {
      if (!clean.includes(source)) return;
      aliases.filter(target => target !== source).forEach(target => {
        variants.add(clean.replaceAll(source, target));
      });
    });
  });
  const vocabulary = [
    ...(soup.entities || []).flatMap(entity => typeof entity === 'string'
      ? [entity]
      : [entity.name, ...(entity.aliases || [])]
    ),
    ...(soup.questionNodes || []).flatMap(node => node.keywords || [])
  ];
  vocabulary
    .filter(word => word.length >= 2 && clean.includes(word))
    .forEach(word => {
      if (!synonymCache.has(word)) {
        synonymCache.set(
          word,
          tyccl.getSynonym(word).filter(item => item.length >= 2).slice(0, 8)
        );
      }
      synonymCache.get(word).forEach(synonym => {
        variants.add(clean.replaceAll(word, synonym));
      });
    });
  const normalized = normalize(clean);
  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized.length > 3) {
      variants.add(normalized.slice(0, index) + normalized.slice(index + 1));
      variants.add(normalized.slice(0, index) + '错' + normalized.slice(index + 1));
      if (index < normalized.length - 1) {
        variants.add(
          normalized.slice(0, index) +
          normalized[index + 1] +
          normalized[index] +
          normalized.slice(index + 2)
        );
      }
    }
  }
  return [...variants].filter(value => normalize(value).length >= 2);
};

const createRecords = soup => {
  const records = [];
  soup.questionNodes.forEach(node => {
    records.push({
      nodeId: node.id,
      verdict: node.verdict,
      text: node.question,
      polarityLocked: false
    });
    (node.patterns || []).forEach(pattern => {
      records.push({
        nodeId: node.id,
        verdict: typeof pattern === 'string' ? node.verdict : pattern.verdict,
        text: typeof pattern === 'string' ? pattern : pattern.text,
        polarityLocked: typeof pattern !== 'string'
      });
    });
    (TURTLE_SOUP_TRAINING_PHRASES[node.id] || []).forEach(text => {
      records.push({
        nodeId: node.id,
        verdict: node.verdict,
        text,
        polarityLocked: false
      });
    });
    const fact = soup.facts.find(item => (node.reveals || []).includes(item.id));
    if (fact) {
      records.push({
        nodeId: node.id,
        verdict: 'yes',
        text: fact.text,
        polarityLocked: true
      });
    }
  });
  (soup.decoyStatements || []).forEach(statement => {
    const nodeId = `decoy-${statement.id}`;
    records.push({ nodeId, verdict: 'no', text: statement.text, polarityLocked: true });
    (statement.patterns || []).forEach(text => {
      records.push({ nodeId, verdict: 'no', text, polarityLocked: true });
    });
  });
  return records.flatMap(record => {
    if (record.polarityLocked) return [record];
    const locked = { ...record, polarityLocked: true };
    if (/不是|并非|没有|不会|不能|不可能|并未|是否|是不是|有没有/.test(record.text)) {
      return [locked];
    }
    const replacements = [
      ['是', '不是'],
      ['有', '没有'],
      ['会', '不会']
    ];
    const replacement = replacements.find(([word]) =>
      record.text.includes(word)
    );
    if (!replacement) return [locked];
    return [
      locked,
      {
        ...record,
        text: record.text.replace(replacement[0], replacement[1]),
        verdict: record.verdict === 'yes' ? 'no' : 'yes',
        polarityLocked: true
      }
    ];
  });
};

const soups = loadModule(dataFile).TURTLE_SOUPS;
const aliasMap = new Map();
const addAlias = (alias, canonical) => {
  const source = normalize(alias);
  const target = normalize(canonical);
  if (source.length >= 2 && source !== target && !aliasMap.has(source)) {
    aliasMap.set(source, target);
  }
};
synonymGroups.forEach(group => {
  group.slice(1).forEach(alias => addAlias(alias, group[0]));
});
soups.forEach(soup => {
  (soup.entities || []).forEach(entity => {
    if (typeof entity !== 'string') {
      (entity.aliases || []).forEach(alias => addAlias(alias, entity.name));
    }
  });
  const vocabulary = [
    ...(soup.entities || []).map(entity =>
      typeof entity === 'string' ? entity : entity.name
    ),
    ...(soup.questionNodes || []).flatMap(node => node.keywords || [])
  ];
  vocabulary.forEach(word => {
    tyccl.getSynonym(word).slice(0, 20).forEach(alias => {
      addAlias(alias, word);
    });
  });
});
featureAliases = [...aliasMap.entries()].sort(
  (left, right) => right[0].length - left[0].length
);
const allRecords = new Map(soups.map(soup => [soup.id, createRecords(soup)]));
featureVocabulary = createQuestionVocabulary(
  [...allRecords.values()].flatMap(records =>
    records.map(record => record.text)
  ),
  featureAliases
);
const classes = new Map();

soups.forEach(soup => {
  allRecords.get(soup.id).forEach((record, recordIndex) => {
    const label = `${soup.id}::${record.nodeId}::${record.verdict}::${record.polarityLocked ? 1 : 0}::${recordIndex}`;
    classes.set(label, {
      soupId: soup.id,
      nodeId: record.nodeId,
      verdict: record.verdict,
      polarityLocked: record.polarityLocked,
      examples: new Set(augment(record.text, soup))
    });
  });
});

genericUnknown.forEach((text, index) => {
  classes.set(`__unknown__::${index}`, {
    soupId: null,
    nodeId: `__unknown__:generic:${index}`,
    verdict: 'irrelevant',
    polarityLocked: true,
    examples: new Set(augment(text, {}))
  });
});

const documents = [];
classes.forEach(entry => {
  entry.examples.forEach(text => documents.push(features(text)));
});
const documentFrequency = new Uint32Array(dimension);
documents.forEach(vector => {
  vector.forEach((_, index) => {
    documentFrequency[index] += 1;
  });
});
const idf = Array.from(documentFrequency, count =>
  count ? Math.log((documents.length + 1) / (count + 1)) + 1 : 0
);
const labels = [];
classes.forEach(entry => {
  const centroid = new Float64Array(dimension);
  entry.examples.forEach(text => {
    const weighted = [...features(text)].map(([index, value]) => [
      index,
      value * idf[index]
    ]);
    const documentNorm = Math.sqrt(
      weighted.reduce((sum, [, value]) => sum + value * value, 0)
    );
    weighted.forEach(([index, value]) => {
      centroid[index] += value / documentNorm;
    });
  });
  const norm = Math.sqrt(
    centroid.reduce((sum, value) => sum + value * value, 0)
  ) || 1;
  const weights = [];
  centroid.forEach((value, index) => {
    if (value) {
      weights.push([index, Number((value / norm).toFixed(6))]);
    }
  });
  weights.sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));
  labels.push({
    soupId: entry.soupId,
    nodeId: entry.nodeId,
    verdict: entry.verdict,
    polarityLocked: entry.polarityLocked,
    weights: weights.slice(0, 384)
  });
});

const model = {
  version: 4,
  dimension,
  aliases: featureAliases,
  vocabulary: [...featureVocabulary],
  idf: idf.map(value => Number(value.toFixed(5))),
  labels,
  threshold: 0.12,
  margin: 0,
  foreignTolerance: 0.04
};

fs.writeFileSync(outputFile, `${JSON.stringify(model)}\n`);
console.log(JSON.stringify({
  soups: soups.length,
  dimension,
  labels: model.labels.length,
  bytes: fs.statSync(outputFile).size
}, null, 2));
