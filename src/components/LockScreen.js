import React, { useState } from 'react';
import './LockScreen.css';

// 假设正确的答案，实际应用中可以更灵活
const CORRECT_ANSWER = '猪一头！';

function LockScreen({ onUnlock }) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (answer.trim() === CORRECT_ANSWER) {
      onUnlock();
    } else {
      setError('再想想哦~');
      // 可以考虑在这里添加一个Chiikawa捂脸表情的图片或Emoji
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-screen-content">
        <h1>猪一头23岁生日快乐！永远爱你！</h1>
        <p className="question">绵绵最喜欢的小猪是谁！（注意标点符号）</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setError(''); // 清除错误提示当用户开始输入
            }}
            placeholder="请输入答案"
            maxLength="10"
          />
          <button type="submit" className="submit-button">确认</button>
        </form>
        {error && (
          <div className="error-message">
            <span role="img" aria-label="捂脸">🙈</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default LockScreen;