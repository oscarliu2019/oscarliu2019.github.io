import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import LockScreen from './components/LockScreen';
import GameLobby from './components/GameLobby';
import MatchThreeGame from './components/MatchThreeGame';
import QuizGame from './components/QuizGame'; // 导入QuizGame组件
import BlackjackGame from './components/BlackjackGame'; // 导入BlackjackGame组件
import SevenGhostGame from './components/SevenGhostGame'; // 导入SevenGhostGame组件
import WhatToEatToday from './components/WhatToEatToday'; // 导入WhatToEatToday组件
import DuiDuiPengGame from './components/DuiDuiPengGame'; // 导入DuiDuiPengGame组件
import TwentyFourGame from './components/TwentyFourGame'; // 导入TwentyFourGame组件
import MessageToPig from './components/MessageToPig'; // 导入MessageToPig组件
import { getRandomImage } from './config/images'; // 导入获取随机图片的函数
// import Modal from './components/Modal'; // 稍后会创建和使用

// 音乐列表
const MUSIC_LIST = [
  { name: '宝宝歌', file: 'baby.mp3' },
  { name: '惜春词', file: 'xichunci.mp3' },
  { name: '疯狂动物城', file: 'try everything.mp3' },
  { name: '他不懂', file: 'hebudong.mp3' },
  { name: '这就是爱', file: 'zheshijiai.mp3' },
  { name: '宝宝歌2', file: 'baby2.mp3' },
  {name : 'vitas', file: 'vitas.mp3'},
  {name : '三生三世', file: 'sansansans.mp3'}
];

const App = () => {
  const [currentView, setCurrentView] = useState('lockScreen'); // 'lockScreen', 'gameLobby', 'matchThree', 'chiikawaQuiz', 'zhenhuanQuiz', 'blackjackGame', 'sevenGhostGame', 'whatToEatToday', 'duiduipengGame', 'twentyFourGame', 'messageToPig'
  const [lockedMessage, setLockedMessage] = useState('');
  const [lockedImage, setLockedImage] = useState(null); // 新增状态来存储随机图片
  const [isMusicPlaying, setIsMusicPlaying] = useState(true); // 音乐默认播放
  const [userInteracted, setUserInteracted] = useState(false); // 新增状态，跟踪用户是否已与文档交互
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0); // 当前播放的音乐索引
  const [musicProgress, setMusicProgress] = useState(0); // 音乐播放进度 (0-100)
  const [isDragging, setIsDragging] = useState(false); // 是否正在拖动进度条
  const [currentTime, setCurrentTime] = useState(0); // 当前播放时间（秒）
  const [duration, setDuration] = useState(0); // 音乐总时长（秒）
  const audioRef = useRef(null);

  // 格式化时间显示
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleUnlock = () => {
    setCurrentView('gameLobby');
    if (!userInteracted) {
      setUserInteracted(true);
    }
  };

  const handleStartGame = (gameId) => {
    if (gameId === 'matchThree') {
      setCurrentView('matchThree');
    } else if (gameId === 'chiikawaQuiz') {
      setCurrentView('chiikawaQuiz');
    } else if (gameId === 'zhenhuanQuiz') {
      setCurrentView('zhenhuanQuiz');
    } else if (gameId === 'blackjackGame') {
      setCurrentView('blackjackGame');
    } else if (gameId === 'sevenGhostGame') {
      setCurrentView('sevenGhostGame');
    } else if (gameId === 'whatToEatToday') {
      setCurrentView('whatToEatToday');
    } else if (gameId === 'duiduipengGame') {
      setCurrentView('duiduipengGame');
    } else if (gameId === 'twentyFourGame') {
      setCurrentView('twentyFourGame');
    } else if (gameId === 'messageToPig') {
      setCurrentView('messageToPig');
    }
    // 可以为其他游戏ID添加逻辑
  };

  const handleGameOver = (score) => {
    console.log('Game Over! Score:', score); // For MatchThreeGame
    setCurrentView('gameLobby'); // 返回游戏大厅
  };

  const handleQuizGoBack = () => {
    setCurrentView('gameLobby'); // 问答游戏返回大厅
  };

  const handleShowLockedMessage = (gameName) => {
    setLockedMessage('下次猪一头生日解锁哦~');
    setLockedImage(getRandomImage()); // 设置随机图片
    // 3秒后自动清除消息和图片
    setTimeout(() => {
      setLockedMessage('');
      setLockedImage(null);
    }, 3000);
  };

  const renderView = () => {
    switch (currentView) {
      case 'lockScreen':
        return <LockScreen onUnlock={handleUnlock} />;
      case 'gameLobby':
        return <GameLobby onStartGame={handleStartGame} onShowLockedMessage={handleShowLockedMessage} />;
      case 'matchThree':
        return <MatchThreeGame onGameOver={handleGameOver} onGoBack={handleQuizGoBack} />;
      case 'chiikawaQuiz':
        return <QuizGame gameId="chiikawaQuiz" gameTitle="Chiikawa知识问答" quizDataPath="chiikawa_quiz.json" onGoBack={handleQuizGoBack} />;
      case 'zhenhuanQuiz':
        return <QuizGame gameId="zhenhuanQuiz" gameTitle="甄嬛传知识问答" quizDataPath="zhenhuan_quiz.json" onGoBack={handleQuizGoBack} />;
      case 'blackjackGame':
        return <BlackjackGame onGoBack={handleQuizGoBack} />; // 使用 handleQuizGoBack 因为功能相同，都是返回大厅
      case 'sevenGhostGame':
        return <SevenGhostGame onGoBack={handleQuizGoBack} />; // 使用 handleQuizGoBack 因为功能相同，都是返回大厅
      case 'whatToEatToday':
        return <WhatToEatToday onGoBack={handleQuizGoBack} />; // 使用 handleQuizGoBack 因为功能相同，都是返回大厅
      case 'duiduipengGame':
        return <DuiDuiPengGame onGoBack={handleQuizGoBack} />; // 使用 handleQuizGoBack 因为功能相同，都是返回大厅
      case 'twentyFourGame':
        return <TwentyFourGame onGoBack={handleQuizGoBack} />; // 使用 handleQuizGoBack 因为功能相同，都是返回大厅
      case 'messageToPig':
        return <MessageToPig onGoBack={handleQuizGoBack} />; // 使用 handleQuizGoBack 因为功能相同，都是返回大厅
      default:
        return <LockScreen onUnlock={handleUnlock} />;
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isMusicPlaying && userInteracted) { // 只有当用户已交互且希望播放音乐时才播放
        audioRef.current.play().catch(error => console.log("Audio play failed: ", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMusicPlaying, userInteracted]); // 添加 userInteracted 到依赖项

  // 更新音乐进度
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (!isDragging) { // 只有在非拖动状态下才更新进度
        const current = audio.currentTime;
        const total = audio.duration;
        
        // 更新进度
        const progress = (current / total) * 100;
        setMusicProgress(isNaN(progress) ? 0 : progress);
        
        // 更新时间
        setCurrentTime(isNaN(current) ? 0 : current);
        setDuration(isNaN(total) ? 0 : total);
      }
    };

    // 添加事件监听器
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', () => {
      // 音乐结束时，进度重置为0
      setMusicProgress(0);
      setCurrentTime(0);
    });

    return () => {
      // 清理事件监听器
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', () => {
        setMusicProgress(0);
        setCurrentTime(0);
      });
    };
  }, [isDragging, currentMusicIndex]); // 依赖拖动状态和当前音乐索引

  // 处理音频源变化和自动播放
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 当音频源变化时，重新加载音频
    audio.load();
    
    // 如果音乐应该播放且用户已交互，则播放
    if (isMusicPlaying && userInteracted) {
      // 延迟播放，确保音频已加载
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Auto play failed: ", error);
        });
      }
    }
  }, [currentMusicIndex]); // 依赖当前音乐索引

  // 处理进度条拖动
  const handleProgressChange = (e) => {
    const newProgress = parseFloat(e.target.value);
    setMusicProgress(newProgress);
    
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleMusic = () => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  // 切换到下一首音乐
  const nextMusic = () => {
    const nextIndex = (currentMusicIndex + 1) % MUSIC_LIST.length;
    setCurrentMusicIndex(nextIndex);
    setMusicProgress(0); // 重置进度
    setCurrentTime(0); // 重置当前时间
    setDuration(0); // 重置总时长
    
    // 如果当前正在播放音乐，切换后继续播放
    if (isMusicPlaying && userInteracted) {
      // 延迟一下再播放，确保音频源已经更新
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => console.log("Audio play failed: ", error));
        }
      }, 100);
    }
  };

  // 切换到上一首音乐
  const prevMusic = () => {
    const prevIndex = currentMusicIndex === 0 ? MUSIC_LIST.length - 1 : currentMusicIndex - 1;
    setCurrentMusicIndex(prevIndex);
    setMusicProgress(0); // 重置进度
    setCurrentTime(0); // 重置当前时间
    setDuration(0); // 重置总时长
    
    // 如果当前正在播放音乐，切换后继续播放
    if (isMusicPlaying && userInteracted) {
      // 延迟一下再播放，确保音频源已经更新
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => console.log("Audio play failed: ", error));
        }
      }, 100);
    }
  };

  return (
    <div className="App">
      <audio 
        ref={audioRef} 
        src={process.env.PUBLIC_URL + '/audio/' + MUSIC_LIST[currentMusicIndex].file} 
        loop 
      />
      <div className="music-controls">
        <button onClick={prevMusic} className="music-control-button prev-button" title="上一首">
          ⏮️
        </button>
        <button onClick={toggleMusic} className="music-control-button play-button" title={isMusicPlaying ? '暂停音乐' : '播放音乐'}>
          {isMusicPlaying ? '⏸️' : '▶️'}
        </button>
        <button onClick={nextMusic} className="music-control-button next-button" title="下一首">
          ⏭️
        </button>
        <div className="current-music-info">
          {MUSIC_LIST[currentMusicIndex].name}
        </div>
        <div className="music-time-info">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>
      </div>
      
      {/* 音乐进度条 */}
      <div className="music-progress-container">
        <div className="music-progress-bar">
          <div 
            className="music-progress-fill" 
            style={{ width: `${musicProgress}%` }}
          ></div>
          <input
            type="range"
            min="0"
            max="100"
            value={musicProgress}
            className="music-progress-slider"
            onChange={handleProgressChange}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
          />
        </div>
      </div>
      {renderView()}
      {lockedMessage && (
        <div className="modal-overlay">
          <div className="error-modal-content">
            {lockedImage && <img src={lockedImage} alt="Chiikawa" className="modal-image" />}
            <p>{lockedMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};


export default App;
