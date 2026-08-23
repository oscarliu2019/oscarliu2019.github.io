export const TURTLE_SOUPS = [
  {
    id: 'dry_floor_in_storm',
    title: '暴雨夜的来客',
    difficulty: '进阶',
    surface:
      '暴雨夜，一个浑身湿透的男人冲进已经打烊的杂货店，说自己的伞被偷了。店员没有问他任何问题，只看了一眼他身后，便立刻报警。为什么？',
    entities: ['男人', '店员', '地面', '雨伞', '仓库', '洗手间'],
    facts: [
      {
        id: 'f_no_tracks',
        text: '店门到男人脚下没有连续的湿脚印。',
        core: true
      },
      {
        id: 'f_already_inside',
        text: '男人在打烊前就藏进了店内仓库，并非刚从暴雨中进门。',
        core: true
      },
      {
        id: 'f_sink_water',
        text: '男人身上的水来自洗手间，不是外面的雨。',
        core: true
      },
      {
        id: 'f_thief',
        text: '男人偷走仓库里的贵重货物，伪装成刚进店的路人。',
        core: true
      },
      {
        id: 'f_umbrella_lie',
        text: '所谓“雨伞被偷”只是解释自己为什么淋湿的谎话。',
        core: false
      },
      {
        id: 'f_clerk_notice',
        text: '店员刚拖过地，清楚任何从门外进来的人都会留下湿脚印。',
        core: false
      },
      {
        id: 'f_goods_missing',
        text: '仓库里同时少了一件贵重货物。',
        core: false
      }
    ],
    questionNodes: [
      {
        id: 'q_ground_important',
        question: '男人身后有什么关键线索吗？',
        verdict: 'yes',
        reply: '是。店员注意的是男人从门口走到这里本应留下的痕迹。',
        reveals: ['f_clerk_notice'],
        keywords: ['身后', '后面', '痕迹', '关键', '看什么'],
        patterns: ['他身后重要吗', '他身后有什么', '男人后面有什么', '店员看到了什么', '身后是关键吗'],
        requires: []
      },
      {
        id: 'q_tracks',
        question: '地面上有湿脚印吗？',
        verdict: 'no',
        reply: '没有。从门口到男人脚下，没有一串应当出现的湿脚印。',
        reveals: ['f_no_tracks'],
        keywords: ['湿脚印', '脚印', '水迹', '地板', '地面'],
        patterns: ['有湿脚印吗', '地上有没有脚印', '地面有水迹吗'],
        requires: ['f_clerk_notice']
      },
      {
        id: 'q_rain_important',
        question: '外面的暴雨重要吗？',
        verdict: 'yes',
        reply: '重要。暴雨让“从门外进来的人应该留下湿脚印”成为可靠判断。',
        reveals: ['f_clerk_notice'],
        keywords: ['暴雨', '下雨', '天气', '雨重要'],
        patterns: ['暴雨重要吗', '天气有关系吗', '下雨是关键吗'],
        requires: []
      },
      {
        id: 'q_umbrella_real',
        question: '他的雨伞真的被偷了吗？',
        verdict: 'no',
        reply: '没有。雨伞只是他临时编出的说辞。',
        reveals: ['f_umbrella_lie'],
        keywords: ['雨伞', '伞', '被偷', '真的'],
        patterns: ['伞真的被偷了吗', '雨伞是借口吗'],
        requires: []
      },
      {
        id: 'q_enter_front',
        question: '男人是刚从店门外进来的吗？',
        verdict: 'no',
        reply: '不是。他只是故意制造了“刚从雨里进来”的样子。',
        reveals: ['f_already_inside'],
        keywords: ['刚进来', '门外', '进门', '外面进来'],
        patterns: ['男人是刚从外面进来的吗', '他是刚进店吗'],
        requires: ['f_no_tracks']
      },
      {
        id: 'q_inside_before',
        question: '打烊前，男人已经在店里了吗？',
        verdict: 'yes',
        reply: '是。他在打烊前便藏进了仓库。',
        reveals: ['f_already_inside'],
        keywords: ['打烊前', '已经在店里', '提前', '藏在店里', '仓库'],
        patterns: ['他早就在店里吗', '他藏在仓库吗', '打烊之前他在吗'],
        requires: ['f_no_tracks']
      },
      {
        id: 'q_water_rain',
        question: '男人身上的水是雨水吗？',
        verdict: 'no',
        reply: '不是。水来自店内。',
        reveals: ['f_sink_water'],
        keywords: ['身上的水', '雨水', '淋湿', '水哪里来'],
        patterns: ['他身上是雨水吗', '他身上的是雨水吗', '他为什么湿透', '水是从哪里来的'],
        requires: ['f_no_tracks']
      },
      {
        id: 'q_sink',
        question: '男人用过洗手间吗？',
        verdict: 'yes',
        reply: '是。他在洗手间把自己淋湿，伪装成刚从暴雨中进来。',
        reveals: ['f_sink_water'],
        keywords: ['洗手间', '厕所', '水龙头', '淋湿自己'],
        patterns: ['他去过洗手间吗', '他用水龙头了吗', '他故意把自己弄湿吗'],
        requires: ['f_already_inside']
      },
      {
        id: 'q_store_loss',
        question: '店里丢了其他东西吗？',
        verdict: 'yes',
        reply: '是。仓库中少了一件贵重货物。',
        reveals: ['f_goods_missing'],
        keywords: ['店里丢东西', '仓库少了', '货物', '贵重物品'],
        patterns: ['店里还有东西被偷吗', '仓库丢东西了吗', '仓库少了货物吗', '货物少了吗'],
        requires: ['f_already_inside']
      },
      {
        id: 'q_man_thief',
        question: '这个男人就是小偷吗？',
        verdict: 'yes',
        reply: '是。他藏在店内盗窃后，试图伪装成普通路人离开。',
        reveals: ['f_thief', 'f_goods_missing'],
        keywords: ['男人', '小偷', '犯人', '盗窃', '偷东西'],
        patterns: ['男人是小偷吗', '男人是不是又偷了东西', '他又偷东西了吗', '他又偷了东西吗', '他偷了东西吗', '犯人就是他吗'],
        requires: ['f_already_inside', 'f_sink_water']
      },
      {
        id: 'q_clerk_knows',
        question: '店员认识这个男人吗？',
        verdict: 'irrelevant',
        reply: '无关。店员是否认识他，不影响地面留下的证据。',
        reveals: [],
        keywords: ['认识', '熟人', '见过'],
        patterns: ['店员认识他吗', '店员和他认识吗', '他们是熟人吗'],
        requires: []
      },
      {
        id: 'q_supernatural',
        question: '这件事和超自然现象有关吗？',
        verdict: 'no',
        reply: '没有。这是一件完全可以用现实行为解释的案件。',
        reveals: [],
        keywords: ['鬼', '超自然', '灵异', '魔法'],
        patterns: ['有鬼', '有鬼吗', '是超自然现象吗', '有魔法吗'],
        requires: []
      },
      {
        id: 'q_clerk_criminal',
        question: '店员参与了犯罪吗？',
        verdict: 'no',
        reply: '没有。店员只是从异常痕迹中识破了男人。',
        reveals: [],
        keywords: ['店员', '犯罪', '同伙', '参与'],
        patterns: ['店员是同伙吗', '店员犯罪了吗'],
        requires: []
      }
    ],
    solutionFactIds: ['f_no_tracks', 'f_already_inside', 'f_sink_water', 'f_thief'],
    decoyStatements: [
      { id: 'd_owner', text: '店员为了骗取保险金，故意栽赃男人。' },
      { id: 'd_secret_door', text: '男人通过一扇无人知道的密道进入商店。' }
    ],
    truth:
      '男人在打烊前就藏进仓库，偷走贵重货物后，又在洗手间把自己淋湿，准备假装成刚从暴雨中进来的路人。“雨伞被偷”只是解释湿透状态的借口。店员刚拖过地，却发现门口到男人脚下没有任何湿脚印，因此判断男人原本就在店内，并立即报警。'
  }
];
