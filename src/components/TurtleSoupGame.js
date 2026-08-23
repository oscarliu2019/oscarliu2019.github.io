import React, { useEffect, useMemo, useRef, useState } from 'react';
import './TurtleSoupGame.css';
import { TURTLE_SOUPS } from '../data/turtleSoups';
import {
  checkReconstruction,
  getAvailableQuestionNodes,
  matchQuestion
} from './turtleSoupEngine';

const VERDICT_LABELS = {
  yes: '是',
  no: '不是',
  irrelevant: '无关'
};

const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining < 10 ? '0' : ''}${remaining}`;
};

const shuffleOptions = options => {
  const copy = [...options];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

function TurtleSoupGame({ onGoBack }) {
  const soup = TURTLE_SOUPS[0];
  const [messages, setMessages] = useState([
    { id: 'opening', role: 'host', text: '汤面已给出。你可以自由提问，我只回答“是”“不是”或“无关”。' }
  ]);
  const [question, setQuestion] = useState('');
  const [askedIds, setAskedIds] = useState([]);
  const [revealedFactIds, setRevealedFactIds] = useState([]);
  const [clarification, setClarification] = useState([]);
  const [hintCount, setHintCount] = useState(0);
  const [hintedNodeIds, setHintedNodeIds] = useState([]);
  const [showReconstruction, setShowReconstruction] = useState(false);
  const [selectedSolutionIds, setSelectedSolutionIds] = useState([]);
  const [reconstructionMessage, setReconstructionMessage] = useState('');
  const [ending, setEnding] = useState(null);
  const [turns, setTurns] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [solutionOrder] = useState(() => shuffleOptions([
    ...soup.facts.map(fact => fact.id),
    ...soup.decoyStatements.map(statement => statement.id)
  ]));
  const startedAtRef = useRef(Date.now());
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const coreFacts = soup.facts.filter(fact => fact.core);
  const revealedFacts = soup.facts.filter(fact => revealedFactIds.includes(fact.id));
  const allCoreRevealed = coreFacts.every(fact => revealedFactIds.includes(fact.id));
  const progress = Math.round(
    coreFacts.filter(fact => revealedFactIds.includes(fact.id)).length / coreFacts.length * 100
  );

  const solutionOptions = useMemo(() => {
    const visible = [
      ...soup.facts
        .filter(fact => fact.core || revealedFactIds.includes(fact.id))
        .map(fact => ({ id: fact.id, text: fact.text })),
      ...soup.decoyStatements
    ];
    return visible.sort(
      (left, right) => solutionOrder.indexOf(left.id) - solutionOrder.indexOf(right.id)
    );
  }, [revealedFactIds, solutionOrder, soup]);

  const availableQuestions = getAvailableQuestionNodes(soup, revealedFactIds)
    .filter(node => !askedIds.includes(node.id))
    .slice(0, 4);

  useEffect(() => {
    if (ending) return undefined;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ending]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const appendMessages = (...entries) => {
    setMessages(previous => [
      ...previous,
      ...entries.map((entry, index) => ({
        ...entry,
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`
      }))
    ]);
  };

  const askNode = (node, displayQuestion = node.question, includePlayerMessage = true) => {
    const nextMessages = [
      ...(includePlayerMessage ? [{ role: 'player', text: displayQuestion }] : []),
      { role: 'host', verdict: node.verdict, text: node.reply }
    ];
    appendMessages(...nextMessages);
    setAskedIds(previous => previous.includes(node.id) ? previous : [...previous, node.id]);
    setRevealedFactIds(previous => [
      ...new Set([...previous, ...(node.reveals || [])])
    ]);
    if (includePlayerMessage) setTurns(value => value + 1);
    setQuestion('');
    setClarification([]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitQuestion = event => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    const result = matchQuestion(trimmed, soup);

    if (result.type === 'answer') {
      askNode({ ...result.node, verdict: result.verdict, reply: result.reply }, trimmed);
      return;
    }
    if (result.type === 'clarify') {
      appendMessages({ role: 'player', text: trimmed });
      setClarification(result.candidates);
      setQuestion('');
      setTurns(value => value + 1);
      return;
    }
    appendMessages(
      { role: 'player', text: trimmed },
      { role: 'host', verdict: result.type === 'irrelevant' ? 'irrelevant' : null, text: result.reply }
    );
    setQuestion('');
    setTurns(value => value + 1);
  };

  const useHint = () => {
    if (hintCount >= 3) return;
    const nextNode = getAvailableQuestionNodes(soup, revealedFactIds).find(node =>
      !askedIds.includes(node.id) &&
      !hintedNodeIds.includes(node.id) &&
      node.reveals.some(factId => !revealedFactIds.includes(factId))
    );
    if (!nextNode) {
      appendMessages({ role: 'host', text: '你已经找到了足够多的事实，可以尝试还原真相。' });
      return;
    }
    appendMessages({
      role: 'host',
      text: `提示方向：试着问问“${nextNode.question}”`
    });
    setHintedNodeIds(previous => [...previous, nextNode.id]);
    setHintCount(value => value + 1);
  };

  const toggleSolutionNode = nodeId => {
    setSelectedSolutionIds(previous => previous.includes(nodeId)
      ? previous.filter(id => id !== nodeId)
      : previous.length >= soup.solutionFactIds.length
        ? previous
        : [...previous, nodeId]
    );
    setReconstructionMessage('');
  };

  const submitReconstruction = () => {
    if (selectedSolutionIds.length !== soup.solutionFactIds.length) {
      setReconstructionMessage(`请选择 ${soup.solutionFactIds.length} 个事实节点组成真相。`);
      return;
    }
    if (!checkReconstruction(soup, selectedSolutionIds)) {
      setReconstructionMessage('这条因果链中混入了错误解释，再检查地面、时间顺序和水的来源。');
      return;
    }
    setEnding('solved');
    setShowReconstruction(false);
  };

  const restart = () => {
    setMessages([
      { id: 'opening', role: 'host', text: '汤面已给出。你可以自由提问，我只回答“是”“不是”或“无关”。' }
    ]);
    setQuestion('');
    setAskedIds([]);
    setRevealedFactIds([]);
    setClarification([]);
    setHintCount(0);
    setHintedNodeIds([]);
    setShowReconstruction(false);
    setSelectedSolutionIds([]);
    setReconstructionMessage('');
    setEnding(null);
    setTurns(0);
    setElapsed(0);
    startedAtRef.current = Date.now();
  };

  if (ending) {
    const solved = ending === 'solved';
    return (
      <main className="turtle-page turtle-complete">
        <section className="turtle-complete-panel">
          <span>{solved ? '真相还原完成' : '主持人揭晓汤底'}</span>
          <h1>{solved ? '暴雨骗得过眼睛，骗不过地面' : '最终故事'}</h1>
          <p>{soup.truth}</p>
          <div className="turtle-complete-stats">
            <div><b>{turns}</b><span>提问轮数</span></div>
            <div><b>{hintCount}</b><span>使用提示</span></div>
            <div><b>{formatTime(elapsed + hintCount * 30)}</b><span>{solved ? '结算用时' : '查看用时'}</span></div>
          </div>
          <div className="turtle-complete-actions">
            <button type="button" onClick={restart}>重新挑战</button>
            <button type="button" onClick={onGoBack}>返回大厅</button>
          </div>
        </section>
      </main>
    );
  }

  if (showReconstruction) {
    return (
      <main className="turtle-page turtle-reconstruct-page">
        <section className="turtle-reconstruct" aria-labelledby="turtle-reconstruct-title">
          <div className="turtle-reconstruct-header">
            <div>
              <span>最终作答</span>
              <h1 id="turtle-reconstruct-title">选择构成真相的四个事实节点</h1>
            </div>
            <button type="button" onClick={() => setShowReconstruction(false)} aria-label="返回问答">×</button>
          </div>
          <p className="turtle-reconstruct-intro">
            真相必须同时解释异常地点、进入时间、水的来源和犯罪目的。
          </p>
          <div className="turtle-node-options">
            {solutionOptions.map(node => {
              const selected = selectedSolutionIds.includes(node.id);
              return (
                <button
                  type="button"
                  key={node.id}
                  className={selected ? 'selected' : ''}
                  aria-pressed={selected}
                  onClick={() => toggleSolutionNode(node.id)}
                >
                  {node.text}
                </button>
              );
            })}
          </div>
          {reconstructionMessage && <p className="turtle-reconstruct-message" role="status">{reconstructionMessage}</p>}
          <button type="button" className="turtle-submit-truth" onClick={submitReconstruction}>
            提交真相链（{selectedSolutionIds.length}/{soup.solutionFactIds.length}）
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="turtle-page">
      <header className="turtle-header">
        <button type="button" onClick={onGoBack}>← 返回大厅</button>
        <div>
          <span>本地海龟汤 · {soup.difficulty}</span>
          <h1>{soup.title}</h1>
        </div>
        <div className="turtle-timer">{formatTime(elapsed + hintCount * 30)}</div>
      </header>

      <section className="turtle-surface">
        <span>汤面</span>
        <p>{soup.surface}</p>
        <div className="turtle-entities">
          {soup.entities.map(entity => <i key={entity}>{entity}</i>)}
        </div>
      </section>

      <section className="turtle-progress" aria-label={`真相探索进度 ${progress}%`}>
        <div><span style={{ width: `${progress}%` }} /></div>
        <p>核心事实 {revealedFactIds.filter(id => soup.solutionFactIds.includes(id)).length}/{coreFacts.length}</p>
      </section>

      <section ref={chatRef} className="turtle-chat" aria-label="问答记录" aria-live="polite">
        {messages.map(message => (
          <div key={message.id} className={`turtle-message ${message.role}`}>
            <span>{message.role === 'host' ? '主持人' : '你'}</span>
            {message.verdict && <b className={message.verdict}>{VERDICT_LABELS[message.verdict]}</b>}
            <p>{message.text}</p>
          </div>
        ))}
      </section>

      {clarification.length > 0 && (
        <section className="turtle-clarify">
          <p>你更接近下面哪一种意思？</p>
          {clarification.map(node => (
            <button type="button" key={node.id} onClick={() => askNode(node, node.question, false)}>
              {node.question}
            </button>
          ))}
        </section>
      )}

      {revealedFacts.length > 0 && (
        <section className="turtle-facts">
          <h2>已确认事实</h2>
          {revealedFacts.map(fact => (
            <div key={fact.id}>
              <span>事实</span>
              <p>{fact.text}</p>
            </div>
          ))}
        </section>
      )}

      <section className="turtle-suggestions">
        <h2>可调查方向</h2>
        <div>
          {availableQuestions.map(node => (
            <button type="button" key={node.id} onClick={() => askNode(node)}>
              {node.question}
            </button>
          ))}
        </div>
      </section>

      <section className="turtle-controls">
        <form onSubmit={submitQuestion}>
          <input
            ref={inputRef}
            value={question}
            onChange={event => setQuestion(event.target.value)}
            maxLength={80}
            placeholder="输入一个可以用“是/不是”回答的问题"
            aria-label="向主持人提问"
          />
          <button type="submit" disabled={!question.trim()}>提问</button>
        </form>
        <div>
          <button type="button" onClick={useHint} disabled={hintCount >= 3}>
            提示 {3 - hintCount}/3
          </button>
          <button
            type="button"
            className="turtle-solve-button"
            onClick={() => setShowReconstruction(true)}
            disabled={!allCoreRevealed}
          >
            还原真相
          </button>
        </div>
        <button type="button" className="turtle-reveal-button" onClick={() => setEnding('revealed')}>
          直接查看最终故事
        </button>
      </section>

    </main>
  );
}

export default TurtleSoupGame;
