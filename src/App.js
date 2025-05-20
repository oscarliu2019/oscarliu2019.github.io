import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import LockScreen from './components/LockScreen';
import GameLobby from './components/GameLobby';
import MatchThreeGame from './components/MatchThreeGame';
import QuizGame from './components/QuizGame'; // 导入QuizGame组件
import BlackjackGame from './components/BlackjackGame'; // 导入BlackjackGame组件
import SevenGhostGame from './components/SevenGhostGame'; // 导入SevenGhostGame组件
import { getRandomImage } from './config/images'; // 导入获取随机图片的函数
// import Modal from './components/Modal'; // 稍后会创建和使用

const App = () => {
  const [currentView, setCurrentView] = useState('lockScreen'); // 'lockScreen', 'gameLobby', 'matchThree', 'chiikawaQuiz', 'zhenhuanQuiz', 'blackjackGame', 'sevenGhostGame'
  const [lockedMessage, setLockedMessage] = useState('');
  const [lockedImage, setLockedImage] = useState(null); // 新增状态来存储随机图片
  const [isMusicPlaying, setIsMusicPlaying] = useState(true); // 音乐默认播放
  const [userInteracted, setUserInteracted] = useState(false); // 新增状态，跟踪用户是否已与文档交互
  const audioRef = useRef(null);

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
    setLockedMessage('下次520解锁哦~');
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

  const toggleMusic = () => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  return (
    <div className="App">
      <audio ref={audioRef} src={process.env.PUBLIC_URL + '/audio/background_music.mp3'} loop />
      <button onClick={toggleMusic} className="music-toggle-button">
        {isMusicPlaying ? '暂停音乐' : '播放音乐'}
      </button>
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
