import React, { useState, useEffect } from 'react';
import './DuiDuiPengGame.css';

// 牌的类型
const CARD_TYPES = [
  { id: 'wusaji', name: '乌萨奇', image: process.env.PUBLIC_URL + '/images/duiduipeng/乌萨奇.avif' },
  { id: 'guben', name: '古本', image: process.env.PUBLIC_URL + '/images/duiduipeng/古本.avif' },
  { id: 'jiyi', name: '吉伊', image: process.env.PUBLIC_URL + '/images/duiduipeng/吉伊.avif' },
  { id: 'xiaoba', name: '小八', image: process.env.PUBLIC_URL + '/images/duiduipeng/小八.avif' },
  { id: 'shifu', name: '师傅', image: process.env.PUBLIC_URL + '/images/duiduipeng/师傅.avif' },
  { id: 'shisa', name: '师萨', image: process.env.PUBLIC_URL + '/images/duiduipeng/师萨.avif' },
  { id: 'shougongkai', name: '手工铠', image: process.env.PUBLIC_URL + '/images/duiduipeng/手工铠.png' },
  { id: 'lizi', name: '栗子', image: process.env.PUBLIC_URL + '/images/duiduipeng/栗子.avif' },
  { id: 'feishu', name: '飞鼠', image: process.env.PUBLIC_URL + '/images/duiduipeng/飞鼠.avif' }
];

// 创建一副牌（每种7张，共63张）
const createDeck = () => {
  const deck = [];
  CARD_TYPES.forEach(cardType => {
    for (let i = 0; i < 7; i++) {
      deck.push({
        ...cardType,
        uniqueId: `${cardType.id}_${i}`,
        isFlipped: false,
        isMatched: false
      });
    }
  });
  return shuffleArray(deck);
};

// 洗牌算法
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const DuiDuiPengGame = ({ onGoBack }) => {
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing', 'gameOver'
  const [deck, setDeck] = useState([]);
  const [tableCards, setTableCards] = useState([]);
  const [selectedWishCard, setSelectedWishCard] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [message, setMessage] = useState('选择一张牌作为你的"许愿牌"');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deckIndex, setDeckIndex] = useState(9); // 已经发了多少张牌
  const [milkGuessUsed, setMilkGuessUsed] = useState(false); // 奶一口是否已使用
  const [showGameOverModal, setShowGameOverModal] = useState(false); // 是否显示游戏结束弹窗
  const [wishCount, setWishCount] = useState(0); // 许愿次数
  const [showMilkGuessModal, setShowMilkGuessModal] = useState(false); // 是否显示奶一口弹窗
  const [selectedCards, setSelectedCards] = useState([]); // 玩家选择的牌
  const [isPlayerTurn, setIsPlayerTurn] = useState(false); // 是否是玩家回合
  const [drawCount, setDrawCount] = useState(0); // 抽牌次数

  // 初始化游戏
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    const newDeck = createDeck();
    setDeck(newDeck);
    
    // 初始发9张牌，前3张可见，后6张不可见
    const initialCards = newDeck.slice(0, 9).map((card, index) => ({
      ...card,
      isFlipped: index < 3 // 只有前3张牌翻开（可见）
    }));
    
    setTableCards(initialCards);
    setGameState('setup');
    setSelectedWishCard(null);
    setMatchCount(0);
    setWishCount(0); // 重置许愿次数
    setMessage('选择一张牌作为你的"许愿牌"');
    setDeckIndex(9);
    setMilkGuessUsed(false); // 重置奶一口状态
    setShowMilkGuessModal(false); // 重置奶一口弹窗状态
    setSelectedCards([]); // 重置选中的牌
    setIsPlayerTurn(false); // 重置玩家回合状态
    setDrawCount(0); // 重置抽牌次数
  };

  // 选择许愿牌
  const selectWishCard = (cardIndex) => {
    if (gameState !== 'setup' || cardIndex >= 3) return; // 只能从前3张牌中选择
    
    setSelectedWishCard(tableCards[cardIndex]);
    setMessage(`你选择了${tableCards[cardIndex].name}作为许愿牌！点击"开始游戏"翻牌`);
  };

  // 开始游戏
  const startGame = () => {
    if (!selectedWishCard) {
      setMessage('请先选择一张许愿牌！');
      return;
    }
    
    // 翻开所有牌
    const flippedCards = tableCards.map(card => ({ ...card, isFlipped: true }));
    setTableCards(flippedCards);
    
    // 检查有多少张与许愿牌相同的牌（包括许愿牌本身）
    const wishCardMatches = flippedCards.filter(card => 
      card.id === selectedWishCard.id
    );
    
    // 设置许愿次数，每有一张匹配的牌，计数器+1
    if (wishCardMatches.length > 0) {
      setWishCount(wishCardMatches.length); // 设置许愿次数
      setMessage(`发现了${wishCardMatches.length}张${selectedWishCard.name}，获得${wishCardMatches.length}次许愿机会！`);
    } else {
      setMessage('没有发现相同的牌，开始对对碰！');
    }
    
    // 延迟后开始对对碰
    setTimeout(() => {
      setMessage('游戏开始！点击两张相同的牌进行配对');
      setGameState('playing');
      setIsPlayerTurn(true);
    }, 2000);
  };

  // 检查是否有可配对的牌
  const checkForPossibleMatches = () => {
    const cardCounts = {};
    
    tableCards.forEach(card => {
      if (card.isFlipped) { // 只统计已翻开的牌
        cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
      }
    });
    
    return Object.values(cardCounts).some(count => count >= 2);
  };

  // 获取当前桌面上各类型牌的数量
  const getCardCounts = () => {
    const cardCounts = {};
    
    tableCards.forEach(card => {
      if (card.isFlipped) { // 只统计已翻开的牌
        cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
      }
    });
    
    return cardCounts;
  };

  // 添加新牌到桌面
  const addNewCardToTable = (currentCards, currentDeckIndex) => {
    if (currentDeckIndex >= deck.length) {
      return { success: false, cards: currentCards, newDeckIndex: currentDeckIndex }; // 牌堆已空
    }
    
    const newCard = { ...deck[currentDeckIndex], isFlipped: false, isNewCard: true }; // 新牌默认不翻开，并标记为新牌
    const updatedCards = [...currentCards, newCard];
    const newDeckIndex = currentDeckIndex + 1;
    
    // 延迟移除新牌标记，以便动画只播放一次
    setTimeout(() => {
      setTableCards(cards => 
        cards.map(card => 
          card.uniqueId === newCard.uniqueId 
            ? { ...card, isNewCard: false }
            : card
        )
      );
    }, 500); // 与CSS动画时间相同
    
    return { success: true, cards: updatedCards, newDeckIndex };
  };

  // 处理玩家点击牌
  const handleCardClick = (cardIndex) => {
    if (gameState !== 'playing' || !isPlayerTurn || isProcessing) return;
    
    const card = tableCards[cardIndex];
    
    // 如果牌已经翻开且已经选中，取消选中
    if (card.isFlipped && selectedCards.includes(cardIndex)) {
      setSelectedCards(selectedCards.filter(index => index !== cardIndex));
      return;
    }
    
    // 如果牌没有翻开，翻开它
    if (!card.isFlipped) {
      const updatedCards = [...tableCards];
      updatedCards[cardIndex] = { ...updatedCards[cardIndex], isFlipped: true };
      setTableCards(updatedCards);
      setDrawCount(drawCount + 1); // 增加抽牌次数
      
      // 检查翻开后是否有可配对的牌
      setTimeout(() => {
        // 使用函数式更新检查最新的状态
        setTableCards(currentCards => {
          const cardCounts = {};
          currentCards.forEach(card => {
            if (card.isFlipped) { // 只统计已翻开的牌
              cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
            }
          });
          
          const hasMatches = Object.values(cardCounts).some(count => count >= 2);
          
          if (!hasMatches) {
            setMessage('没有可配对的牌');
            // 延迟更长时间再检查游戏状态
            setTimeout(() => {
              checkGameState();
            }, 2000);
          }
          
          return currentCards; // 不改变状态，只是检查
        });
      }, 500);
      return;
    }
    
    // 如果牌已经翻开，选中它
    if (card.isFlipped) {
      const newSelectedCards = [...selectedCards, cardIndex];
      setSelectedCards(newSelectedCards);
      
      // 如果选中了两张牌，检查是否匹配
      if (newSelectedCards.length === 2) {
        setIsProcessing(true);
        const [firstIndex, secondIndex] = newSelectedCards;
        const firstCard = tableCards[firstIndex];
        const secondCard = tableCards[secondIndex];
        
        if (firstCard.id === secondCard.id) {
          // 匹配成功
          setMessage(`配对成功！${firstCard.name}和${secondCard.name}配对`);
          setMatchCount(matchCount + 1);
          
          // 获取要删除的牌的ID
          const firstCardId = firstCard.uniqueId;
          const secondCardId = secondCard.uniqueId;
          
          // 先标记要删除的牌，添加删除动画
          const updatedCards = [...tableCards];
          updatedCards[firstIndex] = { ...updatedCards[firstIndex], isRemoving: true };
          updatedCards[secondIndex] = { ...updatedCards[secondIndex], isRemoving: true };
          setTableCards(updatedCards);
          
          // 等待动画完成后移除牌
          setTimeout(() => {
            // 使用函数式更新，确保使用最新的状态
            setTableCards(currentCards => {
              const filteredCards = currentCards.filter(card => 
                card.uniqueId !== firstCardId && card.uniqueId !== secondCardId
              );
              
              // 添加一张新牌
              const result = addNewCardToTable(filteredCards, deckIndex);
              
              if (result.success) {
                setDeckIndex(result.newDeckIndex);
                setMessage('配对成功！获得一张新牌（点击翻开）');
                return result.cards;
              } else {
                setMessage('配对成功！但牌堆已空');
                return filteredCards;
              }
            });
            
            setSelectedCards([]);
            setIsProcessing(false);
          }, 1000);
        } else {
          // 匹配失败
          setMessage('这两张牌不匹配');
          
          setTimeout(() => {
            setSelectedCards([]);
            setIsProcessing(false);
          }, 1000);
        }
      }
    }
  };

  // 检查游戏状态
  const checkGameState = () => {
    // 使用函数式更新确保获取最新状态
    setTableCards(currentCards => {
      const cardCounts = {};
      currentCards.forEach(card => {
        if (card.isFlipped) { // 只统计已翻开的牌
          cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
        }
      });
      
      const hasMatches = Object.values(cardCounts).some(count => count >= 2);
      
      if (!hasMatches) {
        if (wishCount > 0) {
          setMessage(`没有可配对的牌，可以使用许愿机会（剩余${wishCount}次）`);
        } else if (!milkGuessUsed) {
          // 延迟更长时间再显示奶一口选项
          setTimeout(() => {
            setShowMilkGuessModal(true);
          }, 2000);
        } else {
          // 延迟更长时间再结束游戏
          setTimeout(() => {
            setGameState('gameOver');
            setShowGameOverModal(true);
            setMessage(`游戏结束！你总共配对了${matchCount}对牌`);
          }, 2000);
        }
      }
      
      return currentCards; // 不改变状态，只是检查
    });
  };

  // 使用许愿
  const useWish = () => {
    if (wishCount <= 0) {
      setMessage('没有许愿次数了！');
      return;
    }
    
    setIsProcessing(true);
    setWishCount(wishCount - 1);
    
    setTimeout(() => {
      setTableCards(currentCards => {
        const result = addNewCardToTable(currentCards, deckIndex);
        
        if (result.success) {
          setDeckIndex(result.newDeckIndex);
          setMessage(`使用许愿机会，获得一张新牌！剩余${wishCount - 1}次机会（点击翻开）`);
          return result.cards;
        } else {
          setMessage('使用许愿机会，但牌堆已空');
          return currentCards;
        }
      });
      
      setIsProcessing(false);
    }, 1000);
  };

  // 使用奶一口
  const useMilkGuess = () => {
    setShowMilkGuessModal(false);
    setIsProcessing(true);
    setMilkGuessUsed(true);
    
    setTimeout(() => {
      setTableCards(currentCards => {
        const result = addNewCardToTable(currentCards, deckIndex);
        
        if (result.success) {
          setDeckIndex(result.newDeckIndex);
          setMessage('奶一口！获得一张新牌（点击翻开）');
          return result.cards;
        } else {
          setMessage('奶一口！但牌堆已空');
          return currentCards;
        }
      });
      
      setIsProcessing(false);
    }, 1000);
  };

  // 计算奖励
  const calculateReward = () => {
    if (matchCount >= 10) return '10包卡牌';
    if (matchCount >= 8) return '8包卡牌';
    if (matchCount >= 5) return '5包卡牌';
    if (matchCount >= 3) return '3包卡牌';
    return '1包卡牌';
  };

  // 根据抽牌次数生成不同的消息
  const getDrawCountMessage = () => {
    if (drawCount <= 7) {
      return '笨不笨！很傻猪一头';
    } else if (drawCount <= 10) {
      return '好猪！奖励亲亲！';
    } else {
      return '恭喜你！请找绵绵领取你的小礼物！永远生效！';
    }
  };

  return (
    <div className="duiduipeng-game">
      <div className="game-header">
        <button className="back-button" onClick={onGoBack}>返回</button>
        <h1>吉伊对对碰</h1>
        <div className="game-stats">
          <span>配对数: {matchCount}</span>
          {gameState === 'playing' && (
            <span>许愿次数: {wishCount}</span>
          )}
        </div>
      </div>
      
      <div className="game-message">{message}</div>
      
      {gameState === 'playing' && (
        <div className="card-counts">
          {Object.entries(getCardCounts()).map(([cardId, count]) => {
            const cardType = CARD_TYPES.find(type => type.id === cardId);
            return cardType && count >= 2 ? (
              <div key={cardId} className="card-count">
                {cardType.name}: {count}张
              </div>
            ) : null;
          })}
        </div>
      )}
      
      {gameState === 'setup' && selectedWishCard && (
        <button className="start-game-button" onClick={startGame}>开始游戏</button>
      )}
      
      {gameState === 'playing' && !checkForPossibleMatches() && wishCount > 0 && (
        <button className="wish-button" onClick={useWish}>许愿 ({wishCount})</button>
      )}
      
      <div className="game-table">
        {tableCards.map((card, index) => (
          <div
            key={card.uniqueId}
            className={`card ${
              card.isFlipped ? 'flipped' : ''
            } ${
              card.isRemoving ? 'removing' : ''
            } ${
              card.isNewCard ? 'new-card' : ''
            } ${
              selectedCards.includes(index) ? 'selected' : ''
            } ${
              selectedWishCard && selectedWishCard.uniqueId === card.uniqueId ? 'wish-card' : ''
            }`}
            onClick={() => {
              if (gameState === 'setup') {
                selectWishCard(index);
              } else if (gameState === 'playing') {
                handleCardClick(index);
              }
            }}
          >
            <div className="card-inner">
              <div className="card-front">
                <img src={card.image} alt={card.name} />
              </div>
              <div className="card-back"></div>
            </div>
          </div>
        ))}
      </div>
      
      {gameState === 'gameOver' && (
        <div className="game-over">
          <h2>游戏结束</h2>
          <p>你总共配对了 {matchCount} 对牌</p>
          <p>获得奖励: {calculateReward()}</p>
          <button onClick={startNewGame}>再玩一次</button>
          <button onClick={onGoBack}>返回大厅</button>
        </div>
      )}
      
      {showGameOverModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>游戏结束</h2>
            <p>恭喜你！本次游戏中你成功碰了 {matchCount} 次</p>
            <p className="draw-count-message">{getDrawCountMessage()}</p>
            <div className="modal-buttons">
              <button onClick={() => {
                setShowGameOverModal(false);
                startNewGame();
              }}>再玩一次</button>
              <button onClick={() => {
                setShowGameOverModal(false);
                onGoBack();
              }}>返回大厅</button>
            </div>
          </div>
        </div>
      )}
      
      {showMilkGuessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>没有可配对的牌了</h2>
            <p>是否要使用"奶一口"获得一张新牌？</p>
            <div className="modal-buttons">
              <button onClick={useMilkGuess}>是</button>
              <button onClick={() => {
                setShowMilkGuessModal(false);
                setGameState('gameOver');
                setShowGameOverModal(true);
                setMessage(`游戏结束！你总共配对了${matchCount}对牌`);
              }}>否</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuiDuiPengGame;