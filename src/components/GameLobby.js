import React, { useState, useEffect, useRef } from 'react';
import './GameLobby.css';
import { getRandomImage, getSpecificImage } from '../config/images'; // 导入获取随机和特定图片的函数

const GAME_ENTRIES = [
  { id: 'matchThree', label: '吉伊消消乐', alt: '消消乐 Logo', image: () => getSpecificImage('matchThreeLogo') || getRandomImage() },
  { id: 'chiikawaQuiz', label: 'Chiikawa知识问答', alt: 'Chiikawa知识问答 Logo', image: () => getSpecificImage('chiikawaQuizLogo') || getRandomImage() },
  { id: 'zhenhuanQuiz', label: '甄嬛传知识问答', alt: '甄嬛传知识问答 Logo', image: () => getSpecificImage('zhenhuanQuizLogo') || getRandomImage() },
  { id: 'sevenGhostGame', label: '和师萨一起来玩7怪523', alt: '7怪523 Logo', image: () => getSpecificImage('sevenGhostGameLogo') || getRandomImage() },
  { id: 'blackjackGame', label: '和狮萨宝宝玩21点', alt: '21点 Logo', image: () => getSpecificImage('blackjackGameLogo') || getRandomImage() },
  { id: 'whatToEatToday', label: '今天吃什么', alt: '今天吃什么 Logo', image: () => getSpecificImage('whatToEatTodayLogo') || getRandomImage() },
  { id: 'duiduipengGame', label: '吉伊对对碰', alt: '对对碰 Logo', image: () => getSpecificImage('duiduipengGameLogo') || getRandomImage() },
  { id: 'twentyFourGame', label: '和绵绵玩24点', alt: '24点 Logo', image: () => getSpecificImage('twentyFourGameLogo') || getRandomImage() },
  { id: 'messageToPig', label: '想对猪说的话', alt: '想对猪说的话 Logo', image: () => getSpecificImage('messageToPigLogo') || getRandomImage() },
  { id: 'rockGrassBadgeGame', label: '精灵弹珠救援', alt: '精灵弹珠救援 Logo', image: () => process.env.PUBLIC_URL + '/images/rock/shuiling.png' },
  { id: 'detectiveGame', label: '一句话侦探', alt: '一句话侦探 Logo', image: () => process.env.PUBLIC_URL + '/images/duiduipeng/古本.avif' },
  { id: 'turtleSoupGame', label: '海龟汤', alt: '海龟汤 Logo', image: () => process.env.PUBLIC_URL + '/images/duiduipeng/飞鼠.avif' }
];

function GameLobby({ onStartGame }) {
  const [logoImage, setLogoImage] = useState(null);
  const [, setTitleClicks] = useState(0);
  const [showSecretMessage, setShowSecretMessage] = useState(false);
  const secretTimerRef = useRef(null);

  useEffect(() => {
    setLogoImage(getRandomImage()); // 组件加载时设置随机Logo
    return () => {
      if (secretTimerRef.current) clearTimeout(secretTimerRef.current);
    };
  }, []);

  const handleTitleClick = () => {
    // 使用函数式更新确保状态一致性
    setTitleClicks(currentClicks => {
      const newClicks = currentClicks + 1;
      
      if (newClicks >= 5) { // 假设连续点击5次显示彩蛋
        setShowSecretMessage(true);
        if (secretTimerRef.current) clearTimeout(secretTimerRef.current);
        secretTimerRef.current = setTimeout(() => {
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
          Chiikawa的游戏屋
        </h1>
      </div>
      {showSecretMessage && <p className="secret-message">猪一头23岁生日快乐🎂！</p>}
      <div className="game-entries">
        {GAME_ENTRIES.map(game => (
          <button
            type="button"
            className="game-entry"
            key={game.id}
            onClick={() => onStartGame(game.id)}
          >
            <img src={game.image()} alt={game.alt} className="game-icon-img" />
            <p>{game.label}</p>
          </button>
        ))}
      </div>
      {/* 通用对话框可以在App.js中管理，或者在这里根据需要弹出 */}
    </div>
  );
}

export default GameLobby;
