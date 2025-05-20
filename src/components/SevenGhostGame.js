import React, { useState, useEffect } from 'react';
import './SevenGhostGame.css';
import { getRandomImage, getSpecificImage } from '../config/images'; // 假设图片配置

// 卡牌定义
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const JOKERS = [{ value: 'S', suit: 'Joker', id: 'SJoker', score: 0, rank: 13 }, { value: 'B', suit: 'Joker', id: 'BJoker', score: 0, rank: 14 }]; // 小王, 大王

// 牌面大小顺序 (自定义)
// 7 > 大王 > 小王 > 5 > 2 > 3 > A > K > Q > J > 10 > 9 > 8 > 6 > 4
const CARD_RANK_MAP = {
  '4': 1,
  '6': 2,
  '8': 3,
  '9': 4,
  '10': 5,
  'J': 6,
  'Q': 7,
  'K': 8, // 分牌 10分
  'A': 9,
  '3': 10,
  '2': 11,
  '5': 12, // 分牌 5分
  'S': 13, // 小王
  'B': 14, // 大王
  '7': 15, // 鬼牌
};

const SCORE_CARDS = { '5': 5, '10': 10, 'K': 10 };

function SevenGhostGame({ onGoBack }) {
  const [aiDifficulty, setAiDifficulty] = useState(null); // 'simple' or 'hard'
  const [gameState, setGameState] = useState('difficulty_selection'); // 'difficulty_selection', 'setup', 'playing', 'gameOver'
  const [players, setPlayers] = useState([]); // [{ id: 'player', hand: [], score: 0, isTurn: false, isAI: false }, { id: 'ai1', hand: [], score: 0, isTurn: false, isAI: true, difficulty: 'hard' }]
  const [deck, setDeck] = useState([]);
  const [discardPile, setDiscardPile] = useState([]); // [{ cards: [], player: null, type: ''}] - 记录最后出的牌
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameMessage, setGameMessage] = useState('');
  const [winner, setWinner] = useState(null);
  const [turnPasses, setTurnPasses] = useState(0); // 记录连续pass的次数
  const [gameLog, setGameLog] = useState([]); // 游戏日志

  const chiikawaImage = getRandomImage(); // Or a specific one for the game

  // 初始化牌局
  useEffect(() => {
    if (gameState === 'setup' && aiDifficulty) { // Ensure difficulty is chosen before setup
      initializeGame();
    }
  }, [gameState, aiDifficulty]);



  const createDeck = () => {
    let newDeck = [];
    for (let suit of SUITS) {
      for (let value of VALUES) {
        const rank = CARD_RANK_MAP[value] || 0;
        const score = SCORE_CARDS[value] || 0;
        newDeck.push({ value, suit, id: `${value}${suit}`, rank, score });
      }
    }
    JOKERS.forEach(joker => {
      newDeck.push({ ...joker, rank: CARD_RANK_MAP[joker.value], score: SCORE_CARDS[joker.value] || 0 });
    });
    return shuffleDeck(newDeck);
  };

  const shuffleDeck = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  const initializeGame = () => {
    const initialDeck = createDeck();
    const initialPlayersSetup = [
      { id: 'player', name: '你', hand: [], score: 0, isTurn: false, isAI: false, passCount: 0 },
      { id: 'ai1', name: aiDifficulty === 'simple' ? '简单AI' : '困难AI', hand: [], score: 0, isTurn: false, isAI: true, difficulty: aiDifficulty, passCount: 0 },
    ];

    // 发牌
    for (let i = 0; i < 7; i++) {
      for (let player of initialPlayersSetup) {
        if (initialDeck.length > 0) {
          player.hand.push(initialDeck.pop());
        }
      }
    }
    initialPlayersSetup.forEach(p => p.hand.sort((a, b) => (CARD_RANK_MAP[a.value] || 0) - (CARD_RANK_MAP[b.value] || 0)));

    // 决定先手：手牌中单张最小的玩家先出
    let firstPlayerIndex = 0;
    let minCardRank = Infinity;

    initialPlayersSetup.forEach((player, index) => {
      const singleCards = player.hand.filter(card => player.hand.filter(c => c.value === card.value).length === 1);
      if (singleCards.length > 0) {
        const playerMinCard = singleCards.reduce((min, card) => (card.rank < min.rank ? card : min), singleCards[0]);
        if (playerMinCard.rank < minCardRank) {
          minCardRank = playerMinCard.rank;
          firstPlayerIndex = index;
        }
      } else { // 如果没有单张牌，则比较所有牌中最小的牌（处理极端情况）
        if (player.hand.length > 0) {
            const playerMinOverallCard = player.hand.reduce((min, card) => (card.rank < min.rank ? card : min), player.hand[0]);
            if (playerMinOverallCard.rank < minCardRank) {
                minCardRank = playerMinOverallCard.rank;
                firstPlayerIndex = index;
            }
        }
      }
    });
    
    initialPlayersSetup[firstPlayerIndex].isTurn = true;

    setPlayers(initialPlayersSetup);
    setDeck(initialDeck);
    setDiscardPile([]);
    setGameMessage('游戏开始！');
    setGameLog(['游戏开始！']);
    setWinner(null);
    setTurnPasses(0);
    setCurrentPlayerIndex(firstPlayerIndex);
    addToLog(`${initialPlayersSetup[firstPlayerIndex].name} 先出牌。`);
    setGameState('playing');

    // If AI is first player, trigger its turn

    if (initialPlayersSetup[firstPlayerIndex].isAI) {
        // Pass firstPlayerIndex as actingPlayerActualIndex for the initial AI turn
        // Also pass initialPlayersSetup to handleAIPlay for the very first AI turn
        // Pass initialDeck as the current deck state for the AI's first turn
        setTimeout(() => handleAIPlay(initialPlayersSetup[firstPlayerIndex], firstPlayerIndex, [], initialDeck, firstPlayerIndex, initialPlayersSetup), 1000);
    }
  };

  const addToLog = (message) => {
    setGameLog(prevLog => [message, ...prevLog.slice(0, 19)]); // Keep last 20 messages
  };





  const nextTurn = (actingPlayerActualIndex, playedSuccessfully, newHandForCurrentPlayerIfPlay = null, newDiscardEntryIfPlay = null, currentPlayersStateFromCaller = null, explicitDiscardPileBeforeAction = null, explicitDeckBeforeAction = null) => {
    let newPlayersState = currentPlayersStateFromCaller ? JSON.parse(JSON.stringify(currentPlayersStateFromCaller)) : JSON.parse(JSON.stringify(players)); // Use currentPlayersStateFromCaller if provided
    let newDiscardPileState = explicitDiscardPileBeforeAction ? [...explicitDiscardPileBeforeAction] : [...discardPile]; // Use explicit discard pile if provided
    let currentDeckFromState = explicitDeckBeforeAction ? [...explicitDeckBeforeAction] : [...deck]; // Use explicit deck if provided
    let newTurnPasses = turnPasses;

    // Use the passed actingPlayerActualIndex to correctly identify the player whose turn it just was
    // This is crucial because currentPlayerIndex state might not have updated yet, especially for async AI calls.
    const actingPlayer = newPlayersState[actingPlayerActualIndex];

    if (playedSuccessfully) {
      // This was a play action
      actingPlayer.hand = newHandForCurrentPlayerIfPlay;
      newDiscardPileState.push(newDiscardEntryIfPlay);
      newTurnPasses = 0;
      addToLog(`${actingPlayer.name} 打出了 ${newDiscardEntryIfPlay.cards.map(c => `${c.value}${c.suit === 'Joker' ? '' : c.suit}`).join(', ')} (${newDiscardEntryIfPlay.type})`);
    } else {
      // This was a pass action
      newTurnPasses++;
      addToLog(`${actingPlayer.name} 选择跳过 (Pass)。`);
    }


    // Check for game end by all players passing (current player passes + others already passed)
    if (!playedSuccessfully && newTurnPasses >= newPlayersState.length && newDiscardPileState.length > 0) {
      const lastPlayedEntry = newDiscardPileState[newDiscardPileState.length - 1];
      const lastPlayerWhoMadeAPlay = newPlayersState.find(p => p.id === lastPlayedEntry.player);
      if (lastPlayerWhoMadeAPlay) {
        let remainingScore = 0;
        newPlayersState.forEach(p => {
          p.hand.forEach(card => {
            if (SCORE_CARDS[card.value]) remainingScore += SCORE_CARDS[card.value];
          });
        });
        const winnerPlayerIndex = newPlayersState.findIndex(p => p.id === lastPlayerWhoMadeAPlay.id);
        newPlayersState[winnerPlayerIndex].score += remainingScore; // Score updated here
        
        const potentialWinner = newPlayersState[winnerPlayerIndex]; // This is lastPlayerWhoMadeAPlay with updated score
        const potentialWinnerScore = potentialWinner.score;
        let finalWinnerId = null;
        let finalMessage = '';
        const otherPlayer = newPlayersState.find(p => p.id !== potentialWinner.id); // Assuming 2 players

        if (potentialWinnerScore > 50) {
          finalWinnerId = potentialWinner.id;
          finalMessage = `所有玩家均无法出牌，${potentialWinner.name} (最后出牌者) 获得 ${remainingScore} 分！总分 ${potentialWinnerScore} (>50)，${potentialWinner.name} 获胜！`;
        } else if (potentialWinnerScore === 50) {
          finalWinnerId = null; // Draw
          finalMessage = `所有玩家均无法出牌，${potentialWinner.name} (最后出牌者) 获得 ${remainingScore} 分！总分 ${potentialWinnerScore} (=50)，平局！`;
        } else { // potentialWinnerScore < 50
          finalWinnerId = otherPlayer ? otherPlayer.id : null;
          finalMessage = `所有玩家均无法出牌，${potentialWinner.name} (最后出牌者) 获得 ${remainingScore} 分！总分 ${potentialWinnerScore} (<50)，${potentialWinner.name} 判输。${otherPlayer ? otherPlayer.name + ' 获胜！' : '无人获胜。'}`;
        }

        const finalPlayersState = newPlayersState.map(p => ({...p, isTurn: false}));
        setPlayers(finalPlayersState);
        setWinner(finalWinnerId);
        setGameMessage(finalMessage);
        addToLog(finalMessage);
        setGameState('gameOver');
        setDeck(currentDeckFromState); 
        setDiscardPile(newDiscardPileState);
        return;  
      }
    }

    // Determine the *initial* next player index
    let nextPlayerIdx = (actingPlayerActualIndex + 1) % newPlayersState.length;
    let isNewRound = false;

    // Check if a "round" has ended and who should start it
    if (!playedSuccessfully && newTurnPasses === newPlayersState.length - 1 && newDiscardPileState.length > 0) {
      const lastPlayedSuccessfullyEntry = newDiscardPileState[newDiscardPileState.length - 1];
      const roundStarterIndex = newPlayersState.findIndex(p => p.id === lastPlayedSuccessfullyEntry.player);
      
      if (roundStarterIndex !== -1) {
        nextPlayerIdx = roundStarterIndex; // This player is supposed to start the new round
        isNewRound = true;
      }
    }


    if (isNewRound && currentDeckFromState.length > 0) {
      addToLog(`回合结束，开始补牌阶段。牌堆当前剩余: ${currentDeckFromState.length}张。`);
      for (let i = 0; i < newPlayersState.length; i++) {
        const playerToReplenish = newPlayersState[i]; // Iterate through all players in fixed order
        
        let cardsDrawnThisReplenish = 0;
        while (playerToReplenish.hand.length < 7 && currentDeckFromState.length > 0) {
          const drawnCard = currentDeckFromState.pop();
          if (drawnCard) {
            playerToReplenish.hand.push(drawnCard);
            cardsDrawnThisReplenish++;
          } else {
            break; 
          }
        }
        if (cardsDrawnThisReplenish > 0) {
          playerToReplenish.hand.sort((a, b) => (CARD_RANK_MAP[a.value] || 0) - (CARD_RANK_MAP[b.value] || 0));
          addToLog(`${playerToReplenish.name} 补了 ${cardsDrawnThisReplenish} 张牌。手牌数: ${playerToReplenish.hand.length}。牌堆剩余: ${currentDeckFromState.length}张。`);
        }
      }
      if (currentDeckFromState.length === 0) {
        addToLog("牌堆在补牌阶段被抽干了！");
      }
    }
    // ---- START OF USER REQUESTED MODIFICATION ----
    // If the acting player was an AI and it passed its turn, force the turn to the human player.
    const humanPlayerIndex = newPlayersState.findIndex(p => !p.isAI && p.id === 'player');

    if (actingPlayer.isAI && !playedSuccessfully && humanPlayerIndex !== -1) {
        if (nextPlayerIdx !== humanPlayerIndex) {
            if (isNewRound && newPlayersState[nextPlayerIdx].isAI) { // AI was to start new round, but it passed
                 addToLog(`由于 ${actingPlayer.name} 跳过，新一轮出牌将由 ${newPlayersState[humanPlayerIndex].name} 开始。`);
            } else if (!isNewRound || (isNewRound && newPlayersState[nextPlayerIdx].id !== newPlayersState[humanPlayerIndex].id)) { // Avoid double logging if human was already starting new round
                 addToLog(`由于 ${actingPlayer.name} 跳过，回合将交给 ${newPlayersState[humanPlayerIndex].name}。`);
            }
            nextPlayerIdx = humanPlayerIndex;
        }
    }
    // ---- END OF USER REQUESTED MODIFICATION ----

    // Now, if it's a new round, apply the new round preparations
    if (isNewRound) {
      let roundScore = 0;
      if (newDiscardPileState.length > 0) { // Ensure there were cards played to score
        newDiscardPileState.forEach(entry => {
          entry.cards.forEach(card => {
            if (SCORE_CARDS[card.value]) {
              roundScore += SCORE_CARDS[card.value];
            }
          });
        });
        if (roundScore > 0) {
          const roundWinner = newPlayersState[nextPlayerIdx]; // This is the player starting the new round
          roundWinner.score += roundScore;
          addToLog(`${roundWinner.name} 在本轮获得 ${roundScore} 分！当前总分: ${roundWinner.score}`);
        }
      }

      addToLog(`${newPlayersState[nextPlayerIdx].name} 开始新一轮出牌。`);
      newTurnPasses = 0;
      newDiscardPileState = [];

      if (currentDeckFromState.length > 0) {
        let replenishedSomething = false;
        newPlayersState = newPlayersState.map(player => {
          let newHand = [...player.hand];
          while (newHand.length < 7 && currentDeckFromState.length > 0) {
            newHand.push(currentDeckFromState.pop());
            replenishedSomething = true;
          }
          newHand.sort((a, b) => (CARD_RANK_MAP[a.value] || 0) - (CARD_RANK_MAP[b.value] || 0));
          return { ...player, hand: newHand };
        });
        if (replenishedSomething) addToLog('所有玩家已补牌。');
        if (currentDeckFromState.length === 0) {
          addToLog('牌堆已空，不再补牌！');
        }
      }
    }

    // Update player states (isTurn, passCount)
    const finalPlayersListForSetState = newPlayersState.map((p, idx) => ({
      ...p,
      isTurn: idx === nextPlayerIdx,
      passCount: idx === nextPlayerIdx ? 0 : p.passCount 
    }));

    // Set all states together
    setPlayers(finalPlayersListForSetState);
    setDeck([...currentDeckFromState]); 
    setDiscardPile([...newDiscardPileState]);
    setTurnPasses(newTurnPasses);
    setCurrentPlayerIndex(nextPlayerIdx); // Set current player for the next turn
    
    const nextPlayerObject = finalPlayersListForSetState[nextPlayerIdx];

    // Log whose turn it is, if not covered by a "new round" message
    if (nextPlayerObject) {
        if (!isNewRound) { // If it's not a new round, a general turn message might be needed
            // Log if player changed, or if same player played successfully
            if (nextPlayerObject.id !== actingPlayer.id || playedSuccessfully) {
                 addToLog(`${nextPlayerObject.name} 的回合。`);
            }
        }
    }

    // Check if the acting player (who just played) has emptied their hand AND the deck is also empty
    if (playedSuccessfully && actingPlayer.hand.length === 0 && currentDeckFromState.length === 0) {
      let scoreFromRemainingCards = 0;
      newPlayersState.forEach(p => {
        if (p.id !== actingPlayer.id) { // actingPlayer is the one who just played
          p.hand.forEach(card => {
            if (SCORE_CARDS[card.value]) scoreFromRemainingCards += SCORE_CARDS[card.value];
          });
        }
      });
      
      const potentialWinnerObject = newPlayersState.find(p => p.id === actingPlayer.id);
      let finalWinnerId = null;
      let finalMessage = '';
      
      if (potentialWinnerObject) {
        potentialWinnerObject.score += scoreFromRemainingCards; // Update score
        const potentialWinnerScore = potentialWinnerObject.score;
        const otherPlayer = newPlayersState.find(p => p.id !== potentialWinnerObject.id); // Assuming 2 players

        if (potentialWinnerScore > 50) {
          finalWinnerId = potentialWinnerObject.id;
          finalMessage = `${potentialWinnerObject.name} 打完手牌且牌堆已空，获得 ${scoreFromRemainingCards} 分！总分 ${potentialWinnerScore} (>50)，${potentialWinnerObject.name} 获胜！`;
        } else if (potentialWinnerScore === 50) {
          finalWinnerId = null; // Draw
          finalMessage = `${potentialWinnerObject.name} 打完手牌且牌堆已空，获得 ${scoreFromRemainingCards} 分！总分 ${potentialWinnerScore} (=50)，平局！`;
        } else { // potentialWinnerScore < 50
          finalWinnerId = otherPlayer ? otherPlayer.id : null;
          finalMessage = `${potentialWinnerObject.name} 打完手牌且牌堆已空，获得 ${scoreFromRemainingCards} 分！总分 ${potentialWinnerScore} (<50)，${potentialWinnerObject.name} 判输。${otherPlayer ? otherPlayer.name + ' 获胜！' : '无人获胜。'}`;
        }
      } else {
        // This case should ideally not be reached
        finalMessage = "游戏结束，但无法确定打出最后一张牌的玩家。";
      }
      
      const finalPlayersState = newPlayersState.map(p => ({...p, isTurn: false}));
      setPlayers(finalPlayersState);
      setDeck(currentDeckFromState); 
      setDiscardPile(newDiscardPileState);
      setWinner(finalWinnerId);
      setGameMessage(finalMessage);
      addToLog(finalMessage);
      setGameState('gameOver');
      return; 
    }

    // 仅当下一步玩家是AI时才触发AI出牌，确保用户回合不会被跳过
    if (finalPlayersListForSetState[nextPlayerIdx]?.isAI && gameState === 'playing') {
      const freshDiscardPileForAI = newDiscardPileState;
      // Pass nextPlayerIdx as the actingPlayerIdx for the AI's turn
      // Pass finalPlayersListForSetState to ensure AI operates on the latest player states
      // Pass currentDeckFromState (which should be the most up-to-date deck after replenishment if any)
      setTimeout(() => handleAIPlay(finalPlayersListForSetState[nextPlayerIdx], nextPlayerIdx, freshDiscardPileForAI, [...currentDeckFromState], nextPlayerIdx, finalPlayersListForSetState), 1000);
    } else if (!finalPlayersListForSetState[nextPlayerIdx]?.isAI && gameState === 'playing') {
      setGameMessage(`${finalPlayersListForSetState[nextPlayerIdx].name} 的回合，请出牌`);
    }
  };

  // 玩家出牌逻辑 (简化，需要详细实现牌型判断和比较)
  const handlePlayerPlay = (selectedCards) => {
    const player = players[currentPlayerIndex];
    if (!player || player.isAI || gameState !== 'playing') return;

    // TODO: 实现详细的牌型判断 (getPlayTypeAndValue)
    // TODO: 实现牌型比较 (canPlayOver)
    const playValidation = isValidPlay(selectedCards, player.hand, discardPile.length > 0 ? discardPile[discardPile.length - 1] : null);

    if (playValidation.valid) {
      const newHand = player.hand.filter(card => !selectedCards.find(sc => sc.id === card.id));
      const newEntry = { cards: selectedCards, player: player.id, type: playValidation.type };
      
      addToLog(`${player.name} 打出 ${selectedCards.map(c => c.value + (c.suit !== 'Joker' ? c.suit : '')).join(', ')} (${playValidation.type})`);
      setGameMessage('');
      // Pass currentPlayerIndex as the acting player's index, current discardPile state, and current deck state
      nextTurn(currentPlayerIndex, true, newHand, newEntry, null, discardPile, deck);
    } else {
      setGameMessage(`无效的出牌: ${playValidation.message}`);
      addToLog(`${player.name} 尝试出牌失败: ${playValidation.message}`);
    }
  };

  const handlePass = () => {
    const player = players[currentPlayerIndex];
    if (!player || player.isAI || gameState !== 'playing') return;
    addToLog(`${player.name} 选择跳过。`);
    // Pass currentPlayerIndex as the acting player's index, current discardPile state, and current deck state
    nextTurn(currentPlayerIndex, false, null, null, null, discardPile, deck);
  };

  // AI 出牌逻辑
  // Add actingPlayerIdx to ensure nextTurn knows who just played
  // Add playersListForThisTurn to ensure correct player state is passed through
  // Add currentTurnDeck to ensure correct deck state is passed through
  const handleAIPlay = (aiPlayerInfo, aiPlayerIndex, currentTurnDiscardPile, currentTurnDeck, actingPlayerIdx, playersListForThisTurn = null) => {
    const lastPlay = currentTurnDiscardPile && currentTurnDiscardPile.length > 0 ? currentTurnDiscardPile[currentTurnDiscardPile.length - 1] : null;
    addToLog(`${aiPlayerInfo.name} 正在思考...`);

    try {
      const possiblePlays = findAllValidPlays(aiPlayerInfo.hand, lastPlay);
      let bestPlayDecision = null;

      if (possiblePlays && possiblePlays.length > 0) {
        bestPlayDecision = possiblePlays[0];
        setTimeout(() => {
          if (bestPlayDecision) {
            addToLog(`${aiPlayerInfo.name} 打出了 ${bestPlayDecision.cards.map(c => c.value + (c.suit !== 'Joker' ? c.suit : '')).join(', ')} (${bestPlayDecision.type})`);
            const newHand = aiPlayerInfo.hand.filter(card => !bestPlayDecision.cards.find(pc => pc.id === card.id));
            const newDiscardEntry = { cards: bestPlayDecision.cards, player: aiPlayerInfo.id, type: bestPlayDecision.type };
            
            // Removed setPlayers here, nextTurn will handle it.
            // Pass aiPlayerIndex as the acting player's index, currentTurnDiscardPile, and currentTurnDeck
            nextTurn(aiPlayerIndex, true, newHand, newDiscardEntry, playersListForThisTurn, currentTurnDiscardPile, currentTurnDeck);
          } else {
            addToLog(`${aiPlayerInfo.name} 选择跳过 (无法确定最佳出牌).`);
            // Pass aiPlayerIndex as the acting player's index, currentTurnDiscardPile, and currentTurnDeck
            nextTurn(aiPlayerIndex, false, null, null, playersListForThisTurn, currentTurnDiscardPile, currentTurnDeck);
          }
        }, 1000 + Math.random() * 1000);
      } else {
        setTimeout(() => {
          addToLog(`${aiPlayerInfo.name} 选择跳过 (无牌可出).`);
          if (lastPlay === null && aiPlayerInfo.hand.length > 0) {
              console.error("AI Error: Has cards but cannot find a valid opening play. Hand:", JSON.stringify(aiPlayerInfo.hand.map(c=>c.id)), "PossiblePlays:", JSON.stringify(possiblePlays));
          }
          // Pass aiPlayerIndex as the acting player's index, currentTurnDiscardPile, and currentTurnDeck
          nextTurn(aiPlayerIndex, false, null, null, playersListForThisTurn, currentTurnDiscardPile, currentTurnDeck);
        }, 1000);
      }
    } catch (error) {
      console.error("Error in handleAIPlay:", error);
      addToLog(`${aiPlayerInfo.name} 遇到错误，自动跳过.`);
      // Pass aiPlayerIndex as the acting player's index, currentTurnDiscardPile, and currentTurnDeck
      setTimeout(() => nextTurn(aiPlayerIndex, false, null, null, playersListForThisTurn, currentTurnDiscardPile, currentTurnDeck), 1000);
    }
  };

  // --- Helper functions for play validation (TO BE IMPLEMENTED) ---
  const getPlayTypeAndValue = (cards) => {
    // 识别牌型：单张、对子、三带二、顺子（5张）、大炸（四张同点或双王）
    // 返回 { type: '单张'/'对子'/'三带二'/'顺子'/'大炸', value: comparable_value, cards: sorted_cards, isBomb: boolean }
    // comparable_value 用于比较大小，例如对子K > 对子Q
    // 7 > 大王 > 小王 > 5 > 2 > 3 > A > K > Q > J > 10 > 9 > 8 > 6 > 4

    if (!cards || cards.length === 0) return { type: null, value: -1, message: '没有选择牌', isBomb: false };
    // Sort by pre-calculated rank for stability
    cards.sort((a, b) => a.rank - b.rank);

    // 大炸: 双王 (S+B Joker)
    if (cards.length === 2 && cards.some(c => c.value === 'S') && cards.some(c => c.value === 'B')) {
      // Assuming 'S' and 'B' are always in CARD_RANK_MAP
      return { type: '大炸', value: CARD_RANK_MAP['B'] + CARD_RANK_MAP['S'], cards, isBomb: true }; // High value for bomb
    }
    // 大炸: 四张同点数
    if (cards.length === 4 && cards.every(c => c.value === cards[0].value)) {
      const cardValue = cards[0].value;
      const rankValue = CARD_RANK_MAP[cardValue];
      if (typeof rankValue === 'undefined') {
        console.error(`No rank found for 4-of-a-kind bomb value: ${cardValue} in getPlayTypeAndValue. Cards:`, JSON.stringify(cards));
        return { type: null, value: -1, message: `未知炸弹牌面值: ${cardValue}`, isBomb: false };
      }
      return { type: '大炸', value: rankValue, cards, isBomb: true };
    }

    // 单张
    if (cards.length === 1) {
      const card = cards[0];
      if (!card || typeof card.value === 'undefined') {
        console.error("Invalid card object in getPlayTypeAndValue for single:", JSON.stringify(card));
        return { type: null, value: -1, message: '无效的卡牌对象', isBomb: false };
      }
      const rankValue = CARD_RANK_MAP[card.value];
      if (typeof rankValue === 'undefined') {
        console.error(`No rank found for card value: ${card.value} in getPlayTypeAndValue. Card:`, JSON.stringify(card));
        return { type: null, value: -1, message: `未知牌面值: ${card.value}`, isBomb: false };
      }
      return { type: '单张', value: rankValue, cards, isBomb: false };
    }

    // 对子
    if (cards.length === 2 && cards[0].value === cards[1].value) {
      const cardValue = cards[0].value;
      const rankValue = CARD_RANK_MAP[cardValue];
      if (typeof rankValue === 'undefined') {
        console.error(`No rank found for pair value: ${cardValue} in getPlayTypeAndValue. Cards:`, JSON.stringify(cards));
        return { type: null, value: -1, message: `未知对子牌面值: ${cardValue}`, isBomb: false };
      }
      return { type: '对子', value: rankValue, cards, isBomb: false };
    }
    
    // TODO: 三带二 (e.g., 333 + 22)
    if (cards.length === 5) {
        const counts = cards.reduce((acc, card) => {
            acc[card.value] = (acc[card.value] || 0) + 1;
            return acc;
        }, {});
        const values = Object.keys(counts);
        if (values.length === 2) {
            const threeOfAKindValue = values.find(v => counts[v] === 3);
            const pairValue = values.find(v => counts[v] === 2);
            if (threeOfAKindValue && pairValue) {
                const rankOfThree = CARD_RANK_MAP[threeOfAKindValue];
                if (typeof rankOfThree === 'undefined') {
                    console.error(`No rank found for three-of-a-kind value in full house: ${threeOfAKindValue}. Cards:`, JSON.stringify(cards));
                    return { type: null, value: -1, message: `三带二中三条部分牌面值未知: ${threeOfAKindValue}`, isBomb: false };
                }
                return { type: '三带二', value: rankOfThree, cards, isBomb: false }; // Value is based on the three-of-a-kind
            }
        }
    }

    // TODO: 顺子 (5张, e.g., 3-4-5-6-7, not A-2-3-4-5 or J-Q-K-A-2)
    // For 7鬼523, 顺子规则可能不同，这里假设是连续的牌面值，不考虑花色
    // 7, 大王, 小王, 5, 2, 3, A, K, Q, J, 10, 9, 8, 6, 4
    // This is complex due to the custom rank order. A simple numeric sequence won't work directly.
    // For now, let's skip implementing complex straights.

    return { type: null, value: -1, message: '无法识别的牌型', isBomb: false };
  };

  const isValidPlay = (playedCards, playerHand, lastPlayedOnTable) => {
    const currentPlay = getPlayTypeAndValue(playedCards);

    if (!currentPlay.type) {
      return { valid: false, message: currentPlay.message || '无效牌型' };
    }

    // If table is effectively empty, any valid type is okay
    if (!lastPlayedOnTable || !lastPlayedOnTable.cards || lastPlayedOnTable.cards.length === 0) {
      return { valid: true, type: currentPlay.type };
    }

    // Now, lastPlayedOnTable and lastPlayedOnTable.cards are guaranteed to be non-empty
    const lastPlayDetails = getPlayTypeAndValue(lastPlayedOnTable.cards);
    
    // Safeguard: if somehow lastPlayDetails is invalid (e.g. getPlayTypeAndValue failed for non-empty cards)
    if (!lastPlayDetails || !lastPlayDetails.type) {
        console.warn("场上最后出的牌无法识别 (getPlayTypeAndValue failed)，无法比较。", lastPlayedOnTable);
        return { valid: false, message: "场上最后出的牌无法识别，无法比较。" };
    }
    const lastPlayType = lastPlayDetails.type; // Use the derived type for consistency

    // Bomb logic
    if (currentPlay.isBomb) {
      if (!lastPlayDetails.isBomb || (lastPlayDetails.isBomb && currentPlay.value > lastPlayDetails.value)) {
        return { valid: true, type: currentPlay.type };
      }
      return { valid: false, message: '炸弹不够大' };
    }

    if (lastPlayDetails.isBomb && !currentPlay.isBomb) {
      return { valid: false, message: '需要用更大的炸弹压制' };
    }

    // Same type, same length, must be strictly greater value
    if (currentPlay.type === lastPlayType && currentPlay.cards.length === lastPlayDetails.cards.length) {
      // Explicitly check for equality first to prevent playing same-sized cards.
      if (currentPlay.value === lastPlayDetails.value) {
        return { valid: false, message: '不能出相同大小的牌' };
      }
      // Then check if current play is greater.
      if (currentPlay.value > lastPlayDetails.value) {
        return { valid: true, type: currentPlay.type };
      }
      // Otherwise, current play is smaller.
      return { valid: false, message: '牌不够大' };
    }

    // Different types or different lengths (and not bomb vs non-bomb)
    return { valid: false, message: '牌型不匹配或不符合出牌规则' };
  };

  const findAllValidPlays = (hand, lastPlayedOnTable) => {
    const plays = [];
    if (!hand || hand.length === 0) return plays;

    // Helper to attempt adding a play
    const tryAddPlay = (cardSelection) => {
      const playDetails = getPlayTypeAndValue(cardSelection); // Get type and value first
      if (playDetails && playDetails.type) { // Check if it's a recognizable type
        const validation = isValidPlay(cardSelection, hand, lastPlayedOnTable); // Then validate against last play
        if (validation.valid) {
          // When leading, validation.type should be consistent with playDetails.type.
          // Using playDetails.type directly is safer as it's the primary source of type info.
          plays.push({ cards: cardSelection, type: playDetails.type, value: playDetails.value });
        }
      }
    };

    // Singles
    for (const card of hand) {
      tryAddPlay([card]);
    }

    // Pairs
    const valueCounts = hand.reduce((acc, card) => {
      acc[card.value] = (acc[card.value] || 0) + 1;
      return acc;
    }, {});

    for (const value in valueCounts) {
      if (valueCounts[value] >= 2) {
        const pairCards = hand.filter(c => c.value === value).slice(0, 2);
        tryAddPlay(pairCards);
      }
    }

    // Four of a kind (Bomb)
    for (const value in valueCounts) {
      if (valueCounts[value] >= 4) {
        const bombCards = hand.filter(c => c.value === value).slice(0, 4);
        tryAddPlay(bombCards);
      }
    }

    // Joker Bomb (Big Joker + Small Joker)
    const smallJoker = hand.find(c => c.value === 'S');
    const bigJoker = hand.find(c => c.value === 'B');
    if (smallJoker && bigJoker) {
      tryAddPlay([smallJoker, bigJoker]);
    }
    
    // TODO: Add Three with Two, Straights if getPlayTypeAndValue and isValidPlay support them

    // Sort plays: by type (bombs last unless they are the only option or strategically better),
    // then by value (smaller values first for simple AI, or more complex for hard AI).
    // This basic sort prefers smaller valid plays.
    plays.sort((a, b) => {
      // playDetails were already determined when play was added, use a.value and b.value directly.
      // However, a.isBomb is not a property of the play object. We need getPlayTypeAndValue for that.
      const aIsBomb = getPlayTypeAndValue(a.cards).isBomb; // Re-evaluate for bomb status if not stored
      const bIsBomb = getPlayTypeAndValue(b.cards).isBomb;

      if (aIsBomb && !bIsBomb) return 1; // Bombs later
      if (!aIsBomb && bIsBomb) return -1; // Non-bombs earlier
      if (a.type === b.type) return a.value - b.value;
      // If types are different and neither are bombs, a simple value sort might not be meaningful.
      // For now, maintain order or sort by value as a fallback.
      return a.value - b.value;
    });

    // Deduplicate plays that might have been added multiple times with same cards/type/value
    const uniquePlays = [];
    const seenPlays = new Set();
    for (const play of plays) {
        const playKey = play.cards.map(c => c.id).sort().join(',') + `_${play.type}`;
        if (!seenPlays.has(playKey)) {
            uniquePlays.push(play);
            seenPlays.add(playKey);
        }
    }
    return uniquePlays;
  };
  

  // --- Render functions ---
  const renderCard = (card, index, isSelected, onCardClick, onCardDoubleClick, isPlayerCard = true) => {
    const cardValueDisplay = card.value === 'S' ? '小王' : card.value === 'B' ? '大王' : card.value;
    const suitDisplay = card.suit === 'Joker' ? '' : card.suit;
    return (
      <div 
        key={card.id || index} 
        className={`card ${isSelected ? 'selected' : ''} ${card.suit && isPlayerCard ? card.suit.toLowerCase() : ''} ${!isPlayerCard ? 'card-back' : ''}`}
        onClick={() => onCardClick && isPlayerCard && onCardClick(card)}
        onDoubleClick={() => onCardDoubleClick && isPlayerCard && onCardDoubleClick(card)}
      >
        {isPlayerCard ? (
          <>
            <span className="card-value">{cardValueDisplay}</span>
            {suitDisplay && <span className="card-suit">{suitDisplay}</span>}
          </>
        ) : (
          <span>?</span> // Placeholder for card back
        )}
      </div>
    );
  };

  const [selectedPlayerCards, setSelectedPlayerCards] = useState([]);
  const handleCardClick = (card) => {
    if (players[currentPlayerIndex].isAI) return; // AI turn, player cannot select
    if (players[currentPlayerIndex].isAI || gameState !== 'playing') return;
    setSelectedPlayerCards(prev => 
      prev.find(c => c.id === card.id) 
        ? prev.filter(c => c.id !== card.id) 
        : [...prev, card]
    );
  };

  const handleSelectDifficulty = (difficulty) => {
    setAiDifficulty(difficulty);
    setGameState('setup');
  };

  const handleConfirmPlay = () => {
    if (selectedPlayerCards.length > 0 && !players[currentPlayerIndex].isAI && gameState === 'playing') {
      handlePlayerPlay(selectedPlayerCards);
      setSelectedPlayerCards([]);
    }
  };

  const handleCardDoubleClick = (card) => {
    if (players[currentPlayerIndex].isAI || gameState !== 'playing') return;
    // Attempt to play the single double-clicked card
    handlePlayerPlay([card]);
    setSelectedPlayerCards([]); // Clear selection after attempting to play
  };

  if (gameState === 'difficulty_selection') {
    return (
      <div className="seven-ghost-container difficulty-selection-screen">
        {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa Welcome" className="game-image chiikawa-welcome" />}
        <h2 className="game-title">选择AI难度 - 七鬼五二三</h2>
        <div className="modal-buttons">
          <button onClick={() => handleSelectDifficulty('simple')} className="sgg-button difficulty-button">简单AI</button>
          <button onClick={() => handleSelectDifficulty('hard')} className="sgg-button difficulty-button">困难AI</button>
        </div>
        <button onClick={onGoBack} className="sgg-button back-button top-back-button">返回大厅</button>
      </div>
    );
  }

  if (gameState === 'setup') {
    return <div className="seven-ghost-container loading-screen">正在准备牌局...</div>;
  }

  if (gameState === 'gameOver') {
    const winningPlayer = players.find(p => p.id === winner);
    const finalScores = players.map(p => `${p.name}: ${p.score}分`).join(', ');
    return (
      <div className="seven-ghost-container game-over-screen">
        {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa" className="game-image" />}
        <h2>游戏结束!</h2>
        <p>{gameMessage}</p>
        {winningPlayer && <p>最终胜利者: {winningPlayer.name}</p>}
        <p>最终得分: {finalScores}</p>
        <div className="modal-buttons">
          <button onClick={initializeGame} className="sgg-button restart-button">再玩一局</button>
          <button onClick={onGoBack} className="sgg-button back-button">返回大厅</button>
        </div>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const humanPlayerObject = players.find(p=>!p.isAI && p.id === 'player');

  return (
    <div className="seven-ghost-container playing-screen">
      {chiikawaImage && <img src={chiikawaImage} alt="Chiikawa" className="game-image header-image" />}
      <h2 className="game-title">7怪523</h2>
      <button onClick={onGoBack} className="sgg-button back-button top-back-button">返回大厅</button>

      <div className="game-board">
        {/* AI Players Display */} 
        {players.filter(p => p.isAI).map(ai => (
          <div key={ai.id} className={`player-area ai-area ${ai.isTurn ? 'current-turn' : ''}`}>
            <h3>{ai.name} ({ai.difficulty}) {ai.isTurn ? '(思考中...)' : ''}</h3>
            <p>得分: {ai.score}</p>
            <div className="cards-display hand-cards">
              {ai.hand.map((card, idx) => renderCard(card, idx, false, null, null, false))}
            </div>
          </div>
        ))}

        {/* Discard Pile / Last Played Cards */}  
        <div className="discard-pile-area">
          <h3>场上出的牌:</h3>
          {discardPile.length > 0 ? (
            <div className="cards-display">
              {discardPile[discardPile.length - 1].cards.map((card, index) => renderCard(card, index, false, null))}
              <p className="play-info">由 {players.find(p=>p.id === discardPile[discardPile.length - 1].player)?.name} 打出 ({discardPile[discardPile.length - 1].type})</p>
            </div>
          ) : (
            <p>等待出牌...</p>
          )}
        </div>

        {/* Human Player Area */} 
        {humanPlayerObject && (
                    <div className={`player-area human-player-area ${humanPlayerObject && humanPlayerObject.isTurn ? 'current-turn' : ''}`}>
            <h3>你的手牌 (得分: {humanPlayerObject.score})</h3>
            <div className="cards-display hand-cards">
              {humanPlayerObject.hand.map((card, index) => 
                renderCard(card, index, selectedPlayerCards.some(sc => sc.id === card.id), handleCardClick, handleCardDoubleClick, true)
              )}
            </div>
            {humanPlayerObject && humanPlayerObject.isTurn && gameState === 'playing' && (
              <div className="action-buttons">
                <button onClick={handleConfirmPlay} className="sgg-button play-button" disabled={selectedPlayerCards.length === 0}>出牌</button>
                <button onClick={handlePass} className="sgg-button pass-button">跳过</button>
              </div>
            )}
          </div>
        )}
      </div>

      {gameMessage && <p className="game-message">{gameMessage}</p>}
      
      <div className="game-log-area">
        <h4>游戏日志:</h4>
        <ul>
          {gameLog.map((log, index) => <li key={index}>{log}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default SevenGhostGame;