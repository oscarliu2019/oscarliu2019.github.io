import React, { useEffect, useMemo, useRef, useState } from 'react';
import './DetectiveGame.css';
import {
  generateCase,
  evaluateExpression
} from './detectiveEngine';

const NOTE_STATES = ['neutral', 'trusted', 'suspicious'];
const NOTE_LABELS = {
  neutral: '未判断',
  trusted: '暂可信',
  suspicious: '重点怀疑'
};

const formatTime = seconds => {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining < 10 ? '0' : ''}${remaining}`;
};

const readStoredNumber = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeStoredNumber = (key, value) => {
  try {
    window.localStorage.setItem(key, String(value));
  } catch (error) {
    // Storage can be unavailable in privacy mode; gameplay still works without it.
  }
};

const statementNumber = statementId => Number(statementId.split('-')[1]);

const deriveRoomStatuses = (suspects, rooms, roomMarks) => {
  const assignments = [];
  const assignRooms = (suspectIndex, usedRooms, locations) => {
    if (suspectIndex === suspects.length) {
      assignments.push({ ...locations });
      return;
    }

    const suspect = suspects[suspectIndex];
    for (const room of rooms) {
      const key = `${suspect.id}:${room}`;
      if (usedRooms.has(room) || roomMarks[key]) continue;
      usedRooms.add(room);
      locations[suspect.id] = room;
      assignRooms(suspectIndex + 1, usedRooms, locations);
      usedRooms.delete(room);
    }
  };

  assignRooms(0, new Set(), {});

  const statuses = {};
  suspects.forEach(suspect => {
    rooms.forEach(room => {
      const key = `${suspect.id}:${room}`;
      if (roomMarks[key]) {
        statuses[key] = 'manual-eliminated';
        return;
      }
      const matchingAssignments = assignments.filter(
        locations => locations[suspect.id] === room
      ).length;
      if (matchingAssignments === 0 && assignments.length > 0) {
        statuses[key] = 'inferred-eliminated';
      } else if (matchingAssignments === assignments.length && assignments.length > 0) {
        statuses[key] = 'confirmed';
      } else {
        statuses[key] = 'possible';
      }
    });
  });

  return statuses;
};

function DetectiveGame({ onGoBack }) {
  const [difficultyId, setDifficultyId] = useState('easy');
  const [caseData, setCaseData] = useState(() => generateCase('easy'));
  const [selectedSuspectId, setSelectedSuspectId] = useState(null);
  const [notes, setNotes] = useState({});
  const [roomMarks, setRoomMarks] = useState({});
  const [ruledOutIds, setRuledOutIds] = useState([]);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [hintMessage, setHintMessage] = useState('');
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const startedAtRef = useRef(Date.now());
  const nextCaseButtonRef = useRef(null);

  useEffect(() => {
    setBestStreak(readStoredNumber('detectiveBestStreak_easy', 0));
    setBestTime(readStoredNumber('detectiveBestTime_easy', null));
  }, []);

  useEffect(() => {
    if (result || !caseData) return undefined;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [result, caseData]);

  useEffect(() => {
    if (result) nextCaseButtonRef.current?.focus();
  }, [result]);

  const effectiveTime = elapsed + (difficultyId === 'hard' ? hintCount * 30 : 0);
  const roomStatuses = useMemo(
    () => caseData ? deriveRoomStatuses(caseData.suspects, caseData.roomNames, roomMarks) : {},
    [caseData, roomMarks]
  );

  const loadCase = nextDifficultyId => {
    if (nextDifficultyId !== difficultyId) {
      setStreak(0);
      setBestStreak(readStoredNumber(`detectiveBestStreak_${nextDifficultyId}`, 0));
      setBestTime(readStoredNumber(`detectiveBestTime_${nextDifficultyId}`, null));
    }
    setDifficultyId(nextDifficultyId);
    setCaseData(generateCase(nextDifficultyId));
    setSelectedSuspectId(null);
    setNotes({});
    setRoomMarks({});
    setRuledOutIds([]);
    setMistakeCount(0);
    setHintCount(0);
    setHintMessage('');
    setResult(null);
    setElapsed(0);
    startedAtRef.current = Date.now();
  };

  const startNewCase = () => loadCase(difficultyId);

  const cycleNote = suspectId => {
    setNotes(previous => {
      const current = previous[suspectId] || 'neutral';
      const nextIndex = (NOTE_STATES.indexOf(current) + 1) % NOTE_STATES.length;
      return { ...previous, [suspectId]: NOTE_STATES[nextIndex] };
    });
  };

  const toggleRoomMark = (suspectId, roomName) => {
    const key = `${suspectId}:${roomName}`;
    setRoomMarks(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const useHint = () => {
    if (hintCount >= 2 || result) return;
    if (difficultyId === 'easy') {
      if (hintCount === 0) {
        const elimination = caseData.eliminations.find(
          item => !ruledOutIds.includes(item.suspectId)
        );
        if (elimination) {
          const suspect = caseData.suspects.find(entry => entry.id === elimination.suspectId);
          setRuledOutIds(ids => [...ids, suspect.id]);
          setHintMessage(
            `可以排除 ${suspect.name}：假设 TA 是犯人，证词 ${elimination.statementIds
              .map(id => `#${statementNumber(id)}`)
              .join('、')} 会与现场物证及地点规则产生矛盾。`
          );
        } else {
          const culprit = caseData.suspects.find(suspect => suspect.id === caseData.culpritId);
          setHintMessage(`结合已经排除的人选，答案只剩下 ${culprit.name}。`);
        }
      } else {
        const partner = caseData.suspects.find(
          suspect => suspect.id !== caseData.culpritId && !ruledOutIds.includes(suspect.id)
        );
        const pairIds = partner
          ? [caseData.culpritId, partner.id]
          : [caseData.culpritId];
        setRuledOutIds(
          caseData.suspects
            .filter(suspect => !pairIds.includes(suspect.id))
            .map(suspect => suspect.id)
        );
        const pair = caseData.suspects.filter(suspect => pairIds.includes(suspect.id));
        setHintMessage(
          pair.length === 2
            ? `答案已经缩小到 ${pair[0].name} 和 ${pair[1].name} 之间。`
            : `结合已经排除的人选，答案只剩下 ${pair[0].name}。`
        );
      }
      setSelectedSuspectId(null);
      setHintCount(count => count + 1);
      return;
    }
    if (hintCount === 0) {
      const proof = caseData.proofSets[0];
      setHintMessage(`关键提示：证词 #${statementNumber(proof[0])} 属于完整推理链。`);
    } else {
      const innocent = caseData.suspects.find(suspect => suspect.id !== caseData.culpritId);
      setHintMessage(`进一步提示：${innocent.name} 的证词可以信任。`);
    }
    setHintCount(count => count + 1);
  };

  const accuse = () => {
    if (!selectedSuspectId || result) return;
    const usedTime = Math.floor((Date.now() - startedAtRef.current) / 1000) +
      (difficultyId === 'hard' ? hintCount * 30 : 0);
    const correct = selectedSuspectId === caseData.culpritId;

    if (!correct && difficultyId === 'easy') {
      const accusedSuspect = caseData.suspects.find(
        suspect => suspect.id === selectedSuspectId
      );
      setRuledOutIds(ids => [...new Set([...ids, selectedSuspectId])]);
      setNotes(previous => ({ ...previous, [selectedSuspectId]: 'trusted' }));
      setStreak(0);
      setMistakeCount(count => count + 1);
      setSelectedSuspectId(null);
      setHintMessage(`${accusedSuspect.name} 可以排除，继续调查其他嫌疑人。`);
      return;
    }

    if (correct) {
      const nextStreak = mistakeCount === 0 ? streak + 1 : 0;
      setStreak(nextStreak);
      if (mistakeCount === 0 && nextStreak > bestStreak) {
        setBestStreak(nextStreak);
        writeStoredNumber(`detectiveBestStreak_${difficultyId}`, nextStreak);
      }
      if (mistakeCount === 0 && (bestTime === null || usedTime < bestTime)) {
        setBestTime(usedTime);
        writeStoredNumber(`detectiveBestTime_${difficultyId}`, usedTime);
      }
    } else {
      setStreak(0);
    }
    setResult({ correct, accusedId: selectedSuspectId, usedTime });
  };

  if (!caseData) {
    return (
      <main className="detective-page detective-error-page">
        <section className="detective-error">
          <h1>案件档案损坏</h1>
          <p>这次没有生成出满足深度要求的案件，请重新整理档案。</p>
          <div>
            <button type="button" onClick={startNewCase}>重新生成</button>
            <button type="button" onClick={onGoBack}>返回大厅</button>
          </div>
        </section>
      </main>
    );
  }

  const culprit = caseData.suspects.find(suspect => suspect.id === caseData.culpritId);
  const accused = result
    ? caseData.suspects.find(suspect => suspect.id === result.accusedId)
    : null;

  if (result) {
    const proofIds = caseData.proofSets[0];
    return (
      <main className={`detective-page detective-result-page ${result.correct ? 'win' : 'lose'}`}>
        <section className="detective-result-panel" aria-labelledby="detective-result-title">
          <div className="detective-result-mark">{result.correct ? '案件已破' : '推理失误'}</div>
          <img src={culprit.image} alt={culprit.name} className="detective-result-avatar" />
          <h1 id="detective-result-title">{result.correct ? '真相只有一个' : '你指认错了'}</h1>
          <p className="detective-verdict">
            {result.correct
              ? `${culprit.name}就是唯一说谎的人。`
              : `${accused.name}是无辜的，真正的犯人是 ${culprit.name}。`}
          </p>

          <section className="detective-solution">
            <h2>完整推理复盘</h2>
            <p>
              本案至少需要 {caseData.proofDepth} 条证词。可成立的关键证据链是：
              {' '}{proofIds.map(id => `#${statementNumber(id)}`).join('、')}。
            </p>
            <h3>一、先确认现场物证</h3>
            <ol className="detective-objective-review">
              {caseData.objectiveClues.map((clue, index) => (
                <li key={clue.id}>物证 {index + 1}：{clue.text}</li>
              ))}
            </ol>

            <h3>二、逐条核对关键证词</h3>
            <div className="detective-proof-list">
              {proofIds.map(statementId => {
                const suspect = caseData.suspects.find(
                  entry => entry.statement.id === statementId
                );
                const isTrue = evaluateExpression(
                  suspect.statement.expression,
                  caseData.actualLocations,
                  caseData.culpritId
                );
                return (
                  <article key={suspect.id}>
                    <div>
                      <span className={isTrue ? 'truth' : 'lie'}>{isTrue ? '真' : '假'}</span>
                      <b>证词 #{statementNumber(suspect.statement.id)} · {suspect.name}</b>
                    </div>
                    <blockquote>“{suspect.statement.text}”</blockquote>
                    <p>
                      在正确假设中，{suspect.name}{isTrue
                        ? '不是犯人，所以这句话必须成立。'
                        : '是真凶，所以这句话必须为假。'}
                    </p>
                  </article>
                );
              })}
            </div>

            <h3>三、还原唯一地点分布</h3>
            <div className="detective-location-solution">
              {caseData.suspects.map(suspect => (
                <div key={suspect.id}>
                  <img src={suspect.image} alt="" />
                  <b>{suspect.name}</b>
                  <span>{caseData.roomLabels[caseData.actualLocations[suspect.id]]}</span>
                  {suspect.id === caseData.culpritId && <em>真凶</em>}
                </div>
              ))}
            </div>

            <h3>四、逐一排除错误嫌疑人</h3>
            <div className="detective-eliminations">
              {caseData.eliminations.map(item => {
                const suspect = caseData.suspects.find(entry => entry.id === item.suspectId);
                return (
                  <details key={item.suspectId}>
                    <summary>排除 {suspect.name}</summary>
                    <p>
                      先假设 <b>{suspect.name}</b> 是真凶：TA 必须位于
                      {caseData.sceneLabel}，TA 的证词必须为假，其他人的证词必须为真。
                    </p>
                    <ul>
                      {item.statementIds.map(statementId => {
                        const owner = caseData.suspects.find(
                          entry => entry.statement.id === statementId
                        );
                        const expectedTruth = owner.id !== suspect.id;
                        return (
                          <li key={statementId}>
                            <b>
                              #{statementNumber(statementId)} {owner.name}
                              （应为{expectedTruth ? '真' : '假'}）
                            </b>
                            ：“{owner.statement.text}”
                          </li>
                        );
                      })}
                    </ul>
                    <p>
                      将这些具体证词与{caseData.objectiveClues.length}条现场物证、
                      {caseData.suspects.length}人地点互不重复的规则一起代入，
                      不存在任何合法地点安排。因此 {suspect.name} 不可能是真凶。
                    </p>
                  </details>
                );
              })}
            </div>
            <p className="detective-conclusion">
              其余{caseData.suspects.length - 1}种假设全部产生矛盾；只有假设
              <b>{culprit.name}</b> 是真凶时，
              所有物证、地点和证词真假能够同时成立，所以答案唯一。
            </p>
          </section>

          <div className="detective-result-stats">
            <div><strong>{formatTime(result.usedTime)}</strong><span>本案用时</span></div>
            <div><strong>{hintCount}</strong><span>使用提示</span></div>
            <div><strong>{streak}</strong><span>当前连胜</span></div>
          </div>
          <div className="detective-result-actions">
            <button ref={nextCaseButtonRef} type="button" className="btn-next" onClick={startNewCase}>
              下一宗案件
            </button>
            <button type="button" className="btn-home" onClick={onGoBack}>返回大厅</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="detective-page">
      <header className="detective-header">
        <div className="detective-nav-row">
          <button type="button" className="detective-back" onClick={onGoBack}>← 返回大厅</button>
          <div className="detective-scoreboard" aria-label="本局记录">
            <div><strong>{streak}</strong><span>连胜</span></div>
            <div><strong>{formatTime(effectiveTime)}</strong><span>用时</span></div>
          </div>
        </div>
        <div className="detective-title">
          <span>
            调查档案 · 推理深度 {caseData.proofDepth}/{difficultyId === 'easy' ? 3 : 5}
          </span>
          <h1>{caseData.caseInfo.emoji} {caseData.caseInfo.title}</h1>
        </div>
        <div className="detective-difficulty" aria-label="游戏难度">
          <button
            type="button"
            className={difficultyId === 'easy' ? 'active' : ''}
            disabled={difficultyId === 'easy'}
            onClick={() => loadCase('easy')}
          >
            轻松模式
          </button>
          <button
            type="button"
            className={difficultyId === 'hard' ? 'active' : ''}
            disabled={difficultyId === 'hard'}
            onClick={() => loadCase('hard')}
          >
            困难模式
          </button>
        </div>
      </header>

      <div className="detective-records">
        <span>最长连胜 <b>{bestStreak}</b></span>
        <span>最快破案 <b>{bestTime === null ? '--' : formatTime(bestTime)}</b></span>
        <span>
          {difficultyId === 'easy'
            ? <><b>不计罚时</b> 提示</>
            : <>提示惩罚 <b>+{hintCount * 30}s</b></>}
        </span>
      </div>

      <section className="detective-brief">
        <p>
          {caseData.caseInfo.emoji}{caseData.caseInfo.item}在
          <b>{caseData.sceneLabel}</b>失窃。{caseData.suspects.length}名嫌疑人分别待在
          {caseData.roomNames.length}个不同地点，
          <b>只有真凶的证词是假的</b>。
        </p>
        <div className="detective-room-list" aria-label="本案地点">
          {caseData.roomNames.map(room => <span key={room}>{caseData.roomLabels[room]}</span>)}
        </div>
        <div className="detective-objective-clues">
          <strong>现场物证</strong>
          <ol>
            {caseData.objectiveClues.map(clue => <li key={clue.id}>{clue.text}</li>)}
          </ol>
        </div>
      </section>

      <section className="detective-instructions" aria-label="破案步骤">
        <span><b>1</b> 阅读证词</span>
        <span><b>2</b> 填写手册</span>
        <span><b>3</b> 选择嫌疑人</span>
        <span><b>4</b> 正式指认</span>
      </section>

      <section className="detective-suspects" aria-label="嫌疑人证词">
        {caseData.suspects.map(suspect => {
          const selected = selectedSuspectId === suspect.id;
          const note = notes[suspect.id] || 'neutral';
          const ruledOut = ruledOutIds.includes(suspect.id);
          return (
            <article
              key={suspect.id}
              className={`detective-card ${selected ? 'selected' : ''} ${ruledOut ? 'ruled-out' : ''}`}
            >
              <div className="detective-card-top">
                <img src={suspect.image} alt="" />
                <div>
                  <span className="detective-statement-number">
                    证词 #{statementNumber(suspect.statement.id)}
                  </span>
                  <h2>{suspect.name}</h2>
                </div>
                <button
                  type="button"
                  className={`detective-note ${note}`}
                  onClick={() => cycleNote(suspect.id)}
                  aria-label={`${suspect.name}：${NOTE_LABELS[note]}，点击切换标记`}
                >
                  {NOTE_LABELS[note]}
                </button>
              </div>
              <blockquote>“{suspect.statement.text}”</blockquote>
              <div className="detective-card-actions">
                <button
                  type="button"
                  className={`btn-suspect ${selected ? 'active' : ''}`}
                  aria-pressed={selected}
                  disabled={ruledOut}
                  onClick={() => setSelectedSuspectId(selected ? null : suspect.id)}
                >
                  {ruledOut ? '已排除' : selected ? '当前指认对象' : '列为嫌疑人'}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <details className="detective-notebook">
        <summary>打开推理手册：标记不可能的地点</summary>
        <p>点格子标记“此人不在这里”，手册会自动补全由这些标记确定的地点。</p>
        <div className="detective-grid-scroll">
          <div
            className="detective-logic-grid"
            style={{ '--detective-room-count': caseData.roomNames.length }}
          >
            <div className="grid-corner">嫌疑人</div>
            {caseData.roomNames.map(room => (
              <div className="grid-room" key={room}>{caseData.roomLabels[room]}</div>
            ))}
            {caseData.suspects.map(suspect => (
              <React.Fragment key={suspect.id}>
                <div className="grid-person">{suspect.name}</div>
                {caseData.roomNames.map(room => {
                  const key = `${suspect.id}:${room}`;
                  const status = roomStatuses[key];
                  const eliminated = status.includes('eliminated');
                  return (
                    <button
                      type="button"
                      key={key}
                      className={eliminated ? 'eliminated' : status}
                      disabled={status === 'confirmed' || status === 'inferred-eliminated'}
                      aria-pressed={eliminated}
                      aria-label={`${suspect.name}${
                        status === 'confirmed' ? '确定在' : eliminated ? '不在' : '可能在'
                      }${room}`}
                      onClick={() => toggleRoomMark(suspect.id, room)}
                    >
                      {status === 'confirmed' ? '✓' : eliminated ? '×' : '·'}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </details>

      <section className="detective-hints">
        <button type="button" onClick={useHint} disabled={hintCount >= 2}>
          使用提示（剩余 {2 - hintCount} 次
          {difficultyId === 'hard' ? '，每次 +30 秒' : '，不计罚时'}）
        </button>
        {hintMessage && <p role="status">{hintMessage}</p>}
      </section>

      <section className="detective-actionbar" aria-label="正式指认">
        <div>
          <span>{difficultyId === 'easy' ? '指认错误可继续调查' : '本案只有一次指认机会'}</span>
          <span>
            指认对象 <b>{selectedSuspectId
              ? caseData.suspects.find(suspect => suspect.id === selectedSuspectId)?.name
              : '未选择'}</b>
          </span>
        </div>
        <button
          type="button"
          className="btn-final-accuse"
          onClick={accuse}
          disabled={!selectedSuspectId}
        >
          正式指认
        </button>
      </section>
    </main>
  );
}

export default DetectiveGame;
