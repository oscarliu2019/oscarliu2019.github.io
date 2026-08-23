import React, { useCallback, useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { ArrowLeft, CircleStop, Flower2, Gem, Hand, Play, Sparkles } from 'lucide-react';
import './RockGrassBadgeGame.css';

const { Engine, Bodies, Body, Composite, Events } = Matter;

const rockImage = name => process.env.PUBLIC_URL + `/images/rock/${name}`;

const PETS = {
  huoshen: {
    id: 'huoshen',
    name: '火神',
    image: rockImage('huoshen.png'),
    color: '#ef754b',
    trail: '#ffd28b',
    power: 1.08,
    restitution: 0.96,
    text: '范围爆破',
    ability: '烈焰爆破',
    abilityText: '点击弹珠，炸碎附近封印',
    pulseCharges: 1
  },
  shuiling: {
    id: 'shuiling',
    name: '水灵',
    image: rockImage('shuiling.png'),
    color: '#55a9d6',
    trail: '#bdeeff',
    power: 0.98,
    restitution: 1.06,
    text: '二次涌流',
    ability: '水流推进',
    abilityText: '点击方向，加速转向两次',
    pulseCharges: 2
  },
  molimao: {
    id: 'molimao',
    name: '魔力猫',
    image: rockImage('molimao.png'),
    color: '#70a967',
    trail: '#d7ed9b',
    power: 1,
    restitution: 1,
    text: '三次藤引',
    ability: '藤蔓牵引',
    abilityText: '点击方向，精准转向三次',
    pulseCharges: 3
  }
};

const RESCUES = [
  {
    id: 'chiikawa',
    name: '吉伊',
    stageName: '花影浅庭',
    stageFeature: '固定花灯 · 新手庭院',
    image: process.env.PUBLIC_URL + '/images/duiduipeng/吉伊.avif',
    palette: ['#dff5ed', '#f7e9c9', '#f1a9b8'],
    seals: 3,
    shots: 7,
    shielded: 0,
    portalDrift: false,
    target: [0.5, 0.25],
    bumpers: [
      [0.23, 0.47, 27],
      [0.77, 0.47, 27],
      [0.5, 0.61, 31]
    ],
    walls: [],
    drains: [],
    stars: [
      [0.14, 0.34],
      [0.86, 0.35],
      [0.31, 0.7],
      [0.69, 0.72]
    ],
    vortices: []
  },
  {
    id: 'hachiware',
    name: '小八',
    stageName: '流光回廊',
    stageFeature: '移动花灯 · 石桥阻隔 · 漂移莲池',
    image: process.env.PUBLIC_URL + '/images/duiduipeng/小八.avif',
    palette: ['#e8edf9', '#dff4ef', '#82a9d8'],
    seals: 4,
    shots: 6,
    shielded: 1,
    portalDrift: true,
    target: [0.29, 0.25],
    bumpers: [
      [0.72, 0.28, 26, 'horizontal'],
      [0.33, 0.55, 26, 'vertical'],
      [0.74, 0.63, 28, 'vertical'],
      [0.5, 0.78, 22, 'horizontal']
    ],
    // [x, y, 宽度比例, 高度比例, 旋转角度] —— 挡在救援目标下方，逼迫走位
    walls: [
      [0.29, 0.41, 0.34, 0.028, 0],
      [0.63, 0.44, 0.026, 0.22, 0]
    ],
    // [x, y, 半径] —— 危险漩涡，碰到即损失本球
    drains: [
      [0.13, 0.8, 24]
    ],
    stars: [
      [0.51, 0.34],
      [0.86, 0.42],
      [0.13, 0.6],
      [0.84, 0.78]
    ],
    vortices: []
  },
  {
    id: 'usagi',
    name: '乌萨奇',
    stageName: '双月水庭',
    stageFeature: '传送水门 · 双重封印 · 危险漩涡',
    image: process.env.PUBLIC_URL + '/images/duiduipeng/乌萨奇.avif',
    palette: ['#f2e7fb', '#dff3f1', '#f3c85a'],
    seals: 5,
    shots: 7,
    shielded: 2,
    portalDrift: true,
    target: [0.5, 0.22],
    bumpers: [
      [0.2, 0.44, 24, 'vertical'],
      [0.8, 0.44, 24, 'vertical'],
      [0.34, 0.64, 26, 'horizontal'],
      [0.66, 0.64, 26, 'horizontal']
    ],
    // 两道斜置石桥在目标上方组成守护顶棚，中间留出窄缝
    walls: [
      [0.33, 0.37, 0.22, 0.026, -26],
      [0.67, 0.37, 0.22, 0.026, 26]
    ],
    drains: [
      [0.12, 0.82, 23],
      [0.88, 0.82, 23]
    ],
    stars: [
      [0.12, 0.29],
      [0.88, 0.3],
      [0.18, 0.75],
      [0.82, 0.76],
      [0.5, 0.52]
    ],
    vortices: [
      [0.18, 0.55],
      [0.82, 0.73]
    ]
  }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const loadImage = source => {
  const image = new Image();
  image.src = source;
  return image;
};

const createRuntime = petId => ({
  petId,
  stageIndex: 0,
  width: 0,
  height: 0,
  engine: null,
  ball: null,
  bodies: [],
  bumpers: [],
  walls: [],
  drains: [],
  seals: [],
  stars: [],
  vortices: [],
  assists: [],
  targetBody: null,
  portalBody: null,
  portalDrift: 0,
  launcher: { x: 0, y: 0 },
  mode: 'ready',
  shotsLeft: RESCUES[0].shots,
  aiming: null,
  pointer: null,
  pulseLeft: PETS[petId].pulseCharges,
  rollStartedAt: 0,
  slowFor: 0,
  combo: 0,
  bloom: 0,
  blooms: 0,
  maxCombo: 0,
  score: 0,
  stageStars: 0,
  rescued: false,
  portalOpen: false,
  teleportLockUntil: 0,
  trail: [],
  particles: [],
  ripples: [],
  stageFlashUntil: 0,
  stageStartedAt: 0,
  timers: [],
  stats: {
    stars: 0,
    seals: 0,
    rescues: 0
  }
});

function RockGrassBadgeGame({ onGoBack }) {
  const [screen, setScreen] = useState('select');
  const [selectedPetId, setSelectedPetId] = useState('shuiling');
  const [result, setResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hud, setHud] = useState({
    stage: 0,
    shots: RESCUES[0].shots,
    score: 0,
    combo: 0,
    seals: RESCUES[0].seals,
    rescued: false,
    portal: false,
    pulse: PETS.shuiling.pulseCharges,
    rolling: false,
    stars: 0,
    totalStars: RESCUES[0].stars.length,
    bloom: 0,
    blooms: 0
  });
  const [resultStats, setResultStats] = useState({
    score: 0,
    maxCombo: 0,
    stars: 0,
    rescues: 0
  });
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const frameRef = useRef(null);
  const imagesRef = useRef({});
  const hudAtRef = useRef(0);
  const guideShownRef = useRef(false);

  const selectedPet = PETS[selectedPetId];

  useEffect(() => {
    imagesRef.current = {
      ...Object.values(PETS).reduce((images, pet) => {
        images[pet.id] = loadImage(pet.image);
        return images;
      }, {}),
      ...RESCUES.reduce((images, rescue) => {
        images[rescue.id] = loadImage(rescue.image);
        return images;
      }, {})
    };
  }, []);

  // 读取历史最高分（localStorage 不可用时静默降级）
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem('pinballBestScore'));
      if (!Number.isNaN(saved) && saved > 0) setBestScore(saved);
    } catch (error) {
      // 忽略隐私模式等导致的读取失败
    }
  }, []);

  const addParticles = useCallback((runtime, x, y, color, count, speed = 100) => {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 30 + Math.random() * speed;
      runtime.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        radius: 2 + Math.random() * 4,
        life: 420 + Math.random() * 430,
        maxLife: 850
      });
    }
  }, []);

  const addRipple = useCallback((runtime, x, y, color, radius = 12) => {
    runtime.ripples.push({
      x,
      y,
      color,
      radius,
      life: 520,
      maxLife: 520
    });
  }, []);

  const finishRun = useCallback((status, runtime) => {
    runtime.mode = 'finished';
    cancelAnimationFrame(frameRef.current);
    setResult(status);
    setResultStats({
      score: runtime.score,
      maxCombo: runtime.maxCombo,
      stars: runtime.stats.stars,
      rescues: runtime.stats.rescues
    });
    // 刷新历史最高分
    setBestScore(previous => {
      if (runtime.score > previous) {
        setIsNewBest(true);
        try {
          window.localStorage.setItem('pinballBestScore', String(runtime.score));
        } catch (error) {
          // 忽略写入失败
        }
        return runtime.score;
      }
      setIsNewBest(false);
      return previous;
    });
    setScreen('result');
  }, []);

  const startGame = useCallback(() => {
    const runtime = createRuntime(selectedPetId);
    runtimeRef.current = runtime;
    setResult(null);
    if (!guideShownRef.current) {
      guideShownRef.current = true;
      setShowGuide(true);
    }
    setHud({
      stage: 0,
      shots: RESCUES[0].shots,
      score: 0,
      combo: 0,
      seals: RESCUES[0].seals,
      rescued: false,
      portal: false,
      pulse: PETS[selectedPetId].pulseCharges,
      rolling: false,
      stars: 0,
      totalStars: RESCUES[0].stars.length,
      bloom: 0,
      blooms: 0
    });
    setScreen('game');
  }, [selectedPetId]);

  useEffect(() => {
    if (screen !== 'game') return undefined;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const runtime = runtimeRef.current;
    const engine = Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    runtime.engine = engine;

    const clearTimers = () => {
      runtime.timers.forEach(timer => clearTimeout(timer));
      runtime.timers = [];
    };

    const createStage = (stageIndex, preserved) => {
      clearTimers();
      Composite.clear(engine.world, false);
      runtime.stageIndex = stageIndex;
      runtime.ball = null;
      runtime.bodies = [];
      runtime.bumpers = [];
      runtime.walls = [];
      runtime.drains = [];
      runtime.seals = [];
      runtime.stars = [];
      runtime.vortices = [];
      runtime.assists = [];
      runtime.targetBody = null;
      runtime.portalBody = null;
      runtime.portalDrift = 0;
      runtime.mode = 'ready';
      runtime.aiming = null;
      runtime.pointer = null;
      runtime.pulseLeft = PETS[runtime.petId].pulseCharges;
      runtime.slowFor = 0;
      runtime.combo = 0;
      runtime.bloom = 0;
      runtime.blooms = 0;
      runtime.stageStars = 0;
      runtime.rescued = false;
      runtime.portalOpen = false;
      runtime.trail = [];
      runtime.particles = [];
      runtime.ripples = [];
      runtime.stageFlashUntil = performance.now() + 650;
      runtime.stageStartedAt = performance.now();

      const stage = RESCUES[stageIndex];
      const width = runtime.width;
      const height = runtime.height;
      const wall = 32;
      const options = { isStatic: true, restitution: 0.96, friction: 0, label: 'wall' };
      const boundaries = [
        Bodies.rectangle(width / 2, -wall / 2, width + wall * 2, wall, options),
        Bodies.rectangle(width / 2, height + wall / 2, width + wall * 2, wall, options),
        Bodies.rectangle(-wall / 2, height / 2, wall, height + wall * 2, options),
        Bodies.rectangle(width + wall / 2, height / 2, wall, height + wall * 2, options)
      ];

      runtime.launcher.x = width / 2;
      runtime.launcher.y = height - 72;

      runtime.bumpers = stage.bumpers.map((data, index) => {
        const [xRatio, yRatio, radius, movement] = data;
        const body = Bodies.circle(width * xRatio, height * yRatio, radius, {
          isStatic: true,
          restitution: 1.1,
          friction: 0,
          label: `bumper-${index}`
        });
        body.homeX = width * xRatio;
        body.homeY = height * yRatio;
        body.movement = movement;
        body.radius = radius;
        return body;
      });

      // 石桥：静态障碍物，阻挡弹珠的直线路径，逼迫玩家绕行或借助能力
      runtime.walls = (stage.walls || []).map((data, index) => {
        const [xRatio, yRatio, wRatio, hRatio, degrees] = data;
        const bodyWidth = Math.max(12, width * wRatio);
        const bodyHeight = Math.max(12, height * hRatio);
        const body = Bodies.rectangle(width * xRatio, height * yRatio, bodyWidth, bodyHeight, {
          isStatic: true,
          restitution: 0.72,
          friction: 0,
          angle: (degrees || 0) * Math.PI / 180,
          label: `wall-${index}`,
          chamfer: { radius: Math.min(bodyWidth, bodyHeight) / 2 }
        });
        body.bodyWidth = bodyWidth;
        body.bodyHeight = bodyHeight;
        return body;
      });

      // 危险漩涡：碰到即损失本球，出现在 2、3 关，增加走位风险
      runtime.drains = (stage.drains || []).map((data, index) => {
        const [xRatio, yRatio, radius] = data;
        const body = Bodies.circle(width * xRatio, height * yRatio, radius, {
          isStatic: true,
          isSensor: true,
          label: `drain-${index}`
        });
        body.radius = radius;
        return { body, radius };
      });

      const targetX = width * stage.target[0];
      const targetY = height * stage.target[1];
      runtime.targetBody = Bodies.circle(targetX, targetY, 42, {
        isStatic: true,
        isSensor: true,
        label: 'target'
      });

      // 后 shielded 个封印带有护盾，需要额外命中一次才能击碎
      const shielded = stage.shielded || 0;
      runtime.seals = Array.from({ length: stage.seals }, (_, index) => {
        const angle = index * Math.PI * 2 / stage.seals - Math.PI / 2;
        const orbitX = stageIndex === 2 ? 76 : 68;
        const orbitY = stageIndex === 2 ? 58 : 52;
        const body = Bodies.circle(
          targetX + Math.cos(angle) * orbitX,
          targetY + Math.sin(angle) * orbitY,
          15,
          {
            isStatic: true,
            isSensor: true,
            label: `seal-${index}`
          }
        );
        const shield = index >= stage.seals - shielded ? 1 : 0;
        return { body, active: true, angle, shield };
      });

      runtime.stars = stage.stars.map((position, index) => {
        const body = Bodies.circle(width * position[0], height * position[1], 10, {
          isStatic: true,
          isSensor: true,
          label: `star-${index}`
        });
        return { body, active: true };
      });

      runtime.vortices = stage.vortices.map((position, index) => {
        const body = Bodies.circle(width * position[0], height * position[1], 24, {
          isStatic: true,
          isSensor: true,
          label: `vortex-${index}`
        });
        return { body, index };
      });

      const assistPositions = stageIndex === 1
        ? [[0.12, 0.64]]
        : [[0.12, 0.58], [0.88, 0.69]];
      runtime.assists = RESCUES.slice(0, stageIndex).map((rescue, index) => {
        const position = assistPositions[index];
        const body = Bodies.circle(width * position[0], height * position[1], 25, {
          isStatic: true,
          isSensor: true,
          label: `assist-${index}`
        });
        return { body, rescue, active: true };
      });

      Composite.add(engine.world, [
        ...boundaries,
        ...runtime.bumpers,
        ...runtime.walls,
        ...runtime.drains.map(drain => drain.body),
        runtime.targetBody,
        ...runtime.seals.map(seal => seal.body),
        ...runtime.stars.map(star => star.body),
        ...runtime.vortices.map(vortex => vortex.body),
        ...runtime.assists.map(assist => assist.body)
      ]);

      if (preserved) {
        runtime.seals.forEach((seal, index) => {
          if (!preserved.seals[index]) {
            seal.active = false;
            Composite.remove(engine.world, seal.body);
          } else if (preserved.sealShields && preserved.sealShields[index] !== undefined) {
            seal.shield = preserved.sealShields[index];
          }
        });
        runtime.stars.forEach((star, index) => {
          if (!preserved.stars[index]) {
            star.active = false;
            Composite.remove(engine.world, star.body);
          }
        });
        runtime.shotsLeft = preserved.shotsLeft;
        runtime.stageStars = preserved.stageStars;
        runtime.blooms = preserved.blooms;
        if (preserved.rescued) {
          runtime.rescued = true;
          Composite.remove(engine.world, runtime.targetBody);
          createPortal();
        }
      } else {
        runtime.shotsLeft = stage.shots;
      }

      setHud({
        stage: stageIndex,
        shots: runtime.shotsLeft,
        score: runtime.score,
        combo: 0,
        seals: runtime.seals.filter(seal => seal.active).length,
        rescued: runtime.rescued,
        portal: runtime.portalOpen,
        pulse: PETS[runtime.petId].pulseCharges,
        rolling: false,
        stars: runtime.stageStars,
        totalStars: stage.stars.length,
        bloom: 0,
        blooms: runtime.blooms
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (
        runtime.width &&
        Math.abs(runtime.width - rect.width) < 0.5 &&
        Math.abs(runtime.height - rect.height) < 0.5
      ) {
        return;
      }
      const preserved = runtime.width
        ? {
            seals: runtime.seals.map(seal => seal.active),
            sealShields: runtime.seals.map(seal => seal.shield),
            stars: runtime.stars.map(star => star.active),
            shotsLeft: runtime.shotsLeft + (runtime.ball && !runtime.portalOpen ? 1 : 0),
            stageStars: runtime.stageStars,
            blooms: runtime.blooms,
            rescued: runtime.rescued
          }
        : null;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      runtime.width = rect.width;
      runtime.height = rect.height;
      createStage(runtime.stageIndex, preserved);
    };

    const createPortal = () => {
      if (runtime.portalBody) return;
      runtime.portalBody = Bodies.circle(runtime.width / 2, 54, 34, {
        isStatic: true,
        isSensor: true,
        label: 'portal'
      });
      Composite.add(engine.world, runtime.portalBody);
      runtime.portalOpen = true;
      runtime.shotsLeft = Math.max(runtime.shotsLeft, 1);
      runtime.stageFlashUntil = performance.now() + 500;
    };

    const resetBall = () => {
      if (runtime.ball) Composite.remove(engine.world, runtime.ball);
      runtime.ball = null;
      runtime.trail = [];
      runtime.pulseLeft = PETS[runtime.petId].pulseCharges;
      runtime.slowFor = 0;
      if (runtime.portalOpen) runtime.shotsLeft = Math.max(runtime.shotsLeft, 1);
      if (runtime.shotsLeft <= 0 && !runtime.portalOpen) {
        finishRun('lose', runtime);
        return;
      }
      runtime.mode = 'ready';
    };

    const completeStage = () => {
      if (runtime.mode === 'transition') return;
      runtime.mode = 'transition';
      runtime.stats.rescues += 1;
      runtime.score += runtime.shotsLeft * 75;
      if (runtime.stageStars === RESCUES[runtime.stageIndex].stars.length) {
        runtime.score += 600;
      }
      runtime.stageFlashUntil = performance.now() + 900;
      addParticles(runtime, runtime.width / 2, runtime.height * 0.3, '#ffe184', 46, 150);
      const timer = setTimeout(() => {
        if (runtime.stageIndex >= RESCUES.length - 1) {
          finishRun('win', runtime);
        } else {
          createStage(runtime.stageIndex + 1);
        }
      }, 950);
      runtime.timers.push(timer);
    };

    const breakSeal = (index, options = {}) => {
      const seal = runtime.seals[index];
      if (!seal || !seal.active) return;
      // 护盾封印：第一次命中只破盾并弹一小串火花，第二次才真正击碎
      if (seal.shield > 0 && !options.force) {
        seal.shield -= 1;
        seal.shieldFlashUntil = performance.now() + 260;
        runtime.score += 60;
        addParticles(runtime, seal.body.position.x, seal.body.position.y, '#cfe4ff', 12, 90);
        addRipple(runtime, seal.body.position.x, seal.body.position.y, '#9ecbff', 18);
        return;
      }
      seal.active = false;
      Composite.remove(engine.world, seal.body);
      runtime.stats.seals += 1;
      runtime.score += 450 + runtime.combo * 40;
      runtime.combo += 2;
      runtime.maxCombo = Math.max(runtime.maxCombo, runtime.combo);
      addParticles(runtime, seal.body.position.x, seal.body.position.y, '#ffe47c', 24, 140);
      addRipple(runtime, seal.body.position.x, seal.body.position.y, '#f5c85b', 16);
    };

    runtime.breakSeal = breakSeal;

    const collectStar = index => {
      const star = runtime.stars[index];
      if (!star || !star.active) return;
      star.active = false;
      Composite.remove(engine.world, star.body);
      runtime.stats.stars += 1;
      runtime.stageStars += 1;
      runtime.score += 180 + runtime.combo * 20;
      runtime.combo += 1;
      runtime.maxCombo = Math.max(runtime.maxCombo, runtime.combo);
      addParticles(runtime, star.body.position.x, star.body.position.y, '#fff0a0', 16, 90);
    };

    runtime.collectStar = collectStar;

    const rescueTarget = () => {
      if (runtime.rescued || runtime.seals.some(seal => seal.active)) return;
      runtime.rescued = true;
      runtime.score += 1000;
      runtime.combo += 5;
      runtime.maxCombo = Math.max(runtime.maxCombo, runtime.combo);
      Composite.remove(engine.world, runtime.targetBody);
      addParticles(runtime, runtime.targetBody.position.x, runtime.targetBody.position.y, '#ffbfd0', 38, 130);
      addRipple(runtime, runtime.targetBody.position.x, runtime.targetBody.position.y, '#ffffff', 28);
      createPortal();
    };

    const teleportBall = index => {
      if (!runtime.ball || performance.now() < runtime.teleportLockUntil || runtime.vortices.length !== 2) return;
      const destination = runtime.vortices[index === 0 ? 1 : 0].body.position;
      runtime.teleportLockUntil = performance.now() + 650;
      Body.setPosition(runtime.ball, { x: destination.x, y: destination.y });
      Body.setVelocity(runtime.ball, {
        x: runtime.ball.velocity.x * 1.18,
        y: runtime.ball.velocity.y * 1.18
      });
      addRipple(runtime, destination.x, destination.y, '#ae8fe2', 24);
    };

    const hitDrain = index => {
      const drain = runtime.drains[index];
      if (!drain || !runtime.ball || runtime.mode !== 'rolling') return;
      const position = runtime.ball.position;
      addParticles(runtime, position.x, position.y, '#6a5b9a', 26, 120);
      addRipple(runtime, drain.body.position.x, drain.body.position.y, '#8f7ac2', 26);
      runtime.combo = 0;
      runtime.bloom = 0;
      resetBall();
    };

    const activateAssist = index => {
      const assist = runtime.assists[index];
      if (!assist || !assist.active || !runtime.ball) return;
      assist.active = false;
      runtime.score += 260;
      runtime.combo += 2;
      runtime.maxCombo = Math.max(runtime.maxCombo, runtime.combo);
      const position = assist.body.position;

      if (assist.rescue.id === 'chiikawa') {
        const sealIndex = runtime.seals.findIndex(seal => seal.active);
        if (sealIndex >= 0) {
          breakSeal(sealIndex);
        } else {
          const starIndex = runtime.stars.findIndex(star => star.active);
          if (starIndex >= 0) collectStar(starIndex);
        }
        Body.setVelocity(runtime.ball, {
          x: runtime.ball.velocity.x * 1.2,
          y: runtime.ball.velocity.y * 1.2
        });
        addParticles(runtime, position.x, position.y, '#ffbdcc', 26, 120);
      }

      if (assist.rescue.id === 'hachiware') {
        runtime.pulseLeft += 1;
        const target = runtime.seals.find(seal => seal.active)?.body.position ||
          (runtime.rescued ? runtime.portalBody?.position : runtime.targetBody?.position) ||
          runtime.portalBody?.position;
        if (target) {
          const dx = target.x - runtime.ball.position.x;
          const dy = target.y - runtime.ball.position.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          const speed = clamp(runtime.ball.speed, 10, 16);
          Body.setVelocity(runtime.ball, {
            x: dx / length * speed,
            y: dy / length * speed
          });
        }
        addParticles(runtime, position.x, position.y, '#a9d9ec', 26, 110);
      }

      addRipple(runtime, position.x, position.y, '#ffffff', 30);
    };

    const handleCollisions = event => {
      event.pairs.forEach(pair => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (!labels.includes('ball')) return;
        const other = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;

        if (other.label.startsWith('bumper-')) {
          runtime.combo += 1;
          runtime.bloom += 1;
          runtime.maxCombo = Math.max(runtime.maxCombo, runtime.combo);
          runtime.score += 80 + runtime.combo * 15;
          addRipple(runtime, other.position.x, other.position.y, '#ffffff', other.circleRadius);
          addParticles(runtime, other.position.x, other.position.y, '#ffc9d8', 8, 60);
          if (runtime.bloom >= 3) {
            runtime.bloom = 0;
            runtime.blooms += 1;
            runtime.score += 360;
            runtime.pulseLeft += 1;
            Body.setVelocity(runtime.ball, {
              x: runtime.ball.velocity.x * 1.22,
              y: runtime.ball.velocity.y * 1.22
            });
            runtime.bumpers.forEach(bumper => {
              addRipple(runtime, bumper.position.x, bumper.position.y, '#ffe0ea', bumper.circleRadius);
              addParticles(runtime, bumper.position.x, bumper.position.y, '#ffc0d1', 10, 75);
            });
          }
        }

        if (other.label.startsWith('seal-')) breakSeal(Number(other.label.split('-')[1]));
        if (other.label.startsWith('star-')) collectStar(Number(other.label.split('-')[1]));
        if (other.label.startsWith('vortex-')) teleportBall(Number(other.label.split('-')[1]));
        if (other.label.startsWith('drain-')) hitDrain(Number(other.label.split('-')[1]));
        if (other.label.startsWith('assist-')) activateAssist(Number(other.label.split('-')[1]));
        if (other.label === 'target') rescueTarget();
        if (other.label === 'portal' && runtime.portalOpen) completeStage();
      });
    };

    Events.on(engine, 'collisionStart', handleCollisions);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const drawStar = (x, y, radius, color, rotation = 0) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.fillStyle = color;
      context.beginPath();
      for (let index = 0; index < 10; index += 1) {
        const angle = index * Math.PI / 5 - Math.PI / 2;
        const length = index % 2 === 0 ? radius : radius * 0.42;
        const px = Math.cos(angle) * length;
        const py = Math.sin(angle) * length;
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    const drawBackground = (now, stage) => {
      const [top, bottom, accent] = stage.palette;
      const gradient = context.createLinearGradient(0, 0, 0, runtime.height);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, runtime.width, runtime.height);

      context.fillStyle = 'rgba(255,255,255,0.62)';
      context.beginPath();
      context.moveTo(runtime.width * 0.16, 0);
      context.bezierCurveTo(runtime.width * 0.02, runtime.height * 0.35, runtime.width * 0.52, runtime.height * 0.65, runtime.width * 0.24, runtime.height);
      context.lineTo(runtime.width * 0.76, runtime.height);
      context.bezierCurveTo(runtime.width * 0.96, runtime.height * 0.62, runtime.width * 0.48, runtime.height * 0.31, runtime.width * 0.84, 0);
      context.closePath();
      context.fill();

      context.fillStyle = 'rgba(72,133,113,0.28)';
      for (let index = 0; index < 9; index += 1) {
        const x = index * runtime.width / 8;
        context.beginPath();
        context.arc(x, 10 + Math.sin(index * 1.6) * 6, 22 + index % 3 * 8, 0, Math.PI * 2);
        context.fill();
      }

      context.strokeStyle = 'rgba(66,140,163,0.13)';
      context.lineWidth = 1.3;
      for (let y = 28; y < runtime.height; y += 48) {
        context.beginPath();
        for (let x = -10; x < runtime.width + 10; x += 8) {
          const waveY = y + Math.sin(x / 33 + now / 1000) * 2.5;
          if (x === -10) context.moveTo(x, waveY);
          else context.lineTo(x, waveY);
        }
        context.stroke();
      }

      const pads = [
        [0.1, 0.32, 23],
        [0.9, 0.38, 28],
        [0.16, 0.77, 30],
        [0.86, 0.82, 24]
      ];
      pads.forEach(([xRatio, yRatio, radius], index) => {
        context.save();
        context.translate(runtime.width * xRatio, runtime.height * yRatio);
        context.rotate(index * 0.8 + Math.sin(now / 1500 + index) * 0.08);
        context.fillStyle = 'rgba(91,162,135,0.28)';
        context.beginPath();
        context.ellipse(0, 0, radius, radius * 0.5, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = 'rgba(255,255,255,0.55)';
        context.stroke();
        context.restore();
      });

      for (let index = 0; index < 20; index += 1) {
        const x = (index * 83 + 31) % runtime.width;
        const y = (index * 127 + 47) % runtime.height;
        drawStar(x, y, 2 + Math.sin(now / 420 + index), index % 3 === 0 ? accent : 'rgba(255,255,255,0.7)', now / 900);
      }
    };

    const drawBumper = (bumper, index, now, accent) => {
      const { x, y } = bumper.position;
      const radius = bumper.circleRadius;
      context.save();
      context.translate(x, y);
      context.rotate(now / 1300 + index);
      context.shadowColor = accent;
      context.shadowBlur = 14;
      for (let petal = 0; petal < 8; petal += 1) {
        context.rotate(Math.PI / 4);
        context.fillStyle = petal % 2 ? '#ffffff' : accent;
        context.beginPath();
        context.ellipse(radius * 0.64, 0, radius * 0.34, radius * 0.2, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = '#fff4c5';
      context.beginPath();
      context.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(80,108,108,0.24)';
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    };

    const drawTarget = (stage, now) => {
      const position = runtime.targetBody ? runtime.targetBody.position : {
        x: runtime.width * stage.target[0],
        y: runtime.height * stage.target[1]
      };
      if (runtime.rescued) return;
      const unlocked = runtime.seals.every(seal => !seal.active);
      context.save();
      context.shadowColor = unlocked ? '#ffe48a' : '#8bcde2';
      context.shadowBlur = unlocked ? 24 : 14;
      context.fillStyle = unlocked ? 'rgba(255,244,180,0.34)' : 'rgba(185,231,244,0.35)';
      context.beginPath();
      context.arc(position.x, position.y, 43 + Math.sin(now / 240) * 2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = unlocked ? '#f0cb61' : 'rgba(255,255,255,0.9)';
      context.lineWidth = unlocked ? 4 : 2;
      context.stroke();
      context.restore();
      const image = imagesRef.current[stage.id];
      context.save();
      context.beginPath();
      context.arc(position.x, position.y, 34, 0, Math.PI * 2);
      context.clip();
      if (image?.complete) context.drawImage(image, position.x - 34, position.y - 34, 68, 68);
      context.restore();
    };

    const drawSeal = (seal, now) => {
      if (!seal.active) return;
      const { x, y } = seal.body.position;
      // 护盾封印：外圈多一道蓝色光环，命中破盾时闪一下
      if (seal.shield > 0) {
        const flashing = seal.shieldFlashUntil && now < seal.shieldFlashUntil;
        context.save();
        context.translate(x, y);
        context.strokeStyle = flashing ? '#ffffff' : '#8ec6ff';
        context.lineWidth = flashing ? 4 : 2.5;
        context.shadowColor = '#8ec6ff';
        context.shadowBlur = 12;
        context.beginPath();
        context.arc(0, 0, 21 + Math.sin(now / 220) * 1.5, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }
      context.save();
      context.translate(x, y);
      context.rotate(now / 650 + seal.angle);
      context.shadowColor = '#ffe187';
      context.shadowBlur = 15;
      context.fillStyle = '#f4ca5c';
      context.beginPath();
      context.moveTo(0, -16);
      context.lineTo(12, 0);
      context.lineTo(0, 16);
      context.lineTo(-12, 0);
      context.closePath();
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    };

    const drawWall = wall => {
      const { x, y } = wall.position;
      context.save();
      context.translate(x, y);
      context.rotate(wall.angle);
      context.shadowColor = 'rgba(70,90,110,0.35)';
      context.shadowBlur = 10;
      const w = wall.bodyWidth;
      const h = wall.bodyHeight;
      const radius = Math.min(w, h) / 2;
      const gradient = context.createLinearGradient(0, -h / 2, 0, h / 2);
      gradient.addColorStop(0, 'rgba(150,170,186,0.95)');
      gradient.addColorStop(1, 'rgba(108,132,150,0.95)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(-w / 2 + radius, -h / 2);
      context.lineTo(w / 2 - radius, -h / 2);
      context.arc(w / 2 - radius, 0, radius, -Math.PI / 2, Math.PI / 2);
      context.lineTo(-w / 2 + radius, h / 2);
      context.arc(-w / 2 + radius, 0, radius, Math.PI / 2, -Math.PI / 2);
      context.closePath();
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.65)';
      context.lineWidth = 1.5;
      context.stroke();
      context.restore();
    };

    const drawDrain = (drain, now) => {
      const { x, y } = drain.body.position;
      const radius = drain.radius;
      context.save();
      context.translate(x, y);
      context.shadowColor = '#5a4a86';
      context.shadowBlur = 16;
      context.fillStyle = 'rgba(74,58,120,0.4)';
      context.beginPath();
      context.arc(0, 0, radius + 3, 0, Math.PI * 2);
      context.fill();
      context.rotate(-now / 320);
      context.strokeStyle = '#8f7ac2';
      context.lineWidth = 3;
      for (let arm = 0; arm < 3; arm += 1) {
        context.rotate(Math.PI * 2 / 3);
        context.beginPath();
        for (let t = 0; t <= 1; t += 0.12) {
          const spiral = t * radius;
          const px = Math.cos(t * Math.PI * 2) * spiral;
          const py = Math.sin(t * Math.PI * 2) * spiral;
          if (t === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.stroke();
      }
      context.restore();
    };

    const drawPortal = now => {
      if (!runtime.portalOpen || !runtime.portalBody) return;
      const { x, y } = runtime.portalBody.position;
      const pulse = 1 + Math.sin(now / 170) * 0.08;
      context.save();
      context.translate(x, y);
      context.scale(pulse, pulse);
      context.shadowColor = '#8de0bd';
      context.shadowBlur = 24;
      context.fillStyle = 'rgba(105,199,163,0.56)';
      context.beginPath();
      context.ellipse(0, 0, 38, 22, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 3;
      context.stroke();
      for (let index = 0; index < 6; index += 1) {
        context.rotate(Math.PI / 3);
        context.fillStyle = index % 2 ? '#fff7c8' : '#ffffff';
        context.beginPath();
        context.ellipse(23, 0, 12, 5, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    const drawVortex = (vortex, index, now) => {
      const { x, y } = vortex.body.position;
      context.save();
      context.translate(x, y);
      context.rotate((index ? -1 : 1) * now / 500);
      context.strokeStyle = index ? '#f0a9c2' : '#9d8ddb';
      context.lineWidth = 4;
      context.shadowColor = index ? '#f0a9c2' : '#9d8ddb';
      context.shadowBlur = 12;
      for (let ring = 0; ring < 3; ring += 1) {
        context.beginPath();
        context.arc(0, 0, 10 + ring * 6, ring * 0.8, Math.PI * 1.5 + ring * 0.8);
        context.stroke();
      }
      context.restore();
    };

    const drawAssist = (assist, now) => {
      const { x, y } = assist.body.position;
      const pulse = 1 + Math.sin(now / 210 + assist.body.id) * 0.06;
      context.save();
      context.translate(x, y);
      context.scale(pulse, pulse);
      context.globalAlpha = assist.active ? 1 : 0.42;
      context.shadowColor = assist.rescue.id === 'chiikawa' ? '#f2aabd' : '#8bc8e0';
      context.shadowBlur = assist.active ? 18 : 0;
      context.fillStyle = 'rgba(255,255,255,0.9)';
      context.beginPath();
      context.arc(0, 0, 28, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = assist.rescue.id === 'chiikawa' ? '#e99bb0' : '#83bad2';
      context.lineWidth = 3;
      context.stroke();
      context.beginPath();
      context.arc(0, 0, 22, 0, Math.PI * 2);
      context.clip();
      const image = imagesRef.current[assist.rescue.id];
      if (image?.complete) context.drawImage(image, -22, -22, 44, 44);
      context.restore();
    };

    const drawTrajectory = () => {
      if (runtime.mode !== 'aiming' || !runtime.aiming) return;
      const start = runtime.launcher;
      const target = runtime.aiming;
      const dx = target.x - start.x;
      const dy = target.y - start.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const direction = { x: dx / length, y: dy / length };
      let x = start.x;
      let y = start.y;
      let vx = direction.x;
      let vy = direction.y;
      const trajectoryLength = runtime.petId === 'huoshen' ? 18 : runtime.petId === 'shuiling' ? 28 : 36;
      for (let index = 1; index <= trajectoryLength; index += 1) {
        x += vx * 18;
        y += vy * 18;
        if (x < 24 || x > runtime.width - 24) {
          vx *= -1;
          x = clamp(x, 24, runtime.width - 24);
        }
        if (y < 24 || y > runtime.height - 24) {
          vy *= -1;
          y = clamp(y, 24, runtime.height - 24);
        }
        context.globalAlpha = 1 - index / (trajectoryLength + 3);
        context.fillStyle = selectedPet.color;
        context.beginPath();
        if (runtime.petId === 'molimao') {
          context.ellipse(x, y, 4, 2, Math.atan2(vy, vx), 0, Math.PI * 2);
        } else {
          const radius = runtime.petId === 'huoshen'
            ? index % 2 === 0 ? 4.5 : 2.5
            : index % 3 === 0 ? 4 : 2;
          context.arc(x, y, radius, 0, Math.PI * 2);
        }
        context.fill();
        if (runtime.petId === 'shuiling' && index % 3 === 0) {
          context.strokeStyle = '#ffffff';
          context.lineWidth = 1;
          context.stroke();
        }
      }
      context.globalAlpha = 1;
    };

    const drawBall = () => {
      const position = runtime.ball ? runtime.ball.position : runtime.launcher;
      const radius = 23;
      runtime.trail.forEach((point, index) => {
        context.globalAlpha = index / runtime.trail.length * 0.28;
        context.fillStyle = selectedPet.trail;
        context.beginPath();
        const size = radius * index / runtime.trail.length * 0.6;
        if (runtime.petId === 'molimao') {
          context.ellipse(point.x, point.y, size, size * 0.45, index * 0.7, 0, Math.PI * 2);
        } else if (runtime.petId === 'huoshen') {
          context.moveTo(point.x, point.y - size);
          context.lineTo(point.x + size * 0.75, point.y + size);
          context.lineTo(point.x - size * 0.75, point.y + size);
          context.closePath();
        } else {
          context.arc(point.x, point.y, size, 0, Math.PI * 2);
        }
        context.fill();
        if (runtime.petId === 'shuiling') {
          context.strokeStyle = 'rgba(255,255,255,0.55)';
          context.stroke();
        }
      });
      context.globalAlpha = 1;
      context.save();
      context.shadowColor = selectedPet.color;
      context.shadowBlur = 16;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(position.x, position.y, radius + 3, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = selectedPet.color;
      context.lineWidth = 3;
      context.stroke();
      context.beginPath();
      context.arc(position.x, position.y, radius - 2, 0, Math.PI * 2);
      context.clip();
      const image = imagesRef.current[runtime.petId];
      if (image?.complete) context.drawImage(image, position.x - radius, position.y - radius, radius * 2, radius * 2);
      context.restore();
      context.fillStyle = 'rgba(43,75,84,0.16)';
      context.beginPath();
      context.ellipse(position.x, position.y + radius + 8, radius * 0.8, 5, 0, 0, Math.PI * 2);
      context.fill();
    };

    const update = (now, delta) => {
      const stage = RESCUES[runtime.stageIndex];
      runtime.bumpers.forEach((bumper, index) => {
        if (bumper.movement === 'horizontal') {
          Body.setPosition(bumper, {
            x: bumper.homeX + Math.sin(now / 820 + index) * runtime.width * 0.12,
            y: bumper.homeY
          });
        }
        if (bumper.movement === 'vertical') {
          Body.setPosition(bumper, {
            x: bumper.homeX,
            y: bumper.homeY + Math.sin(now / 760 + index) * runtime.height * 0.08
          });
        }
      });

      // 漂移莲池：救出伙伴后传送门会左右摆动，玩家必须瞄准时机送球入池
      if (runtime.portalBody && stage.portalDrift) {
        runtime.portalDrift = Math.sin(now / 900) * runtime.width * 0.26;
        Body.setPosition(runtime.portalBody, {
          x: runtime.width / 2 + runtime.portalDrift,
          y: 54
        });
      }

      Engine.update(engine, Math.min(delta, 25));

      if (runtime.ball) {
        runtime.trail.push({ x: runtime.ball.position.x, y: runtime.ball.position.y });
        if (runtime.trail.length > 15) runtime.trail.shift();
        const speed = runtime.ball.speed;
        runtime.slowFor = speed < 0.72 ? runtime.slowFor + delta : 0;
        if (
          runtime.slowFor > 950 ||
          now - runtime.rollStartedAt > 11000
        ) {
          resetBall();
        }
      }

      runtime.particles.forEach(particle => {
        particle.x += particle.vx * delta / 1000;
        particle.y += particle.vy * delta / 1000;
        particle.vx *= 0.96;
        particle.vy *= 0.96;
        particle.life -= delta;
      });
      runtime.particles = runtime.particles.filter(particle => particle.life > 0);

      runtime.ripples.forEach(ripple => {
        ripple.radius += delta * 0.08;
        ripple.life -= delta;
      });
      runtime.ripples = runtime.ripples.filter(ripple => ripple.life > 0);

      if (now - hudAtRef.current > 80) {
        hudAtRef.current = now;
        setHud({
          stage: runtime.stageIndex,
          shots: runtime.shotsLeft,
          score: runtime.score,
          combo: runtime.combo,
          seals: runtime.seals.filter(seal => seal.active).length,
          rescued: runtime.rescued,
          portal: runtime.portalOpen,
          pulse: runtime.pulseLeft,
          rolling: runtime.mode === 'rolling',
          stars: runtime.stageStars,
          totalStars: stage.stars.length,
          bloom: runtime.bloom,
          blooms: runtime.blooms
        });
      }

      if (runtime.mode === 'transition' && runtime.stageIndex === RESCUES.length - 1) return;
      if (!stage) finishRun('win', runtime);
    };

    const draw = now => {
      const stage = RESCUES[runtime.stageIndex];
      context.clearRect(0, 0, runtime.width, runtime.height);
      drawBackground(now, stage);

      runtime.ripples.forEach(ripple => {
        context.globalAlpha = ripple.life / ripple.maxLife;
        context.strokeStyle = ripple.color;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        context.stroke();
      });
      context.globalAlpha = 1;

      runtime.vortices.forEach((vortex, index) => drawVortex(vortex, index, now));
      runtime.drains.forEach(drain => drawDrain(drain, now));
      runtime.assists.forEach(assist => drawAssist(assist, now));
      runtime.bumpers.forEach((bumper, index) => drawBumper(bumper, index, now, stage.palette[2]));
      runtime.walls.forEach(wall => drawWall(wall));
      runtime.stars.forEach(star => {
        if (!star.active) return;
        drawStar(star.body.position.x, star.body.position.y, 10 + Math.sin(now / 180) * 1.2, '#f2c752', now / 500);
      });
      runtime.seals.forEach(seal => drawSeal(seal, now));
      drawPortal(now);
      drawTarget(stage, now);
      drawTrajectory();
      drawBall();

      runtime.particles.forEach(particle => {
        context.globalAlpha = particle.life / particle.maxLife;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;

      if (now < runtime.stageFlashUntil) {
        const alpha = clamp((runtime.stageFlashUntil - now) / 650, 0, 1);
        context.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
        context.fillRect(0, 0, runtime.width, runtime.height);
      }
    };

    let previous = performance.now();
    const frame = now => {
      const delta = Math.min(34, now - previous);
      previous = now;
      if (runtime.mode !== 'finished') {
        update(now, delta);
        draw(now);
        frameRef.current = requestAnimationFrame(frame);
      }
    };

    frameRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimers();
      resizeObserver.disconnect();
      Events.off(engine, 'collisionStart', handleCollisions);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [addParticles, addRipple, finishRun, screen, selectedPet.color, selectedPet.trail]);

  const fireBall = point => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.mode !== 'aiming' || runtime.shotsLeft <= 0) return;
    const dx = point.x - runtime.launcher.x;
    const dy = point.y - runtime.launcher.y;
    const length = Math.hypot(dx, dy);
    if (length < 25) {
      runtime.mode = 'ready';
      runtime.aiming = null;
      return;
    }

    const speed = clamp(length / 20, 8.5, 17) * selectedPet.power;
    const ball = Bodies.circle(runtime.launcher.x, runtime.launcher.y, 22, {
      restitution: selectedPet.restitution,
      friction: 0,
      frictionAir: 0.005,
      density: 0.002,
      label: 'ball'
    });
    Body.setVelocity(ball, {
      x: dx / length * speed,
      y: dy / length * speed
    });
    Composite.add(runtime.engine.world, ball);
    runtime.ball = ball;
    runtime.mode = 'rolling';
    runtime.rollStartedAt = performance.now();
    if (!runtime.portalOpen) runtime.shotsLeft -= 1;
    runtime.aiming = null;
    runtime.pointer = null;
    runtime.pulseLeft = selectedPet.pulseCharges;
    runtime.combo = 0;
    runtime.bloom = 0;
    runtime.assists.forEach(assist => {
      assist.active = true;
    });
  };

  const pulseBall = point => {
    const runtime = runtimeRef.current;
    if (!runtime?.ball || runtime.mode !== 'rolling' || runtime.pulseLeft <= 0) return;
    const dx = point.x - runtime.ball.position.x;
    const dy = point.y - runtime.ball.position.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const position = runtime.ball.position;

    if (runtime.petId === 'huoshen') {
      runtime.seals.forEach((seal, index) => {
        if (seal.active && Math.hypot(seal.body.position.x - position.x, seal.body.position.y - position.y) <= 112) {
          // 烈焰爆破无视护盾，直接击碎范围内所有封印
          runtime.breakSeal(index, { force: true });
        }
      });
      runtime.stars.forEach((star, index) => {
        if (star.active && Math.hypot(star.body.position.x - position.x, star.body.position.y - position.y) <= 112) {
          runtime.collectStar(index);
        }
      });
      Body.setVelocity(runtime.ball, {
        x: runtime.ball.velocity.x * 1.18,
        y: runtime.ball.velocity.y * 1.18
      });
      addRipple(runtime, position.x, position.y, '#ef754b', 34);
      addParticles(runtime, position.x, position.y, '#ffd28b', 34, 150);
    }

    if (runtime.petId === 'shuiling') {
      Body.setVelocity(runtime.ball, {
        x: runtime.ball.velocity.x + dx / length * 6.6,
        y: runtime.ball.velocity.y + dy / length * 6.6
      });
      addRipple(runtime, position.x, position.y, '#55a9d6', 20);
      addParticles(runtime, position.x, position.y, '#bdeeff', 18, 90);
    }

    if (runtime.petId === 'molimao') {
      const speed = clamp(runtime.ball.speed, 9, 15);
      Body.setVelocity(runtime.ball, {
        x: dx / length * speed,
        y: dy / length * speed
      });
      addRipple(runtime, position.x, position.y, '#70a967', 18);
      addParticles(runtime, position.x, position.y, '#d7ed9b', 14, 70);
    }

    runtime.pulseLeft -= 1;
  };

  const handlePointerDown = event => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.mode === 'transition') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    runtime.pointer = {
      id: event.pointerId,
      startX: point.x,
      startY: point.y,
      point
    };
    if (runtime.mode === 'ready') {
      runtime.mode = 'aiming';
      runtime.aiming = point;
    }
    canvasRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = event => {
    const runtime = runtimeRef.current;
    if (!runtime?.pointer || runtime.pointer.id !== event.pointerId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    runtime.pointer.point = point;
    if (runtime.mode === 'aiming') runtime.aiming = point;
  };

  const handlePointerUp = event => {
    const runtime = runtimeRef.current;
    if (!runtime?.pointer || runtime.pointer.id !== event.pointerId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const moved = Math.hypot(point.x - runtime.pointer.startX, point.y - runtime.pointer.startY);
    if (runtime.mode === 'aiming') fireBall(point);
    else if (runtime.mode === 'rolling' && moved < 18) pulseBall(point);
    runtime.pointer = null;
  };

  const resetShot = () => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.mode !== 'rolling') return;
    Composite.remove(runtime.engine.world, runtime.ball);
    runtime.ball = null;
    runtime.trail = [];
    runtime.pulseLeft = PETS[runtime.petId].pulseCharges;
    if (runtime.portalOpen) runtime.shotsLeft = Math.max(runtime.shotsLeft, 1);
    runtime.mode = runtime.shotsLeft > 0 ? 'ready' : 'finished';
    if (runtime.shotsLeft <= 0 && !runtime.portalOpen) finishRun('lose', runtime);
  };

  const goBack = () => {
    cancelAnimationFrame(frameRef.current);
    onGoBack();
  };

  if (screen === 'select') {
    return (
      <div className="pinball pinball-select">
        <header className="pinball-select-header">
          <button type="button" onClick={goBack} aria-label="返回大厅"><ArrowLeft size={20} /></button>
          <div>
            <span>三座庭院 · 三次救援</span>
            <h1>精灵弹珠救援</h1>
          </div>
          {bestScore > 0 && (
            <div className="pinball-best" title="历史最高分">
              <Sparkles size={14} />
              <b>{bestScore}</b>
            </div>
          )}
        </header>

        <main className="pinball-select-main">
          <div className="pinball-route">
            {RESCUES.map((rescue, index) => (
              <React.Fragment key={rescue.id}>
                <div>
                  <img src={rescue.image} alt={rescue.name} />
                  <span>{rescue.name}</span>
                </div>
                {index < RESCUES.length - 1 && <i />}
              </React.Fragment>
            ))}
          </div>

          <section>
            <div className="pinball-section-title"><span>01</span><h2>选择精灵弹珠</h2></div>
            <div className="pinball-pets">
              {Object.values(PETS).map(pet => (
                <button
                  type="button"
                  key={pet.id}
                  className={selectedPetId === pet.id ? 'selected' : ''}
                  onClick={() => setSelectedPetId(pet.id)}
                >
                  <div><img src={pet.image} alt={pet.name} /></div>
                  <strong>{pet.name}</strong>
                  <span>{pet.text} · {pet.pulseCharges}次</span>
                  <small>{pet.abilityText}</small>
                </button>
              ))}
            </div>
          </section>

          <button type="button" className="pinball-start" onClick={startGame}>
            <Play size={18} fill="currentColor" />
            <span>开始救援</span>
          </button>
        </main>
      </div>
    );
  }

  if (screen === 'result') {
    const won = result === 'win';
    return (
      <div className={`pinball pinball-result ${won ? 'win' : 'lose'}`}>
        <main>
          <div className="pinball-result-crew">
            {RESCUES.map(rescue => <img key={rescue.id} src={rescue.image} alt={rescue.name} />)}
          </div>
          <span>{won ? '全部救出' : '救援记录'}</span>
          <h1>{won ? '三座庭院重新亮起来了' : '换个角度再来一次'}</h1>
          {isNewBest && <div className="pinball-newbest">🎉 刷新最高分！</div>}
          <div className="pinball-result-stats">
            <div><strong>{resultStats.score}</strong><span>得分</span></div>
            <div><strong>{resultStats.maxCombo}</strong><span>最高连击</span></div>
            <div><strong>{resultStats.stars}</strong><span>星光</span></div>
            <div><strong>{bestScore}</strong><span>最高分</span></div>
          </div>
          <div className="pinball-result-actions">
            <button type="button" onClick={startGame}>再次挑战</button>
            <button type="button" onClick={() => setScreen('select')}>更换精灵</button>
            <button type="button" onClick={goBack}>返回大厅</button>
          </div>
        </main>
      </div>
    );
  }

  const stage = RESCUES[hud.stage];

  return (
    <div className="pinball pinball-game">
      <header className="pinball-hud">
        <button type="button" onClick={goBack} aria-label="返回大厅"><ArrowLeft size={20} /></button>
        <div className="pinball-stage-route">
          {RESCUES.map((rescue, index) => (
            <React.Fragment key={rescue.id}>
              <div className={index < hud.stage ? 'done' : index === hud.stage ? 'current' : ''}>
                <img src={rescue.image} alt={rescue.name} />
              </div>
              {index < RESCUES.length - 1 && <i className={index < hud.stage ? 'done' : ''} />}
            </React.Fragment>
          ))}
        </div>
        <button
          type="button"
          className="pinball-recall"
          onClick={resetShot}
          disabled={!hud.rolling}
          aria-label="提前收回本球"
        >
          <CircleStop size={17} />
          <span>收回</span>
        </button>
      </header>

      <div className="pinball-scorebar">
        <div><strong>{hud.score}</strong><span>SCORE</span></div>
        <div className="pinball-objective">
          <span className="crystal">◆</span>
          <strong>{hud.seals}</strong>
          <b>→</b>
          <i className={hud.rescued ? 'done' : ''}><img src={stage.image} alt="" /></i>
          <b>→</b>
          <span className={`lotus ${hud.portal ? 'open' : ''}`}>✿</span>
        </div>
        <div><strong>{hud.combo}</strong><span>COMBO</span></div>
      </div>

      <div className="pinball-board">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div className="pinball-stage-card">
          <span>第 {hud.stage + 1} 庭</span>
          <strong>{stage.stageName}</strong>
          <small>{stage.stageFeature}</small>
        </div>
        <div className="pinball-challenges">
          <div className={hud.stars === hud.totalStars ? 'complete' : ''}>
            <span>★</span>
            <strong>{hud.stars}/{hud.totalStars}</strong>
          </div>
          <div className={hud.blooms > 0 ? 'complete' : ''}>
            <Flower2 size={13} />
            <span>{[0, 1, 2].map(index => <i key={index} className={index < hud.bloom ? 'active' : ''} />)}</span>
          </div>
        </div>
        <div className="pinball-shots">
          {Array.from({ length: stage.shots }, (_, index) => <i key={index} className={index < hud.shots ? 'active' : ''} />)}
        </div>
        <div className={`pinball-ability ${hud.pulse > 0 && hud.rolling ? 'ready' : ''}`}>
          <Sparkles size={15} />
          <div><strong>{selectedPet.ability}</strong><span>飞行中点场地</span></div>
          <b>×{hud.pulse}</b>
        </div>
        {showGuide && (
          <div className="pinball-guide">
            <div>
              <span>救援目标</span>
              <h2>救出三位伙伴</h2>
              <div className="pinball-guide-steps">
                <section>
                  <Hand size={24} />
                  <strong>拖动精灵</strong>
                  <p>瞄准后松手发射</p>
                </section>
                <section>
                  <Gem size={24} />
                  <strong>清空封印</strong>
                  <p>再撞到泡泡伙伴</p>
                </section>
                <section>
                  <Flower2 size={24} />
                  <strong>进入莲花</strong>
                  <p>通过三座庭院获胜</p>
                </section>
              </div>
              <div className="pinball-guide-power">
                <img src={selectedPet.image} alt={selectedPet.name} />
                <div><strong>{selectedPet.ability}</strong><span>{selectedPet.abilityText}</span></div>
              </div>
              <button type="button" onClick={() => setShowGuide(false)}>开始第一关</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RockGrassBadgeGame;
