import React, { useState, useEffect } from 'react';
import './GameLobby.css';
import { getRandomImage, getSpecificImage } from '../config/images'; // 导入获取随机和特定图片的函数

function GameLobby({ onStartGame, onShowLockedMessage }) {
  const [logoImage, setLogoImage] = useState(null);
  const [titleClicks, setTitleClicks] = useState(0);
  const [showSecretMessage, setShowSecretMessage] = useState(false);

  useEffect(() => {
    setLogoImage(getRandomImage()); // 组件加载时设置随机Logo
  }, []);

  const handleTitleClick = () => {
    // 使用函数式更新确保状态一致性
    setTitleClicks(currentClicks => {
      const newClicks = currentClicks + 1;
      
      if (newClicks >= 5) { // 假设连续点击5次显示彩蛋
        setShowSecretMessage(true);
        // 可以在一段时间后自动隐藏彩蛋
        setTimeout(() => {
          setShowSecretMessage(false);
          setTitleClicks(0); // 重置点击次数
        }, 3000);
      }
      
      return newClicks;
    });
  };

  return (
    <div className="game-lobby">
      <div className="lobby-header">
        {logoImage && <img src={logoImage} alt="Chiikawa Logo" className="lobby-logo" />}
        <h1 className="lobby-title" onClick={handleTitleClick}>
          Chiikawa的生日游戏屋
        </h1>
      </div>
      {showSecretMessage && <p className="secret-message">猪一头23岁生日快乐！</p>}
      <div className="game-entries">
        <div className="game-entry" onClick={() => onStartGame('matchThree')}> 
          <img src={getSpecificImage('matchThreeLogo') || getRandomImage()} alt="消消乐 Logo" className="game-icon-img" />
          <p>吉伊消消乐</p>
        </div>
        <div className="game-entry" onClick={() => onStartGame('chiikawaQuiz')}>
          <img src={getSpecificImage('chiikawaQuizLogo') || getRandomImage()} alt="Chiikawa知识问答 Logo" className="game-icon-img" />
          <p>Chiikawa知识问答</p>
        </div>
        <div className="game-entry" onClick={() => onStartGame('zhenhuanQuiz')}>
          <img src={getSpecificImage('zhenhuanQuizLogo') || getRandomImage()} alt="甄嬛传知识问答 Logo" className="game-icon-img" />
          <p>甄嬛传知识问答</p>
        </div>
        <div className="game-entry" onClick={() => onStartGame('sevenGhostGame')}>
          <img src={getSpecificImage('sevenGhostGameLogo') || getRandomImage()} alt="7怪523 Logo" className="game-icon-img" />
          <p>和师萨一起来玩7怪523</p>
        </div>
        <div className="game-entry" onClick={() => onStartGame('blackjackGame')}>
          <img src={getSpecificImage('blackjackGameLogo') || getRandomImage()} alt="21点 Logo" className="game-icon-img" />
          <p>和狮萨宝宝玩21点</p>
        </div>
        <div className="game-entry" onClick={() => onStartGame('whatToEatToday')}>
          <img src={getSpecificImage('whatToEatTodayLogo') || getRandomImage()} alt="今天吃什么 Logo" className="game-icon-img" />
          <p>今天吃什么</p>
        </div>
        <div className="game-entry" onClick={() => onStartGame('duiduipengGame')}>
          <img src={getSpecificImage('duiduipengGameLogo') || getRandomImage()} alt="对对碰 Logo" className="game-icon-img" />
          <p>吉伊对对碰</p>
        </div>
        <div className="game-entry" onClick={() => onStartGame('twentyFourGame')}>
          <img src={getSpecificImage('twentyFourGameLogo') || getRandomImage()} alt="24点 Logo" className="game-icon-img" />
          <p>和绵绵玩24点</p>
        </div>
      </div>
      {/* 通用对话框可以在App.js中管理，或者在这里根据需要弹出 */}
    </div>
  );
}

export default GameLobby;