import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BrainCircuit,
  Eye,
  LoaderCircle,
  Send,
  Shuffle,
  X
} from 'lucide-react';
import './TurtleSoupGame.css';
import { TURTLE_SOUPS } from '../data/turtleSoups';
import {
  askTurtleSoupQuestion,
  evaluateTurtleSoupSolution
} from '../services/turtleSoupApi';

const VERDICT_LABELS = {
  yes: '是',
  no: '不是',
  both: '是也不是',
  irrelevant: '无关'
};

const openingMessage = {
  id: 'opening',
  role: 'host',
  text: '汤面已给出。你可以自由提问，我会根据完整真相回答“是”“不是”或“无关”。'
};

const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining < 10 ? '0' : ''}${remaining}`;
};

function TurtleSoupGame({ onGoBack }) {
  const [selectedSoupId, setSelectedSoupId] = useState(null);
  const soup = useMemo(
    () => TURTLE_SOUPS.find(item => item.id === selectedSoupId) || TURTLE_SOUPS[0],
    [selectedSoupId]
  );
  const [messages, setMessages] = useState([openingMessage]);
  const [question, setQuestion] = useState('');
  const [revealedFactIds, setRevealedFactIds] = useState([]);
  const [showReconstruction, setShowReconstruction] = useState(false);
  const [solution, setSolution] = useState('');
  const [reconstructionMessage, setReconstructionMessage] = useState('');
  const [ending, setEnding] = useState(null);
  const [turns, setTurns] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const startedAtRef = useRef(Date.now());
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const coreFacts = soup.facts.filter(fact => fact.core);
  const revealedCoreCount = coreFacts.filter(fact =>
    revealedFactIds.includes(fact.id)
  ).length;
  const progress = Math.round(revealedCoreCount / coreFacts.length * 100);

  useEffect(() => {
    if (ending || !selectedSoupId) return undefined;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ending, selectedSoupId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isLoading]);

  const appendMessages = (...entries) => {
    setMessages(previous => [
      ...previous,
      ...entries.map((entry, index) => ({
        ...entry,
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`
      }))
    ]);
  };

  const mergeRevealedFacts = factIds => {
    setRevealedFactIds(previous => [...new Set([...previous, ...factIds])]);
  };

  const submitQuestion = async event => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const playerMessage = { role: 'player', text: trimmed };
    appendMessages(playerMessage);
    setQuestion('');
    setTurns(value => value + 1);
    setIsLoading(true);

    try {
      const result = await askTurtleSoupQuestion(
        soup,
        [...messages, playerMessage],
        trimmed,
        revealedFactIds
      );
      appendMessages({
        role: 'host',
        verdict: result.kind === 'answer' ? result.verdict : null,
        text: result.reply
      });
      mergeRevealedFacts(result.revealedFactIds);
    } catch (error) {
      appendMessages({ role: 'host', text: `主持人连接失败：${error.message}` });
    }

    setIsLoading(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitReconstruction = async event => {
    event.preventDefault();
    if (!solution.trim() || isLoading) return;
    setIsLoading(true);
    setReconstructionMessage('');
    try {
      const result = await evaluateTurtleSoupSolution(
        soup,
        messages,
        solution.trim()
      );
      mergeRevealedFacts(result.matchedFactIds);
      if (result.solved) {
        setEnding('solved');
        setShowReconstruction(false);
      } else {
        setReconstructionMessage(result.reply);
      }
    } catch (error) {
      setReconstructionMessage(`主持人连接失败：${error.message}`);
    }
    setIsLoading(false);
  };

  const resetSession = () => {
    setMessages([openingMessage]);
    setQuestion('');
    setRevealedFactIds([]);
    setShowReconstruction(false);
    setSolution('');
    setReconstructionMessage('');
    setEnding(null);
    setTurns(0);
    setElapsed(0);
    setIsLoading(false);
    startedAtRef.current = Date.now();
  };

  const selectSoup = soupId => {
    setSelectedSoupId(soupId);
    resetSession();
  };

  if (!selectedSoupId) {
    return (
      <main className="turtle-page turtle-library">
        <header className="turtle-library-header">
          <button type="button" onClick={onGoBack}>
            <ArrowLeft size={16} />
            返回大厅
          </button>
          <div>
            <span>AI 主持 · 共 {TURTLE_SOUPS.length} 汤</span>
            <h1>选择一碗海龟汤</h1>
          </div>
          <button
            type="button"
            className="turtle-random-button"
            onClick={() => selectSoup(TURTLE_SOUPS[Math.floor(Math.random() * TURTLE_SOUPS.length)].id)}
          >
            <Shuffle size={16} />
            随机一题
          </button>
        </header>
        <section className="turtle-library-grid">
          {TURTLE_SOUPS.map((item, index) => (
            <button
              type="button"
              className="turtle-library-card"
              key={item.id}
              onClick={() => selectSoup(item.id)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <small>{item.category} · {item.difficulty}</small>
                <h2>{item.title}</h2>
                <p>{item.surface}</p>
              </div>
            </button>
          ))}
        </section>
      </main>
    );
  }

  if (ending) {
    const solved = ending === 'solved';
    return (
      <main className="turtle-page turtle-complete">
        <section className="turtle-complete-panel">
          <span>{solved ? '真相还原完成' : '主持人揭晓汤底'}</span>
          <h1>{soup.title}</h1>
          <p>{soup.truth}</p>
          <div className="turtle-complete-stats">
            <div><b>{turns}</b><span>提问轮数</span></div>
            <div><b>{formatTime(elapsed)}</b><span>{solved ? '结算用时' : '查看用时'}</span></div>
          </div>
          <div className="turtle-complete-actions">
            <button type="button" onClick={resetSession}>重新挑战</button>
            <button type="button" onClick={() => setSelectedSoupId(null)}>选择其他汤</button>
          </div>
        </section>
      </main>
    );
  }

  if (showReconstruction) {
    return (
      <main className="turtle-page turtle-reconstruct-page">
        <form className="turtle-reconstruct" onSubmit={submitReconstruction}>
          <div className="turtle-reconstruct-header">
            <div>
              <span>最终作答</span>
              <h1>用你的话还原完整真相</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowReconstruction(false)}
              aria-label="返回问答"
              title="返回问答"
            >
              <X size={20} />
            </button>
          </div>
          <p className="turtle-reconstruct-intro">
            说明人物身份、关键事件和因果关系，AI 主持人会判断推理是否完整。
          </p>
          <textarea
            value={solution}
            onChange={event => setSolution(event.target.value)}
            maxLength={800}
            placeholder="输入你推理出的完整故事"
            autoFocus
          />
          {reconstructionMessage && (
            <p className="turtle-reconstruct-message" role="status">
              {reconstructionMessage}
            </p>
          )}
          <button
            type="submit"
            className="turtle-submit-truth"
            disabled={!solution.trim() || isLoading}
          >
            {isLoading ? <LoaderCircle className="turtle-spin" size={18} /> : <BrainCircuit size={18} />}
            {isLoading ? '正在判断' : '提交推理'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="turtle-page">
      <header className="turtle-header">
        <button type="button" onClick={() => setSelectedSoupId(null)}>
          <ArrowLeft size={16} />
          返回题库
        </button>
        <div>
          <span>{soup.category} · {soup.difficulty} · AI 主持</span>
          <h1>{soup.title}</h1>
        </div>
        <div className="turtle-timer">{formatTime(elapsed)}</div>
      </header>

      <section className="turtle-surface">
        <span>汤面</span>
        <p>{soup.surface}</p>
        <div className="turtle-entities">
          {soup.entities.map(entity => {
            const name = typeof entity === 'string' ? entity : entity.name;
            return <i key={name}>{name}</i>;
          })}
        </div>
      </section>

      <section className="turtle-progress" aria-label={`真相探索进度 ${progress}%`}>
        <div><span style={{ width: `${progress}%` }} /></div>
        <p>已确认 {revealedCoreCount}/{coreFacts.length}</p>
      </section>

      <section ref={chatRef} className="turtle-chat" aria-label="问答记录" aria-live="polite">
        {messages.map(message => (
          <div key={message.id} className={`turtle-message ${message.role}`}>
            <span>{message.role === 'host' ? '主持人' : '你'}</span>
            {message.verdict && (
              <b className={message.verdict}>{VERDICT_LABELS[message.verdict]}</b>
            )}
            {!message.verdict && <p>{message.text}</p>}
          </div>
        ))}
        {isLoading && (
          <div className="turtle-message host turtle-thinking">
            <span>主持人</span>
            <p><LoaderCircle className="turtle-spin" size={14} />正在判断</p>
          </div>
        )}
      </section>

      <section className="turtle-controls">
        <form onSubmit={submitQuestion}>
          <input
            ref={inputRef}
            value={question}
            onChange={event => setQuestion(event.target.value)}
            maxLength={160}
            placeholder="输入一个可以用“是/不是”回答的问题"
            aria-label="向主持人提问"
            disabled={isLoading}
          />
          <button type="submit" disabled={!question.trim() || isLoading}>
            <Send size={16} />
            提问
          </button>
        </form>
        <div>
          <button
            type="button"
            className="turtle-solve-button"
            onClick={() => setShowReconstruction(true)}
            disabled={isLoading}
          >
            <BrainCircuit size={16} />
            还原真相
          </button>
        </div>
        <button type="button" className="turtle-reveal-button" onClick={() => setEnding('revealed')}>
          <Eye size={15} />
          直接查看最终故事
        </button>
      </section>
    </main>
  );
}

export default TurtleSoupGame;
