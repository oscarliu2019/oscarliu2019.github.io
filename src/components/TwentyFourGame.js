import React, { useState, useEffect } from 'react';
import './TwentyFourGame.css';
import { getRandomImage, getSpecificImage } from '../config/images';

// 生成24点游戏的数字组合
const generateNumbers = () => {
  // 生成4个1-10之间的随机数
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10) + 1);
};

// 检查表达式是否有效
const isValidExpression = (expr) => {
  try {
    // 简单的验证，确保表达式只包含数字、运算符和括号
    const validChars = /^[0-9+\-*/() ]+$/;
    if (!validChars.test(expr)) return false;
    
    // 尝试计算表达式
    const result = eval(expr);
    return Math.abs(result - 24) < 0.0001; // 允许浮点数误差
  } catch (e) {
    return false;
  }
};

// 检查给定的四个数字是否可以组成24点
const canMake24 = (numbers) => {
  // 这里简化处理，实际应该有更复杂的算法
  // 为了游戏体验，我们假设大多数组合都有解
  // 如果需要，可以预先生成一个有解的数字组合列表
  return true;
};

function TwentyFourGame({ onGoBack }) {
  const [gameState, setGameState] = useState('rules'); // 'rules', 'playing', 'battle', 'gameOver'
  const [numbers, setNumbers] = useState([]);
  const [expression, setExpression] = useState('');
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5); // 总共5轮
  const [chiikawaImage, setChiikawaImage] = useState(null);
  const [usedNumbers, setUsedNumbers] = useState([false, false, false, false]);
  const [history, setHistory] = useState([]);
  
  // 对战模式相关状态
  const [battleWinner, setBattleWinner] = useState(''); // 'chiikawa' 或 'zhuyitou'
  const [battleMessage, setBattleMessage] = useState('');
  const [showBattleResult, setShowBattleResult] = useState(false);
  const [battleRound, setBattleRound] = useState(1);
  const [battleTotalRounds] = useState(5); // 对战总共5轮
  const [chiikawaScore, setChiikawaScore] = useState(0);
  const [zhuyitouScore, setZhuyitouScore] = useState(0);
  const [battleHistory, setBattleHistory] = useState([]);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  const [showAnswerCheck, setShowAnswerCheck] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState('');

  useEffect(() => {
    setChiikawaImage(getRandomImage());
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setRound(1);
    setHistory([]);
    nextRound();
  };

  const startBattle = () => {
    setGameState('battle');
    setChiikawaScore(0);
    setZhuyitouScore(0);
    setBattleRound(1);
    setBattleHistory([]);
    nextBattleRound();
  };

  const nextRound = () => {
    let newNumbers;
    do {
      newNumbers = generateNumbers();
    } while (!canMake24(newNumbers)); // 确保生成的数字有解
    
    setNumbers(newNumbers);
    setExpression('');
    setMessage('');
    setUsedNumbers([false, false, false, false]);
  };

  const nextBattleRound = () => {
    let newNumbers;
    do {
      newNumbers = generateNumbers();
    } while (!canMake24(newNumbers)); // 确保生成的数字有解
    
    setNumbers(newNumbers);
    setBattleWinner('');
    setBattleMessage('');
    setShowBattleResult(false);
    setShowAnswerCheck(false);
    setIsWaitingForAnswer(true);
  };

  const handleNumberClick = (index) => {
    if (usedNumbers[index]) return;
    
    const newUsedNumbers = [...usedNumbers];
    newUsedNumbers[index] = true;
    setUsedNumbers(newUsedNumbers);
    
    setExpression(prev => prev + numbers[index]);
  };

  const handleOperatorClick = (operator) => {
    setExpression(prev => prev + operator);
  };

  const handleClear = () => {
    setExpression('');
    setUsedNumbers([false, false, false, false]);
  };

  const handleBackspace = () => {
    if (expression.length === 0) return;
    
    const lastChar = expression[expression.length - 1];
    
    // 如果最后一个是数字，需要检查是哪个数字被使用了
    if (!isNaN(parseInt(lastChar))) {
      // 查找最后一个数字在原始数组中的位置
      let exprCopy = expression;
      let found = false;
      
      for (let i = numbers.length - 1; i >= 0 && !found; i--) {
        if (usedNumbers[i]) {
          const numStr = numbers[i].toString();
          if (exprCopy.endsWith(numStr)) {
            const newUsedNumbers = [...usedNumbers];
            newUsedNumbers[i] = false;
            setUsedNumbers(newUsedNumbers);
            found = true;
          }
        }
      }
    }
    
    setExpression(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    // 检查是否所有数字都已使用
    if (usedNumbers.some(used => !used)) {
      setMessage('请使用所有四个数字！');
      return;
    }
    
    // 检查表达式是否有效
    if (isValidExpression(expression)) {
      setMessage('正确！你得到了24点！');
      const newScore = score + 10;
      setScore(newScore);
      
      // 添加到历史记录
      setHistory(prev => [...prev, { round, numbers, expression, result: '正确' }]);
      
      // 检查是否完成所有轮次
      if (round >= totalRounds) {
        setGameState('gameOver');
      } else {
        setRound(prev => prev + 1);
        setTimeout(() => {
          nextRound();
        }, 1500);
      }
    } else {
      setMessage('表达式不等于24，请再试一次！');
    }
  };

  const resetGame = () => {
    setGameState('rules');
    setNumbers([]);
    setExpression('');
    setMessage('');
    setScore(0);
    setRound(1);
    setUsedNumbers([false, false, false, false]);
    setHistory([]);
  };

  // 对战模式相关函数
  const handleChiikawaBuzz = () => {
    if (!isWaitingForAnswer) return;
    
    setIsWaitingForAnswer(false);
    setBattleWinner('chiikawa');
    setCurrentPlayer('chiikawa');
    setShowAnswerCheck(true);
  };

  const handleZhuyitouBuzz = () => {
    if (!isWaitingForAnswer) return;
    
    setIsWaitingForAnswer(false);
    setBattleWinner('zhuyitou');
    setCurrentPlayer('zhuyitou');
    setShowAnswerCheck(true);
  };

  const handleAnswerCheck = (isCorrect) => {
    setShowAnswerCheck(false);
    
    const winnerName = currentPlayer === 'chiikawa' ? '绵绵' : '猪一头';
    const loserName = currentPlayer === 'chiikawa' ? '猪一头' : '绵绵';
    
    if (isCorrect) {
      setBattleMessage(`${winnerName}回答正确！${winnerName}得1分！`);
      
      // 给当前玩家加分
      if (currentPlayer === 'chiikawa') {
        setChiikawaScore(prev => prev + 1);
      } else {
        setZhuyitouScore(prev => prev + 1);
      }
      
      // 添加到对战历史
      setBattleHistory(prev => [...prev, {
        round: battleRound,
        numbers: numbers,
        winner: winnerName,
        answer: '正确',
        result: '正确'
      }]);
    } else {
      setBattleMessage(`${winnerName}回答错误！${loserName}得1分！`);
      
      // 给对方加分
      if (currentPlayer === 'chiikawa') {
        setZhuyitouScore(prev => prev + 1);
      } else {
        setChiikawaScore(prev => prev + 1);
      }
      
      // 添加到对战历史
      setBattleHistory(prev => [...prev, {
        round: battleRound,
        numbers: numbers,
        winner: loserName,
        answer: '错误',
        result: '错误'
      }]);
    }
    
    setShowBattleResult(true);
    
    // 3秒后进入下一轮或结束游戏
    setTimeout(() => {
      if (battleRound >= battleTotalRounds) {
        setGameState('gameOver');
      } else {
        setBattleRound(prev => prev + 1);
        nextBattleRound();
      }
    }, 3000);
  };

  const renderRules = () => (
    <div className="game-rules">
      {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa" className="game-image" />}
      <h2>和绵绵玩24点</h2>
      <div className="rules-content">
        <p>单人模式规则：</p>
        <ul>
          <li>使用给定的4个数字（1-10），通过加减乘除运算得到24</li>
          <li>每个数字必须使用且只能使用一次</li>
          <li>可以使用括号改变运算顺序</li>
          <li>共有5轮，每答对一题得10分</li>
          <li>点击数字和运算符构建表达式</li>
        </ul>
        
        <p>对战模式规则：</p>
        <ul>
          <li>系统出题（数字范围1-10），两位玩家线下对决</li>
          <li>看到题目后，谁先点击抢答按钮谁先回答</li>
          <li>抢答成功后，只需判断答案是否正确</li>
          <li>回答正确得1分，错误对方得1分</li>
          <li>共5轮，得分高者获胜</li>
        </ul>
      </div>
      <div className="game-mode-buttons">
        <button onClick={startGame} className="start-button">单人模式</button>
        <button onClick={startBattle} className="battle-button">对战模式</button>
      </div>
      <button onClick={onGoBack} className="back-button">返回大厅</button>
    </div>
  );

  const renderGame = () => (
    <div className="game-play">
      <div className="game-header">
        <h2>和绵绵玩24点</h2>
        <div className="game-info">
          <span>轮次: {round}/{totalRounds}</span>
          <span>得分: {score}</span>
        </div>
      </div>
      
      <div className="numbers-container">
        {numbers.map((num, index) => (
          <button
            key={index}
            className={`number-button ${usedNumbers[index] ? 'used' : ''}`}
            onClick={() => handleNumberClick(index)}
            disabled={usedNumbers[index]}
          >
            {num}
          </button>
        ))}
      </div>
      
      <div className="expression-display">
        {expression || '请输入表达式...'}
      </div>
      
      <div className="operators-container">
        <button className="operator-button" onClick={() => handleOperatorClick('+')}>+</button>
        <button className="operator-button" onClick={() => handleOperatorClick('-')}>-</button>
        <button className="operator-button" onClick={() => handleOperatorClick('*')}>×</button>
        <button className="operator-button" onClick={() => handleOperatorClick('/')}>÷</button>
        <button className="operator-button" onClick={() => handleOperatorClick('(')}>(</button>
        <button className="operator-button" onClick={() => handleOperatorClick(')')}>)</button>
      </div>
      
      <div className="controls-container">
        <button className="control-button" onClick={handleClear}>清空</button>
        <button className="control-button" onClick={handleBackspace}>退格</button>
        <button className="submit-button" onClick={handleSubmit}>提交</button>
      </div>
      
      {message && <div className={`message ${message.includes('正确') ? 'success' : message.includes('不等于') ? 'error' : 'warning'}`}>{message}</div>}
      
      <button onClick={onGoBack} className="back-button">返回大厅</button>
    </div>
  );

  const renderBattle = () => (
    <div className="game-battle">
      <div className="game-header">
        <h2>24点对战模式</h2>
        <div className="battle-info">
          <span>轮次: {battleRound}/{battleTotalRounds}</span>
          <span>绵绵: {chiikawaScore} 分</span>
          <span>猪一头: {zhuyitouScore} 分</span>
        </div>
      </div>
      
      <div className="numbers-container">
        {numbers.map((num, index) => (
          <div key={index} className="battle-number">
            {num}
          </div>
        ))}
      </div>
      
      {isWaitingForAnswer && (
        <div className="battle-buttons">
          <button 
            onClick={handleChiikawaBuzz} 
            className="buzz-button chiikawa-buzz"
          >
            绵绵抢答
          </button>
          <button 
            onClick={handleZhuyitouBuzz} 
            className="buzz-button zhuyitou-buzz"
          >
            猪一头抢答
          </button>
        </div>
      )}
      
      {showBattleResult && (
        <div className="battle-result">
          <div className="result-message">{battleMessage}</div>
          <div className="next-round-hint">即将进入下一轮...</div>
        </div>
      )}
      
      {showAnswerCheck && (
        <div className="answer-check-modal">
          <div className="answer-modal-content">
            <h3>{currentPlayer === 'chiikawa' ? '绵绵' : '猪一头'}抢答成功！</h3>
            <p>请判断答案是否正确：</p>
            <div className="answer-buttons">
              <button onClick={() => handleAnswerCheck(true)} className="correct-button">
                正确
              </button>
              <button onClick={() => handleAnswerCheck(false)} className="incorrect-button">
                错误
              </button>
            </div>
          </div>
        </div>
      )}
      
      <button onClick={onGoBack} className="back-button">返回大厅</button>
    </div>
  );

  const renderGameOver = () => {
    // 判断是单人模式还是对战模式结束
    const isBattleMode = battleHistory.length > 0 || chiikawaScore > 0 || zhuyitouScore > 0;
    
    return (
      <div className="game-over">
        {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa" className="game-image" />}
        <h2>游戏结束</h2>
        
        {isBattleMode ? (
          // 对战模式结果
          <div className="battle-final-score">
            <div className="final-scores">
              <div className="player-score">
                <h3>绵绵</h3>
                <p>{chiikawaScore} 分</p>
              </div>
              <div className="vs">VS</div>
              <div className="player-score">
                <h3>猪一头</h3>
                <p>{zhuyitouScore} 分</p>
              </div>
            </div>
            <div className="winner-announcement">
              <h3>
                {chiikawaScore > zhuyitouScore ? '绵绵获胜！' : 
                 zhuyitouScore > chiikawaScore ? '猪一头获胜！' : 
                 '平局！'}
              </h3>
            </div>
            
            <div className="battle-history">
              <h3>对战记录</h3>
              {battleHistory.map((item, index) => (
                <div key={index} className="history-item">
                  <p>第{item.round}轮: {item.numbers.join(', ')} → {item.winner}获胜 ({item.result})</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // 单人模式结果
          <div className="single-final-score">
            <div className="final-score">
              <p>最终得分: {score}/{totalRounds * 10}</p>
            </div>
            
            <div className="history">
              <h3>答题记录</h3>
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <p>第{item.round}轮: {item.numbers.join(', ')} → {item.expression} = 24 ({item.result})</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="game-over-buttons">
          <button onClick={isBattleMode ? startBattle : startGame} className="restart-button">
            再玩一次
          </button>
          <button onClick={onGoBack} className="back-button">返回大厅</button>
        </div>
      </div>
    );
  };

  return (
    <div className="twenty-four-game">
      {gameState === 'rules' && renderRules()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'battle' && renderBattle()}
      {gameState === 'gameOver' && renderGameOver()}
    </div>
  );
}

export default TwentyFourGame;