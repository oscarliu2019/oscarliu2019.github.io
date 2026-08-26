export const CHARACTERS = [
  { id: 'jiyi', name: '吉伊', image: process.env.PUBLIC_URL + '/images/duiduipeng/吉伊.avif' },
  { id: 'xiaoba', name: '小八', image: process.env.PUBLIC_URL + '/images/duiduipeng/小八.avif' },
  { id: 'wusaji', name: '乌萨奇', image: process.env.PUBLIC_URL + '/images/duiduipeng/乌萨奇.avif' },
  { id: 'lizi', name: '栗子', image: process.env.PUBLIC_URL + '/images/duiduipeng/栗子.avif' },
  { id: 'shifu', name: '师傅', image: process.env.PUBLIC_URL + '/images/duiduipeng/师傅.avif' },
  { id: 'shisa', name: '狮萨', image: process.env.PUBLIC_URL + '/images/duiduipeng/狮萨.avif' },
  { id: 'feishu', name: '飞鼠', image: process.env.PUBLIC_URL + '/images/duiduipeng/飞鼠.avif' },
  { id: 'guben', name: '古本', image: process.env.PUBLIC_URL + '/images/duiduipeng/古本.avif' },
  { id: 'shougongkai', name: '手工铠', image: process.env.PUBLIC_URL + '/images/duiduipeng/手工铠.png' }
];

export const ROOMS = [
  { name: '厨房', emoji: '🍳' },
  { name: '花园', emoji: '🌷' },
  { name: '城堡', emoji: '🏰' },
  { name: '河边', emoji: '🌊' },
  { name: '杂货店', emoji: '🏪' },
  { name: '森林', emoji: '🌲' },
  { name: '钟楼', emoji: '🕰️' }
];

const CASES = [
  { title: '布丁失踪案', item: '布丁', emoji: '🍮' },
  { title: '拉面被偷吃案', item: '那碗热拉面', emoji: '🍜' },
  { title: '讨伐报酬不见了', item: '讨伐报酬', emoji: '💰' },
  { title: '星星勋章失窃案', item: '星星勋章', emoji: '⭐' },
  { title: '手工材料失窃案', item: '珍贵的手工材料', emoji: '🧵' },
  { title: '烤红薯不翼而飞', item: '香喷喷的烤红薯', emoji: '🍠' },
  { title: '限定果酱失踪案', item: '限量草莓果酱', emoji: '🍓' }
];

const MAX_GENERATION_ATTEMPTS = 4000;

export const DIFFICULTIES = {
  easy: {
    suspectCount: 4,
    objectiveClueCount: 2,
    minProofDepth: 2,
    maxProofDepth: 3,
    simpleStatementRate: 0.7,
    simpleObjectiveRate: 0.82,
    minCompoundCount: 0,
    maxCompoundCount: 2,
    minKindCount: 1,
    maxHardOperatorCount: 1
  },
  hard: {
    suspectCount: 5,
    objectiveClueCount: 3,
    minProofDepth: 4,
    maxProofDepth: 5,
    simpleStatementRate: 0.34,
    simpleObjectiveRate: 0.55,
    minCompoundCount: 2,
    maxCompoundCount: 5,
    minKindCount: 3,
    maxHardOperatorCount: 5
  }
};

const shuffle = array => {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const randomItem = array => array[Math.floor(Math.random() * array.length)];

const permutations = array => {
  if (array.length <= 1) return [array];
  const result = [];
  array.forEach((value, index) => {
    const rest = [...array.slice(0, index), ...array.slice(index + 1)];
    permutations(rest).forEach(permutation => result.push([value, ...permutation]));
  });
  return result;
};

const combinations = (array, size, start = 0, prefix = []) => {
  if (prefix.length === size) return [prefix];
  const result = [];
  for (let index = start; index < array.length; index += 1) {
    result.push(...combinations(array, size, index + 1, [...prefix, array[index]]));
  }
  return result;
};

const atom = (kind, person, room) => ({ kind, person, room });

export const evaluateExpression = (expression, locations, culpritId) => {
  switch (expression.kind) {
    case 'at':
      return locations[expression.person] === expression.room;
    case 'notAt':
      return locations[expression.person] !== expression.room;
    case 'culpritIs':
      return culpritId === expression.person;
    case 'culpritNot':
      return culpritId !== expression.person;
    case 'or':
      return evaluateExpression(expression.left, locations, culpritId) ||
        evaluateExpression(expression.right, locations, culpritId);
    case 'xor':
      return evaluateExpression(expression.left, locations, culpritId) !==
        evaluateExpression(expression.right, locations, culpritId);
    case 'implies':
      return !evaluateExpression(expression.left, locations, culpritId) ||
        evaluateExpression(expression.right, locations, culpritId);
    case 'and':
      return evaluateExpression(expression.left, locations, culpritId) &&
        evaluateExpression(expression.right, locations, culpritId);
    default:
      return false;
  }
};

const describeAtom = (expression, speakerId, names, roomLabels) => {
  const person = expression.person === speakerId ? '我' : names[expression.person];
  switch (expression.kind) {
    case 'at':
      return `${person}当时在${roomLabels[expression.room]}`;
    case 'notAt':
      return `${person}当时不在${roomLabels[expression.room]}`;
    case 'culpritIs':
      return `${names[expression.person]}就是拿走东西的人`;
    case 'culpritNot':
      return `${names[expression.person]}不是拿走东西的人`;
    default:
      return '';
  }
};

export const describeExpression = (expression, speakerId, names, roomLabels) => {
  if (['at', 'notAt', 'culpritIs', 'culpritNot'].includes(expression.kind)) {
    return `${describeAtom(expression, speakerId, names, roomLabels)}。`;
  }

  const left = describeAtom(expression.left, speakerId, names, roomLabels);
  const right = describeAtom(expression.right, speakerId, names, roomLabels);
  switch (expression.kind) {
    case 'or':
      return `${left}，或者${right}；至少有一项成立。`;
    case 'xor':
      return `${left}与${right}之中，恰好一项成立。`;
    case 'implies':
      return `如果${left}，那么${right}。`;
    case 'and':
      return `${left}，而且${right}。`;
    default:
      return '……';
  }
};

const createLocationAtom = (suspectIds, roomNames) => atom(
  Math.random() < 0.46 ? 'at' : 'notAt',
  randomItem(suspectIds),
  randomItem(roomNames)
);

const createSimpleExpression = (suspectIds, roomNames) => {
  if (Math.random() < 0.78) return createLocationAtom(suspectIds, roomNames);
  return {
    kind: Math.random() < 0.82 ? 'culpritNot' : 'culpritIs',
    person: randomItem(suspectIds)
  };
};

const expressionSignature = expression => {
  if (!expression.left) return `${expression.kind}:${expression.person}:${expression.room || ''}`;
  return `${expression.kind}(${expressionSignature(expression.left)},${expressionSignature(expression.right)})`;
};

const createRandomExpression = (suspectIds, roomNames, difficulty) => {
  const roll = Math.random();
  if (roll < difficulty.simpleStatementRate) {
    return createSimpleExpression(suspectIds, roomNames);
  }

  const left = createSimpleExpression(suspectIds, roomNames);
  let right = createSimpleExpression(suspectIds, roomNames);
  if (expressionSignature(left) === expressionSignature(right)) {
    right = createLocationAtom(suspectIds, roomNames);
  }

  const compoundRoll = Math.random();
  const kind = difficulty === DIFFICULTIES.easy
    ? compoundRoll < 0.45
      ? 'or'
      : compoundRoll < 0.8
        ? 'and'
        : compoundRoll < 0.9
          ? 'xor'
          : 'implies'
    : compoundRoll < 0.29
      ? 'or'
      : compoundRoll < 0.58
        ? 'xor'
        : compoundRoll < 0.82
          ? 'implies'
          : 'and';
  return { kind, left, right };
};

const createObjectiveExpression = (suspectIds, roomNames, difficulty) => {
  if (Math.random() < difficulty.simpleObjectiveRate) {
    return createLocationAtom(suspectIds, roomNames);
  }
  const left = createLocationAtom(suspectIds, roomNames);
  let right = createLocationAtom(suspectIds, roomNames);
  if (expressionSignature(left) === expressionSignature(right)) {
    right = createLocationAtom(suspectIds, roomNames);
  }
  return {
    kind: difficulty === DIFFICULTIES.easy || Math.random() < 0.55 ? 'or' : 'xor',
    left,
    right
  };
};

const buildWorlds = (suspectIds, roomNames) => {
  const worlds = [];
  permutations(roomNames).forEach(permutation => {
    const locations = {};
    suspectIds.forEach((id, index) => {
      locations[id] = permutation[index];
    });
    suspectIds.forEach(culpritId => worlds.push({ culpritId, locations }));
  });
  return worlds;
};

const isInformative = (expression, worlds) => {
  let hasTrue = false;
  let hasFalse = false;
  for (const world of worlds) {
    if (evaluateExpression(expression, world.locations, world.culpritId)) hasTrue = true;
    else hasFalse = true;
    if (hasTrue && hasFalse) return true;
  }
  return false;
};

export const solveCase = (caseData, statementIds = null) => {
  const selectedIds = statementIds ? new Set(statementIds) : null;
  const suspectIds = caseData.suspects.map(suspect => suspect.id);
  const solutions = [];

  permutations(caseData.roomNames).forEach(permutation => {
    const locations = {};
    suspectIds.forEach((id, index) => {
      locations[id] = permutation[index];
    });

    suspectIds.forEach(culpritId => {
      if (locations[culpritId] !== caseData.sceneRoom) return;
      const objectiveCluesValid = (caseData.objectiveClues || []).every(clue =>
        evaluateExpression(clue.expression, locations, culpritId)
      );
      if (!objectiveCluesValid) return;
      const valid = caseData.suspects.every(suspect => {
        if (selectedIds && !selectedIds.has(suspect.statement.id)) return true;
        const actual = evaluateExpression(suspect.statement.expression, locations, culpritId);
        return actual === (suspect.id !== culpritId);
      });
      if (valid) solutions.push({ culpritId, locations });
    });
  });

  return solutions;
};

export const getCandidateIds = solutions => [
  ...new Set(solutions.map(solution => solution.culpritId))
];

const findProofSets = caseData => {
  const ids = caseData.suspects.map(suspect => suspect.statement.id);
  for (let size = 1; size <= ids.length; size += 1) {
    const validSets = combinations(ids, size).filter(statementIds => {
      const candidates = getCandidateIds(solveCase(caseData, statementIds));
      return candidates.length === 1 && candidates[0] === caseData.culpritId;
    });
    if (validSets.length > 0) return { depth: size, sets: validSets };
  }
  return { depth: Infinity, sets: [] };
};

const smallestConflict = (caseData, wrongCulpritId) => {
  const ids = caseData.suspects.map(suspect => suspect.statement.id);
  for (let size = 2; size <= ids.length; size += 1) {
    for (const statementIds of combinations(ids, size)) {
      const candidates = getCandidateIds(solveCase(caseData, statementIds));
      if (!candidates.includes(wrongCulpritId)) return statementIds;
    }
  }
  return ids;
};

const buildExpressionForTruth = ({
  desiredTruth,
  actualLocations,
  culpritId,
  suspectIds,
  roomNames,
  worlds,
  usedSignatures,
  difficulty
}) => {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const expression = createRandomExpression(suspectIds, roomNames, difficulty);
    const signature = expressionSignature(expression);
    if (usedSignatures.has(signature) || !isInformative(expression, worlds)) continue;
    if (evaluateExpression(expression, actualLocations, culpritId) !== desiredTruth) continue;
    usedSignatures.add(signature);
    return expression;
  }
  return null;
};

export const generateCase = (difficultyId = 'easy') => {
  const difficulty = DIFFICULTIES[difficultyId];
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const suspects = shuffle(CHARACTERS).slice(0, difficulty.suspectCount);
    const chosenRooms = shuffle(ROOMS).slice(0, difficulty.suspectCount);
    const suspectIds = suspects.map(suspect => suspect.id);
    const roomNames = chosenRooms.map(room => room.name);
    const names = Object.fromEntries(suspects.map(suspect => [suspect.id, suspect.name]));
    const roomLabels = Object.fromEntries(chosenRooms.map(room => [room.name, `${room.emoji}${room.name}`]));

    const actualLocations = {};
    const actualRoomOrder = shuffle(roomNames);
    suspectIds.forEach((id, index) => {
      actualLocations[id] = actualRoomOrder[index];
    });

    const culprit = randomItem(suspects);
    const sceneRoom = actualLocations[culprit.id];
    const worlds = buildWorlds(suspectIds, roomNames);
    const usedSignatures = new Set();
    const statements = [];

    for (const suspect of suspects) {
      const expression = buildExpressionForTruth({
        desiredTruth: suspect.id !== culprit.id,
        actualLocations,
        culpritId: culprit.id,
        suspectIds,
        roomNames,
        worlds,
        usedSignatures,
        difficulty
      });
      if (!expression) break;
      statements.push({
        id: `statement-${statements.length + 1}`,
        expression,
        kind: expression.kind
      });
    }
    if (statements.length !== difficulty.suspectCount) continue;

    const objectiveClues = [];
    for (let index = 0; index < difficulty.objectiveClueCount; index += 1) {
      let expression = null;
      for (let clueAttempt = 0; clueAttempt < 600; clueAttempt += 1) {
        const candidate = createObjectiveExpression(suspectIds, roomNames, difficulty);
        const signature = expressionSignature(candidate);
        if (usedSignatures.has(signature) || !isInformative(candidate, worlds)) continue;
        if (!evaluateExpression(candidate, actualLocations, culprit.id)) continue;
        usedSignatures.add(signature);
        expression = candidate;
        break;
      }
      if (!expression) break;
      objectiveClues.push({
        id: `clue-${index + 1}`,
        expression,
        text: describeExpression(expression, null, names, roomLabels)
      });
    }
    if (objectiveClues.length !== difficulty.objectiveClueCount) continue;

    const compoundCount = statements.filter(statement =>
      ['or', 'xor', 'implies', 'and'].includes(statement.kind)
    ).length;
    const hardOperatorCount = statements.filter(statement =>
      ['xor', 'implies'].includes(statement.kind)
    ).length;
    const kindCount = new Set(statements.map(statement => statement.kind)).size;
    if (
      compoundCount < difficulty.minCompoundCount ||
      compoundCount > difficulty.maxCompoundCount ||
      kindCount < difficulty.minKindCount ||
      hardOperatorCount > difficulty.maxHardOperatorCount
    ) continue;

    const caseInfo = randomItem(CASES);
    const caseData = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      difficultyId,
      caseInfo,
      sceneRoom,
      sceneLabel: roomLabels[sceneRoom],
      roomNames,
      roomLabels,
      culpritId: culprit.id,
      actualLocations,
      objectiveClues,
      suspects: suspects.map((suspect, index) => ({
        ...suspect,
        statement: {
          ...statements[index],
          text: describeExpression(statements[index].expression, suspect.id, names, roomLabels)
        }
      }))
    };

    const fullSolutions = solveCase(caseData);
    const candidates = getCandidateIds(fullSolutions);
    if (
      fullSolutions.length !== 1 ||
      candidates.length !== 1 ||
      candidates[0] !== culprit.id
    ) continue;

    const proof = findProofSets(caseData);
    if (
      proof.depth < difficulty.minProofDepth ||
      proof.depth > difficulty.maxProofDepth
    ) continue;

    caseData.proofDepth = proof.depth;
    caseData.proofSets = proof.sets;
    caseData.eliminations = suspects
      .filter(suspect => suspect.id !== culprit.id)
      .map(suspect => ({
        suspectId: suspect.id,
        statementIds: smallestConflict(caseData, suspect.id)
      }));
    return caseData;
  }

  return null;
};
