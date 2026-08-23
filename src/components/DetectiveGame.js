import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function DetectiveGame({ onGoBack }) {
  const [caseData, setCaseData] = useState(() => generateCase());
  const [selectedSuspectId, setSelectedSuspectId] = useState(null);
  const [notes, setNotes] = useState({});
  const [roomMarks, setRoomMarks] = useState({});
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
    setBestStreak(readStoredNumber('detectiveBestStreak', 0));
    setBestTime(readStoredNumber('detectiveBestTime', null));
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

  const effectiveTime = elapsed + hintCount * 30;

  const startNewCase = useCallback(() => {
    setCaseData(generateCase());
    setSelectedSuspectId(null);
    setNotes({});
    setRoomMarks({});
    setHintCount(0);
    setHintMessage('');
    setResult(null);
    setElapsed(0);
    startedAtRef.current = Date.now();
  }, []);

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
    const usedTime = Math.floor((Date.now() - startedAtRef.current) / 1000) + hintCount * 30;
    const correct = selectedSuspectId === caseData.culpritId;

    if (correct) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak);
        writeStoredNumber('detectiveBestStreak', nextStreak);
      }
      if (bestTime === null || usedTime < bestTime) {
        setBestTime(usedTime);
        writeStoredNumber('detectiveBestTime', usedTime);
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
                      将这些具体证词与三条现场物证、五人地点互不重复的规则一起代入，
                      不存在任何合法地点安排。因此 {suspect.name} 不可能是真凶。
                    </p>
                  </details>
                );
              })}
            </div>
            <p className="detective-conclusion">
              其余四种假设全部产生矛盾；只有假设 <b>{culprit.name}</b> 是真凶时，
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
          <span>调查档案 · 推理深度 {caseData.proofDepth}/5</span>
          <h1>{caseData.caseInfo.emoji} {caseData.caseInfo.title}</h1>
        </div>
      </header>

      <div className="detective-records">
        <span>最长连胜 <b>{bestStreak}</b></span>
        <span>最快破案 <b>{bestTime === null ? '--' : formatTime(bestTime)}</b></span>
        <span>提示惩罚 <b>+{hintCount * 30}s</b></span>
      </div>

      <section className="detective-brief">
        <p>
          {caseData.caseInfo.emoji}{caseData.caseInfo.item}在
          <b>{caseData.sceneLabel}</b>失窃。五名嫌疑人分别待在五个不同地点，
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
          return (
            <article key={suspect.id} className={`detective-card ${selected ? 'selected' : ''}`}>
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
                  onClick={() => setSelectedSuspectId(selected ? null : suspect.id)}
                >
                  {selected ? '当前指认对象' : '列为嫌疑人'}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <details className="detective-notebook">
        <summary>打开推理手册：标记不可能的地点</summary>
        <p>点格子标记“此人不在这里”。手册只做记录，不会自动泄露答案。</p>
        <div className="detective-grid-scroll">
          <div className="detective-logic-grid">
            <div className="grid-corner">嫌疑人</div>
            {caseData.roomNames.map(room => (
              <div className="grid-room" key={room}>{caseData.roomLabels[room]}</div>
            ))}
            {caseData.suspects.map(suspect => (
              <React.Fragment key={suspect.id}>
                <div className="grid-person">{suspect.name}</div>
                {caseData.roomNames.map(room => {
                  const key = `${suspect.id}:${room}`;
                  const eliminated = Boolean(roomMarks[key]);
                  return (
                    <button
                      type="button"
                      key={key}
                      className={eliminated ? 'eliminated' : ''}
                      aria-pressed={eliminated}
                      aria-label={`${suspect.name}${eliminated ? '不在' : '可能在'}${room}`}
                      onClick={() => toggleRoomMark(suspect.id, room)}
                    >
                      {eliminated ? '×' : '·'}
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
          使用提示（剩余 {2 - hintCount} 次，每次 +30 秒）
        </button>
        {hintMessage && <p role="status">{hintMessage}</p>}
      </section>

      <section className="detective-actionbar" aria-label="正式指认">
        <div>
          <span>本案只有一次指认机会</span>
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
