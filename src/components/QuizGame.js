import React, { useState, useEffect, useCallback } from 'react';
import './QuizGame.css';
import { getRandomImage } from '../config/images'; // 假设图片配置在 config 文件夹下

const QuizGame = ({ gameId, gameTitle, quizDataPath, onGoBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [feedbackImage, setFeedbackImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 动态 import() 返回一个 Promise
      // JSON 文件需要放置在 src/data/ 目录下
      const module = await import(`../data/${quizDataPath}`);
      const allQuestions = module.default;

      if (!allQuestions || allQuestions.length === 0) {
        throw new Error('No questions found in the data file.');
      }
      // 随机选择10道题，如果总题数少于10，则选择所有题目
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      setQuestions(shuffled.slice(0, Math.min(10, shuffled.length)));
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowAnswer(false);
      setIsCorrect(null);
      setGameOver(false);
      setFeedbackImage(null);
    } catch (err) {
      console.error('Failed to load quiz data:', err);
      setError(`加载题目失败: ${err.message}。请确保 ${quizDataPath} 文件存在于 src/data/ 目录下并且格式正确。`);
      setQuestions([]); // 清空题目以防意外
    } finally {
      setIsLoading(false);
    }
  }, [quizDataPath]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleAnswer = (selectedOptionIndex) => {
    const currentQuestion = questions[currentQuestionIndex];
    // Convert index (0, 1, 2, 3) to letter ('A', 'B', 'C', 'D')
    const selectedAnswerLetter = String.fromCharCode(65 + selectedOptionIndex);
    const correct = selectedAnswerLetter === currentQuestion.answer;
    setIsCorrect(correct);
    if (correct) {
      setScore(score + 1);
    }
    setShowAnswer(true);
    setFeedbackImage(getRandomImage());

    setTimeout(() => {
      setShowAnswer(false);
      setFeedbackImage(null);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setGameOver(true);
      }
    }, 3500); // 答案反馈显示3.5秒 (增加显示时间以阅读解析)
  };

  const restartGame = () => {
    loadQuestions(); // 重新加载题目并重置状态
  };

  if (isLoading) {
    return <div className="quiz-loading">加载中...</div>;
  }

  if (error) {
    return (
      <div className="quiz-error-container">
        <p className="quiz-error-message">{error}</p>
        <button onClick={onGoBack} className="quiz-back-button">返回大厅</button>
      </div>
    );
  }

  if (questions.length === 0 && !isLoading) {
    return (
      <div className="quiz-container">
        <h2>{gameTitle}</h2>
        <p>没有可用的题目。请检查题目文件。</p>
        <button onClick={onGoBack} className="quiz-back-button">返回大厅</button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="quiz-game-over-modal">
        <div className="quiz-modal-content">
          <img src={getRandomImage()} alt="Game Over" className="quiz-modal-image" />
          <h2>恭喜通关！</h2>
          <p>你的得分: {score} / {questions.length}</p>
          <div className="quiz-modal-buttons">
            <button onClick={restartGame} className="quiz-restart-button">再玩一次</button>
            <button onClick={onGoBack} className="quiz-back-button">返回大厅</button>
          </div>
        </div>
      </div>
    );
  }

  if (showAnswer) {
    return (
      <div className={`quiz-feedback-modal ${isCorrect ? 'correct' : 'incorrect'}`}>
        <div className="quiz-modal-content">
          {feedbackImage && <img src={feedbackImage} alt="Feedback" className="quiz-modal-image" />}
          <p>{isCorrect ? '答对啦！棒棒！' : '答错了哦，再接再厉！'}</p>
          {!isCorrect && questions[currentQuestionIndex] && (
            <p className="quiz-correct-answer-text">正确答案是: {questions[currentQuestionIndex].answer.toUpperCase() /* Ensure uppercase for display */}</p>
          )}
          {questions[currentQuestionIndex] && questions[currentQuestionIndex].explanation && (
            <p className="quiz-explanation-text">解析: {questions[currentQuestionIndex].explanation}</p>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="quiz-container">
      <h2>{gameTitle}</h2>
      <div className="quiz-progress">
        题目: {currentQuestionIndex + 1} / {questions.length} | 得分: {score}
      </div>
      {currentQuestion && (
        <div className="quiz-question-area">
          <p className="quiz-question-text">{currentQuestion.question}</p>
          <div className="quiz-options">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)} // Pass index instead of option text
                className="quiz-option-button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
      <button onClick={onGoBack} className="quiz-back-button quiz-main-back-button">返回大厅</button>
    </div>
  );
};

export default QuizGame;