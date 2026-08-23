import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MatchThreeGame.css';
import { getMultipleRandomImages, getRandomImage as getRandomChiikawaImage } from '../config/images'; // 导入配置

const GRID_SIZE = 9; // Changed from 5 to 9
const MATCH_MESSAGES = [
  "太棒啦！",
  "好厉害！",
  "为你庆祝！",
  "继续加油！",
  "最棒了！"
];
// 配置异常时回退到仓库内真实存在的角色图片，避免产生无效资源请求。
const configuredElementTypes = getMultipleRandomImages(9);
const ELEMENT_TYPES = configuredElementTypes.length > 0
  ? configuredElementTypes
  : ['/images/duiduipeng/吉伊.avif'];
const INITIAL_MOVES = 3; // Changed from 10 to 3
const SCORE_PER_MATCH = 10;

// 生成随机元素
const getRandomElement = () => {
  return ELEMENT_TYPES[Math.floor(Math.random() * ELEMENT_TYPES.length)];
};

// 初始化游戏面板 (简单随机生成)
const createRawGrid = () => { // Renamed from createInitialGrid to avoid confusion
  return Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map(() => getRandomElement())
  );
};

// 辅助函数：检查给定点是否有匹配 (用于 hasPossibleSwaps)
const checkMatchAtPoint = (board, r, c) => {
  const piece = board[r][c];
  if (!piece) return false;
  const gs = board.length;

  let hMatch = false;
  // 水平检查: X P P (P是当前检查点 board[r][c])
  if (c > 1 && board[r][c-1] === piece && board[r][c-2] === piece) hMatch = true;
  // 水平检查: P X P
  if (!hMatch && c > 0 && c < gs - 1 && board[r][c-1] === piece && board[r][c+1] === piece) hMatch = true;
  // 水平检查: P P X
  if (!hMatch && c < gs - 2 && board[r][c+1] === piece && board[r][c+2] === piece) hMatch = true;

  let vMatch = false;
  // 垂直检查: X P P (P是当前检查点 board[r][c], X在上方)
  if (r > 1 && board[r-1][c] === piece && board[r-2][c] === piece) vMatch = true;
  // 垂直检查: P X P
  if (!vMatch && r > 0 && r < gs - 1 && board[r-1][c] === piece && board[r+1][c] === piece) vMatch = true;
  // 垂直检查: P P X
  if (!vMatch && r < gs - 2 && board[r+1][c] === piece && board[r+2][c] === piece) vMatch = true;
  
  return hMatch || vMatch;
};

// 辅助函数：检查棋盘上是否存在任何可能的交换以形成匹配
const hasPossibleSwaps = (grid) => {
  const gs = grid.length;
  const tempGrid = grid.map(row => [...row]); // 创建一个可变副本

  for (let r = 0; r < gs; r++) {
    for (let c = 0; c < gs; c++) {
      // 尝试向右交换
      if (c < gs - 1) {
        [tempGrid[r][c], tempGrid[r][c+1]] = [tempGrid[r][c+1], tempGrid[r][c]]; // 交换
        if (checkMatchAtPoint(tempGrid, r, c) || checkMatchAtPoint(tempGrid, r, c+1)) {
          [tempGrid[r][c], tempGrid[r][c+1]] = [tempGrid[r][c+1], tempGrid[r][c]]; // 换回
          return true;
        }
        [tempGrid[r][c], tempGrid[r][c+1]] = [tempGrid[r][c+1], tempGrid[r][c]]; // 换回
      }
      // 尝试向下交换
      if (r < gs - 1) {
        [tempGrid[r][c], tempGrid[r+1][c]] = [tempGrid[r+1][c], tempGrid[r][c]]; // 交换
        if (checkMatchAtPoint(tempGrid, r, c) || checkMatchAtPoint(tempGrid, r+1,c)) {
          [tempGrid[r][c], tempGrid[r+1][c]] = [tempGrid[r+1][c], tempGrid[r][c]]; // 换回
          return true;
        }
        [tempGrid[r][c], tempGrid[r+1][c]] = [tempGrid[r+1][c], tempGrid[r][c]]; // 换回
      }
    }
  }
  return false;
};

// 辅助函数：清除棋盘上的初始匹配项 (原 processInitialGrid 逻辑)
const clearInitialMatchesOnBoard = (initialGrid, gridSize, randomElementGetter) => {
  const clearBoardOnceSync = (currentBoard) => {
    let newBoard = currentBoard.map(row => [...row]);
    let matchesFoundThisPass = false;
    const toClear = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));

    // 检查行
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize - 2; c++) {
        if (newBoard[r][c] && newBoard[r][c] === newBoard[r][c+1] && newBoard[r][c] === newBoard[r][c+2]) {
          toClear[r][c] = toClear[r][c+1] = toClear[r][c+2] = true;
          matchesFoundThisPass = true;
        }
      }
    }
    // 检查列
    for (let c = 0; c < gridSize; c++) {
      for (let r = 0; r < gridSize - 2; r++) {
        if (newBoard[r][c] && newBoard[r][c] === newBoard[r+1][c] && newBoard[r][c] === newBoard[r+2][c]) {
          toClear[r][c] = toClear[r+1][c] = toClear[r+2][c] = true;
          matchesFoundThisPass = true;
        }
      }
    }

    if (matchesFoundThisPass) {
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (toClear[r][c]) newBoard[r][c] = null;
        }
      }
      // 元素下落
      for (let c = 0; c < gridSize; c++) {
        let emptySlots = 0;
        for (let r = gridSize - 1; r >= 0; r--) {
          if (newBoard[r][c] === null) emptySlots++;
          else if (emptySlots > 0) {
            newBoard[r + emptySlots][c] = newBoard[r][c];
            newBoard[r][c] = null;
          }
        }
      }
      // 填充新元素
      newBoard = newBoard.map(row => row.map(cell => cell === null ? randomElementGetter() : cell));
      return { board: newBoard, cleared: true };
    }
    return { board: newBoard, cleared: false };
  };

  let currentProcessedGrid = initialGrid;
  let hadToClear = true;
  let iteration = 0;
  const maxIterations = 20; // 为9x9网格增加迭代次数上限
  while (hadToClear && iteration < maxIterations) {
    iteration++;
    const result = clearBoardOnceSync(currentProcessedGrid);
    currentProcessedGrid = result.board;
    hadToClear = result.cleared;
  }
  if (iteration >= maxIterations) {
    console.warn(`Max iterations (${maxIterations}) reached during initial board processing. Board might have initial matches.`);
  }
  return currentProcessedGrid;
};

// 辅助函数：创建、处理初始棋盘，并确保有可消除的组合
const createAndProcessInitialGrid = (gridSize, randomElementGetter, swapsChecker, initialClearer) => {
  let newGrid;
  let attempts = 0;
  const MAX_ATTEMPTS_FOR_MOVES = 20; // 尝试次数上限，避免死循环

  do {
    newGrid = Array(gridSize).fill(null).map(() =>
      Array(gridSize).fill(null).map(() => randomElementGetter())
    );
    newGrid = initialClearer(newGrid, gridSize, randomElementGetter); // 清除初始匹配
    attempts++;
    if (attempts > MAX_ATTEMPTS_FOR_MOVES) {
      console.error("MatchThreeGame: Failed to create an initial board with possible moves after multiple attempts.");
      break; // 返回最后生成的棋盘，即使它可能没有可移动的组合
    }
  } while (ELEMENT_TYPES.length > 0 && !swapsChecker(newGrid)); // 如果图片未加载，swapsChecker可能导致问题
  
  return newGrid;
};

function MatchThreeGame({ onGameOver, onGoBack }) { // Added onGoBack
  const [grid, setGrid] = useState(() => 
    createAndProcessInitialGrid(GRID_SIZE, getRandomElement, hasPossibleSwaps, clearInitialMatchesOnBoard)
  );
  const [selected, setSelected] = useState(null); // {row, col}
  const [moves, setMoves] = useState(INITIAL_MOVES);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverImage, setGameOverImage] = useState(null); // 新增状态存储游戏结束时的随机图片
  const [isCheckingMatches, setIsCheckingMatches] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupImage, setPopupImage] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [clearingCells, setClearingCells] = useState(new Set()); // 存储正在消除的单元格
  const [newCells, setNewCells] = useState(new Set()); // 存储新出现的单元格
  const [isShuffling, setIsShuffling] = useState(false); // 是否正在洗牌

  // 记录所有挂起的定时器（消除连锁、弹窗、洗牌等），卸载时统一清理
  const timersRef = useRef([]);
  const scheduleTimer = useCallback((callback, delay) => {
    const timerId = setTimeout(() => {
      timersRef.current = timersRef.current.filter(id => id !== timerId);
      callback();
    }, delay);
    timersRef.current.push(timerId);
    return timerId;
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(id => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  // 检查并处理消除 (仅用于玩家操作后)
  const checkAndClearMatches = useCallback((currentGrid) => {
    let newGrid = currentGrid.map(row => [...row]);
    let matchesFound = false;
    let pointsEarnedThisTurn = 0;
    const toClear = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    const clearingPositions = new Set(); // 存储要消除的单元格位置

    // 检查行
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        if (newGrid[r][c] && newGrid[r][c] === newGrid[r][c+1] && newGrid[r][c] === newGrid[r][c+2]) {
          toClear[r][c] = toClear[r][c+1] = toClear[r][c+2] = true;
          matchesFound = true;
          // 添加要消除的单元格位置
          clearingPositions.add(`${r}-${c}`);
          clearingPositions.add(`${r}-${c+1}`);
          clearingPositions.add(`${r}-${c+2}`);
        }
      }
    }
    // 检查列
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        if (newGrid[r][c] && newGrid[r][c] === newGrid[r+1][c] && newGrid[r][c] === newGrid[r+2][c]) {
          toClear[r][c] = toClear[r+1][c] = toClear[r+2][c] = true;
          matchesFound = true;
          // 添加要消除的单元格位置
          clearingPositions.add(`${r}-${c}`);
          clearingPositions.add(`${r+1}-${c}`);
          clearingPositions.add(`${r+2}-${c}`);
        }
      }
    }

    if (matchesFound) {
      // 标记要消除的单元格
      setClearingCells(clearingPositions);
      
      // 清除匹配的元素并计分
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (toClear[r][c]) {
            newGrid[r][c] = null;
            pointsEarnedThisTurn += SCORE_PER_MATCH;
          }
        }
      }

      if (pointsEarnedThisTurn > 0) {
        setScore(prevScore => prevScore + pointsEarnedThisTurn);
      }

      // 延迟处理，让用户看到消除效果
      scheduleTimer(() => {
        // 清除消除标记
        setClearingCells(new Set());
        
        // 元素下落
        let droppedGrid = newGrid.map(row => [...row]);
        const newPositions = new Set(); // 存储新卡片的位置
        
        for (let c = 0; c < GRID_SIZE; c++) {
          let emptySlots = 0;
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            if (droppedGrid[r][c] === null) {
              emptySlots++;
            } else if (emptySlots > 0) {
              droppedGrid[r + emptySlots][c] = droppedGrid[r][c];
              droppedGrid[r][c] = null;
            }
          }
        }

        // 填充新的元素
        let filledGrid = droppedGrid.map((row, r) => 
          row.map((cell, c) => {
            if (cell === null) {
              newPositions.add(`${r}-${c}`);
              return getRandomElement();
            }
            return cell;
          })
        );
        
        // 标记新卡片
        setNewCells(newPositions);
        
        // 更新网格状态
        setGrid(filledGrid);
        
        // 递归检查新生成的面板是否还有匹配
        scheduleTimer(() => {
          // 清除新卡片标记
          setNewCells(new Set());
          const furtherMatchesFound = checkAndClearMatches(filledGrid);
          if (!furtherMatchesFound) {
            // 这是连锁反应的结束
            setIsCheckingMatches(false);
          }
        }, 500); // 让新卡片动画有足够时间播放
      }, 500); // 增加延迟时间，让消除动画有足够时间播放
      return true; // 本轮操作找到了匹配
    } else {
      // 此调用未找到匹配。如果这是由 handleCellClick 直接调用的，它将处理 isCheckingMatches
      // 如果这是递归调用，则由其父调用处理 isCheckingMatches
      return false; // 本轮操作没有找到匹配
    }
  }, [setScore, setIsCheckingMatches, getRandomElement, scheduleTimer]);

  useEffect(() => {
    // 确保在棋盘稳定后（非检查匹配状态）且游戏未结束时，检查是否有可行的移动
    // 如果没有，则重新生成棋盘
    if (!isCheckingMatches && grid.length > 0 && !isGameOver && ELEMENT_TYPES.length > 0) {
      if (!hasPossibleSwaps(grid)) {
        console.warn("MatchThreeGame: No possible moves on the current board after update. Regenerating...");
        setIsCheckingMatches(true); // 在重新生成期间阻止玩家操作

        const newBoard = createAndProcessInitialGrid(
            GRID_SIZE, 
            getRandomElement, 
            hasPossibleSwaps, 
            clearInitialMatchesOnBoard
        );
        
        setGrid(newBoard);
        // newBoard 应该已经清除了匹配项并且有可行的移动
        // 如果 createAndProcessInitialGrid 失败（不太可能，但作为预防），游戏可能会卡住
        // 此时，我们不立即再次调用 checkAndClearMatches，因为新棋盘理论上是干净的
        setIsCheckingMatches(false); // 允许玩家再次移动
      }
    } else if (ELEMENT_TYPES.length === 0 && !isGameOver) {
        console.warn("MatchThreeGame: ELEMENT_TYPES is empty. Game might not function correctly.");
        // Consider showing a message to the user or disabling interactions
    }
  }, [grid, isCheckingMatches, isGameOver]); // 依赖项包括 grid, isCheckingMatches, isGameOver

  useEffect(() => {
    // This effect ensures isCheckingMatches is false after initial setup if not already handled.
    // It's a bit redundant with the above but harmless.
    if (grid.length > 0 && isCheckingMatches === undefined) { // Check for undefined if not initialized
        setIsCheckingMatches(false);
    }
  }, [grid]); // Runs when grid is initialized

  const handleCellClick = (r, c) => {
    if (isGameOver || isCheckingMatches || !grid[r][c] || showPopup) return; // Prevent action if popup is shown

    if (selected) {
      if (Math.abs(selected.row - r) + Math.abs(selected.col - c) === 1) {
        const originalGrid = grid.map(row => [...row]); // Capture grid state BEFORE optimistic update
        const tempGrid = grid.map(row => [...row]);
        [tempGrid[selected.row][selected.col], tempGrid[r][c]] = [tempGrid[r][c], tempGrid[selected.row][selected.col]];
        
        setGrid(tempGrid); // Optimistically update grid
        setIsCheckingMatches(true); // Start "checking" state, as player made a move

        const foundMatches = checkAndClearMatches(tempGrid);

        if (foundMatches) {
          // 找到匹配，不减少步数
          // Score is handled by checkAndClearMatches
          // isCheckingMatches will be set to false by checkAndClearMatches when cascade ends
          const randomMatchMessage = MATCH_MESSAGES[Math.floor(Math.random() * MATCH_MESSAGES.length)];
          setPopupMessage(randomMatchMessage);
          setPopupImage(getRandomChiikawaImage());
          setShowPopup(true);
          scheduleTimer(() => setShowPopup(false), 1500); // Hide popup after 1.5s
        } else {
          // Swap resulted in no matches, penalize move
          setMoves(prevMoves => prevMoves - 1);
          setPopupMessage("再试试！");
          setPopupImage(getRandomChiikawaImage());
          setShowPopup(true);
          scheduleTimer(() => {
            setShowPopup(false);
            setGrid(originalGrid); // Revert the swap
            setIsCheckingMatches(false); // Checking is over
          }, 1500); // Hide popup and revert after 1.5s
        }
        setSelected(null);
      } else {
        // Clicked on a non-adjacent cell, so select it
        setSelected({ row: r, col: c });
      }
    } else {
      // No cell selected yet, so select this one
      setSelected({ row: r, col: c });
    }
  };

  useEffect(() => {
    if (moves <= 0 && !isCheckingMatches && !isGameOver && !showPopup) { // 添加 !isGameOver 和 !showPopup 防止重复触发
      setIsGameOver(true);
      setGameOverImage(getRandomChiikawaImage()); // 游戏结束时设置随机图片
    }
  }, [moves, isCheckingMatches, isGameOver, showPopup]);

  const handleShuffle = () => {
    if (isShuffling || isCheckingMatches || isGameOver) return;
    
    setIsShuffling(true);
    
    // 标记所有当前单元格为"清除"状态
    const allCells = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        allCells.add(`${r}-${c}`);
      }
    }
    setClearingCells(allCells);
    
    // 延迟后生成新的地图
    scheduleTimer(() => {
      const newGrid = createAndProcessInitialGrid(GRID_SIZE, getRandomElement, hasPossibleSwaps, clearInitialMatchesOnBoard);
      
      // 标记所有新单元格
      const newCellPositions = new Set();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          newCellPositions.add(`${r}-${c}`);
        }
      }
      
      setClearingCells(new Set());
      setNewCells(newCellPositions);
      setGrid(newGrid);
      
      // 清除新单元格标记
      scheduleTimer(() => {
        setNewCells(new Set());
        setIsShuffling(false);
      }, 500);
    }, 500);
  };

  const restartGame = () => {
    const newProcessedGrid = createAndProcessInitialGrid(GRID_SIZE, getRandomElement, hasPossibleSwaps, clearInitialMatchesOnBoard);
    setGrid(newProcessedGrid);
    setMoves(INITIAL_MOVES);
    setScore(0);
    setSelected(null);
    setIsGameOver(false);
    setGameOverImage(null); // 重置游戏结束图片
    setIsCheckingMatches(false); // Ensure checking is false on restart
    setClearingCells(new Set()); // 清除消除标记
    setNewCells(new Set()); // 清除新卡片标记
    setIsShuffling(false); // 重置洗牌状态
  };

  // (restartGame 函数已在上一个修改块中更新，这里删除重复的旧代码)

  if (isGameOver) {
    return (
      <div className="match-three-game game-over-screen">
        <h2>游戏结束!</h2>
        {gameOverImage && <img src={gameOverImage} alt="Chiikawa Over" className="game-over-image" />}
        <p className="final-score">最终得分: {score}</p>
        <p className="evaluation">{score >= 100 ? '太棒了！Chiikawa为你鼓掌！🥳' : score >=50 ? '好厉害！继续加油！🎈' : '再试一次吧！'}</p>
        <button onClick={restartGame} className="restart-button">再玩一次</button>
        <button onClick={() => onGameOver(score)} className="back-button">返回大厅</button>
      </div>
    );
  }

  return (
    <div className="match-three-game">
      <div className="game-status">
        <div className="status-item moves">
          <span role="img" aria-label="Heart">❤️</span> x {moves}
        </div>
        <div className="status-item score">分数: {score}</div>
        <button 
          className="shuffle-button" 
          onClick={handleShuffle}
          disabled={isShuffling || isCheckingMatches || isGameOver}
        >
          换一下
        </button>
      </div>
      <div className="game-grid">
        {grid.map((row, rIndex) => (
          <div key={rIndex} className="grid-row">
            {row.map((cell, cIndex) => {
              const cellKey = `${rIndex}-${cIndex}`;
              const isClearing = clearingCells.has(cellKey);
              const isNew = newCells.has(cellKey);
              const isSelected = selected && selected.row === rIndex && selected.col === cIndex;
              
              return (
                <div
                  key={cellKey}
                  className={`grid-cell ${isSelected ? 'selected' : ''} ${isClearing ? 'clearing' : ''} ${isNew ? 'new' : ''}`}
                  onClick={() => !isCheckingMatches && handleCellClick(rIndex, cIndex)}
                >
                  {cell && <img src={cell} alt={`item-${rIndex}-${cIndex}`} />}
                </div>
              );
            })}
          </div>
        ))}
        </div> {/* End of game-grid */}
        <button
          className="back-button"
          onClick={onGoBack}
          style={{ marginTop: '15px', padding: '10px 20px', fontSize: '1em' }}
        >
          返回大厅
        </button>
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            {popupImage && <img src={popupImage} alt="popup chiikawa" className="popup-image" />}
            <p>{popupMessage}</p>
          </div>
        </div>
      )}
  </div>
  );
}

export default MatchThreeGame;
