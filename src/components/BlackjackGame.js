import React, { useState, useEffect } from 'react';
import './BlackjackGame.css';
import { getRandomImage, getSpecificImage } from '../config/images'; // 假设有图片

const CARD_SUITS = ['♥', '♦', '♣', '♠'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getCardValue = (card) => {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 1; // Ace can be 1 or 11
  return parseInt(card.value);
};

const calculateHandValue = (hand) => {
  let value = 0;
  let aceCount = 0;
  hand.forEach(card => {
    value += getCardValue(card);
    if (card.value === 'A') aceCount++;
  });
  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }
  return value;
};

const createDeck = () => {
  const deck = [];
  for (const suit of CARD_SUITS) {
    for (const value of CARD_VALUES) {
      deck.push({ suit, value, id: `${value}${suit}` });
    }
  }
  return deck;
};

const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

function BlackjackGame({ onGoBack }) {
  const [gameState, setGameState] = useState('rules'); // 'rules', 'difficulty', 'playing', 'gameOver'
  const [difficulty, setDifficulty] = useState(null); // 'simple', 'hard'
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [message, setMessage] = useState('');
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [winner, setWinner] = useState(null); // 'player', 'dealer', 'push'
  const [chiikawaImage, setChiikawaImage] = useState(null);

  useEffect(() => {
    setChiikawaImage(getRandomImage());
  }, []);

  const startGame = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setGameState('playing');
    const newDeck = shuffleDeck(createDeck());
    const initialPlayerHand = [newDeck.pop(), newDeck.pop()];
    const initialDealerHand = [newDeck.pop(), { ...newDeck.pop(), hidden: true }];
    
    setDeck(newDeck);
    setPlayerHand(initialPlayerHand);
    setDealerHand(initialDealerHand);
    setPlayerScore(calculateHandValue(initialPlayerHand));
    setDealerScore(calculateHandValue(initialDealerHand.filter(c => !c.hidden)));
    setMessage('');
    setGameOverMessage('');
    setWinner(null);
  };

  const handleHit = () => {
    if (gameState !== 'playing') return;
    const newCard = deck.pop();
    const newPlayerHand = [...playerHand, newCard];
    const newPlayerScore = calculateHandValue(newPlayerHand);
    setPlayerHand(newPlayerHand);
    setPlayerScore(newPlayerScore);
    setDeck([...deck]);

    if (newPlayerScore > 21) {
      setWinner('dealer');
      setGameOverMessage('你爆牌了！庄家获胜。');
      setGameState('gameOver');
      revealDealerHand();
    }
  };

  const revealDealerHand = () => {
    const revealedHand = dealerHand.map(card => ({ ...card, hidden: false }));
    setDealerHand(revealedHand);
    setDealerScore(calculateHandValue(revealedHand));
    return revealedHand; // Return for immediate use in handleStand
  };

  const dealerPlay = (currentDealerHand) => {
    // Ensure all cards received are treated as visible initially for this logic
    let hand = currentDealerHand.map(card => ({ ...card, hidden: false }));
    let currentDeck = [...deck];
    let handValue = calculateHandValue(hand);

    // Dealer must draw cards until hand value is 17 or more, or deck is empty
    while (handValue < 17 && currentDeck.length > 0) {
      const newCardFromDeck = currentDeck.pop();
      if (!newCardFromDeck) break; // Safety break if pop returns undefined

      // Add the new card, explicitly ensuring it's not hidden
      hand.push({ ...newCardFromDeck, hidden: false });
      handValue = calculateHandValue(hand);
      // Difficulty logic (currently same for simple/hard, could be expanded)
      // if (difficulty === 'simple') { ... } else { ... }
    }

    // Before setting state, ensure all cards in the final hand are marked as not hidden.
    const finalDealerHand = hand.map(card => ({ ...card, hidden: false }));
    
    setDealerHand(finalDealerHand);
    const finalScore = calculateHandValue(finalDealerHand);
    setDealerScore(finalScore);
    setDeck(currentDeck);
    return finalScore;
  };

  const handleStand = () => {
    if (gameState !== 'playing') return;
    const revealedHand = revealDealerHand();
    let finalDealerScore = calculateHandValue(revealedHand);

    if (finalDealerScore <= 21 && finalDealerScore < 17) { // Dealer must draw until 17 or more
        finalDealerScore = dealerPlay(revealedHand);
    }

    if (finalDealerScore > 21) {
      setWinner('player');
      setGameOverMessage('庄家爆牌！你赢了！');
    } else if (playerScore > finalDealerScore) {
      setWinner('player');
      setGameOverMessage('你赢了！');
    } else if (playerScore < finalDealerScore) {
      setWinner('dealer');
      setGameOverMessage('庄家赢了！');
    } else {
      setWinner('push');
      setGameOverMessage('平局！');
    }
    setGameState('gameOver');
  };

  const resetGame = () => {
    setGameState('difficulty'); // Go back to difficulty selection
    // Or 'rules' if you want them to see rules again: setGameState('rules');
  };

  const renderCard = (card, index, isDealerHiddenCard = false) => {
    if (isDealerHiddenCard && card.hidden) {
      return <div key={`dealer-hidden-${index}`} className="card hidden-card">?</div>;
    }
    return (
      <div key={card.id || index} className={`card card-${card.suit.toLowerCase()}`}>
        {card.value}{card.suit}
      </div>
    );
  };

  if (gameState === 'rules') {
    return (
      <div className="blackjack-container rules-screen">
        {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa" className="game-image" />}
        <h2>欢迎来到21点游戏！</h2>
        <p><strong>游戏目标：</strong>你的手牌点数需要尽可能接近21点，但不能超过21点，并且比庄家的点数大。</p>
        <p><strong>点数计算：</strong></p>
        <ul>
          <li>A可以算作1点或11点。</li>
          <li>K, Q, J 算作10点。</li>
          <li>其他牌按面值计算。</li>
        </ul>
        <p><strong>游戏流程：</strong></p>
        <ol>
          <li>选择难度开始游戏。</li>
          <li>你会收到两张明牌，庄家一张明牌一张暗牌。</li>
          <li>你可以选择“要牌”（Hit）来多拿一张牌，或者“停牌”（Stand）。</li>
          <li>如果你选择“要牌”后总点数超过21点，则“爆牌”，庄家获胜。</li>
          <li>如果你选择“停牌”，庄家会亮出暗牌并根据规则要牌（通常是直到17点或以上）。</li>
          <li>比较双方点数，更接近21点且未爆牌者胜。</li>
        </ol>
        <button onClick={() => setGameState('difficulty')} className="blackjack-button">我明白了，选择难度</button>
        <button onClick={onGoBack} className="blackjack-button back-button">返回大厅</button>
      </div>
    );
  }

  if (gameState === 'difficulty') {
    return (
      <div className="blackjack-container difficulty-screen">
        {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa" className="game-image" />}
        <h2>选择游戏难度</h2>
        <div className="difficulty-options">
          <button onClick={() => startGame('simple')} className="blackjack-button simple-button">简单模式</button>
          <p className="difficulty-description">庄家策略较为随机，适合新手。</p>
          <button onClick={() => startGame('hard')} className="blackjack-button hard-button">困难模式</button>
          <p className="difficulty-description">庄家将遵循更标准的策略（如17点停牌），更具挑战性。</p>
        </div>
        <button onClick={() => setGameState('rules')} className="blackjack-button back-button">查看规则</button>
        <button onClick={onGoBack} className="blackjack-button back-button">返回大厅</button>
      </div>
    );
  }

  return (
    <div className="blackjack-container game-screen">
      {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa" className="game-image" />}
      <h2>和狮萨宝宝玩21点 ({difficulty === 'simple' ? '简单' : '困难'}模式)</h2>
      
      <div className="game-area">
        <div className="hand-area">
          <h3>庄家手牌 (狮萨宝宝) - 点数: {dealerHand.some(c => c.hidden) ? '?' : dealerScore}</h3>
          <div className="cards">
            {dealerHand.map((card, index) => renderCard(card, index, true))}
          </div>
        </div>

        <div className="hand-area player-hand-area">
          <h3>你的手牌 - 点数: {playerScore}</h3>
          <div className="cards">
            {playerHand.map((card, index) => renderCard(card, index))}
          </div>
        </div>
      </div>

      {message && <p className="game-message">{message}</p>}

      {gameState === 'playing' && (
        <div className="action-buttons">
          <button onClick={handleHit} className="blackjack-button hit-button">要牌 (Hit)</button>
          <button onClick={handleStand} className="blackjack-button stand-button">停牌 (Stand)</button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="game-over-modal">
          <div className="modal-content">
            {winner === 'player' && <img src={getSpecificImage('chiikawaWin') || getRandomImage()} alt="胜利" className="modal-image" />}
            {winner === 'dealer' && <img src={getSpecificImage('chiikawaLose') || getRandomImage()} alt="失败" className="modal-image" />}
            {winner === 'push' && <img src={getSpecificImage('chiikawaPush') || getRandomImage()} alt="平局" className="modal-image" />}
            <h2>游戏结束!</h2>
            <p className="game-over-message">{gameOverMessage}</p>
            <p>你的点数: {playerScore}</p>
            <p>庄家点数: {dealerScore}</p>
            <div className="modal-buttons">
                <button onClick={resetGame} className="blackjack-button restart-button">再玩一局</button>
                <button onClick={onGoBack} className="blackjack-button back-button">返回大厅</button>
            </div>
          </div>
        </div>
      )}
       {gameState !== 'gameOver' && gameState !== 'rules' && gameState !== 'difficulty' &&  <button onClick={onGoBack} className="blackjack-button back-button main-back-button">放弃本局并返回大厅</button>}
    </div>
  );
}

export default BlackjackGame;