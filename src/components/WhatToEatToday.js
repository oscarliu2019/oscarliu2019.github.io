import React, { useState, useEffect, useRef } from 'react';
import './WhatToEatToday.css';
import { getRandomImage, getSpecificImage } from '../config/images';

// 食物选项列表
const FOOD_OPTIONS = [
  '王富贵海鲜火锅', '鸿姐火锅', '潮汕牛肉火锅', '费大厨辣椒炒肉', '郭姐 威海渔村', '海底捞',
  '一绪 寿喜烧', '哥哥的深夜食堂', '清风人家', '醉亭记黑鱼煲', '满记甜品', '宴平乐',
  '财记甜铺', '侠晨鸡腿', '齐齐哈尔炭火烤肉', '云中鱼蒸汽石锅鱼', '蟹黄面', '挨饿',
  '贵州酸汤鱼', '吃爸爸妈妈的菜', '自己做', '绵绵做的菜', '人和馆', '哈灵面馆',
  '万岛日料', '电网奉贤食堂', '电网总部食堂', '电网惠南食堂', '尚浦中心', 'meet678',
  '兰州拉面', '本帮菜', '白斩鸡', '热干面', '泰国菜', '日料',
  '韭菜炒蛏子', '娃娃菜西红柿汤', '馄饨', '本帮菜', '凉皮', '台州菜',
  '花花现', '小笼包', '香满庭', '奈雪', '裕莲茶楼', '喜茶',
  '麦当劳', '肯德基', '汉堡王', '赛百味','川流不息','大森的深夜食堂',
  '霸王茶姬', '胡子大厨', '四海游龙', '袁记云饺', '萨莉亚',
  '酸菜鱼', '段氏龙虾', '星巴克', '一点点', '毛血旺', '水煮鱼'
];

function WhatToEatToday({ onGoBack }) {
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'userOptions', 'randomFood'
  const [userInput, setUserInput] = useState('');
  const [options, setOptions] = useState([]);
  const [result, setResult] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayOptions, setDisplayOptions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const spinIntervalRef = useRef(null);
  const spinTimeoutRef = useRef(null);

  useEffect(() => {
    setBackgroundImage(getRandomImage());
  }, []);

  // 组件卸载时清理转盘定时器，避免卸载后 setState 报错与内存泄漏
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  // 处理用户输入的食物选项
  const handleUserOptionsSubmit = () => {
    if (userInput.trim()) {
      // 支持全角和半角逗号、顿号、空格作为分隔符
      const userOptions = userInput.split(/[,，、\s]+/).filter(option => option.trim());
      if (userOptions.length > 0) {
        setOptions(userOptions);
        setDisplayOptions(userOptions);
        setGameMode('userOptions');
      }
    }
  };

  // 开始随机选择动画
  const startRandomSelection = (optionList) => {
    // 边界防护：没有可选项时直接返回，避免取模除零与越界
    if (!optionList || optionList.length === 0) return;
    // 若已有动画在进行，先清理，避免叠加多个定时器
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);

    setIsSpinning(true);
    setResult('');
    setShowResultModal(false);
    
    let currentIndex = 0;
    spinIntervalRef.current = setInterval(() => {
      setHighlightedIndex(currentIndex);
      currentIndex = (currentIndex + 1) % optionList.length;
    }, 100);

    // 3秒后停止动画并显示结果
    spinTimeoutRef.current = setTimeout(() => {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
      const randomIndex = Math.floor(Math.random() * optionList.length);
      
      // 使用函数式更新确保状态一致性
      setHighlightedIndex(randomIndex);
      setResult(`今天吃: ${optionList[randomIndex]}! 🎉`);
      setIsSpinning(false);
      setShowResultModal(true); // 显示结果弹窗
    }, 3000);
  };

  // 处理随机食物选择
  const handleRandomFood = () => {
    setDisplayOptions(FOOD_OPTIONS);
    setGameMode('randomFood');
    startRandomSelection(FOOD_OPTIONS);
  };

  // 重置游戏
  const resetGame = () => {
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    spinIntervalRef.current = null;
    spinTimeoutRef.current = null;
    setGameMode('menu');
    setUserInput('');
    setOptions([]);
    setResult('');
    setDisplayOptions([]);
    setHighlightedIndex(-1);
    setIsSpinning(false);
    setShowResultModal(false);
  };

  return (
    <div className="what-to-eat-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="content-overlay">
        <button className="back-button" onClick={onGoBack}>
          返回大厅
        </button>
        
        {gameMode === 'menu' && (
          <div className="menu-screen">
            <h1 className="game-title">今天吃什么?</h1>
            <div className="menu-options">
              <div className="menu-option" onClick={() => setGameMode('userInput')}>
                <img src={getSpecificImage('1') || getRandomImage()} alt="用户选项" className="option-image" />
                <h2>我来给你选项</h2>
                <p>输入你纠结的美食选项，让我帮你决定</p>
              </div>
              <div className="menu-option" onClick={handleRandomFood}>
                <img src={getSpecificImage('2') || getRandomImage()} alt="随机食物" className="option-image" />
                <h2>完全随机</h2>
                <p>不知道吃什么？让我给你推荐一个美食</p>
              </div>
            </div>
          </div>
        )}

        {gameMode === 'userInput' && (
          <div className="user-input-screen">
            <h1 className="game-title">输入你的选项</h1>
            <div className="input-container">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="输入你纠结的美食选项，用全角或半角逗号、顿号、空格分隔&#10;例如：重庆火锅, 四川麻辣火锅, 日式寿司, 意大利披萨"
                className="food-input"
                rows={4}
              />
              <div className="button-group">
                <button 
                  className="submit-button" 
                  onClick={handleUserOptionsSubmit}
                  disabled={!userInput.trim()}
                >
                  开始选择
                </button>
                <button className="back-button" onClick={() => setGameMode('menu')}>
                  返回
                </button>
              </div>
            </div>
          </div>
        )}

        {(gameMode === 'userOptions' || gameMode === 'randomFood') && (
          <div className="selection-screen">
            <h1 className="game-title">选择中...</h1>
            <div className="options-display">
              {displayOptions.map((option, index) => (
                <div 
                  key={index} 
                  className={`option-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                >
                  {option}
                </div>
              ))}
            </div>
            <div className="button-group">
              {!isSpinning && gameMode === 'userOptions' && (
                <button 
                  className="spin-button" 
                  onClick={() => startRandomSelection(options)}
                >
                  开始选择
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* 结果弹窗 */}
        {showResultModal && (
          <div className="result-modal-overlay">
            <div className="result-modal">
              <div className="result-modal-content">
                <h2 className="result">{result}</h2>
                <div className="result-image">
                  <img src={getSpecificImage('100') || getRandomImage()} alt="结果" />
                </div>
                <div className="modal-buttons">
                  <button className="restart-button" onClick={resetGame}>
                    重新选择
                  </button>
                  <button className="close-modal-button" onClick={() => setShowResultModal(false)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatToEatToday;