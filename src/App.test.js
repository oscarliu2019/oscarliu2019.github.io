import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  test('renders the lock screen initially', () => {
    render(<App />);

    expect(screen.getByText('绵绵最喜欢的小猪是谁！（注意标点符号）')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '' })).toHaveAttribute('placeholder', '请输入答案');
    expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
  });

  test('keeps the app locked when the answer is wrong', () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('请输入答案'), {
      target: { value: '错误答案' }
    });
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    expect(screen.getByText(/再想想哦/)).toBeInTheDocument();
    expect(screen.queryByText('Chiikawa的游戏屋')).not.toBeInTheDocument();
  });

  test('unlocks the lobby and exposes the new games as buttons', () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('请输入答案'), {
      target: { value: '猪一头！' }
    });
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    expect(screen.getByText('Chiikawa的游戏屋')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /一句话侦探/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /本地海龟汤/ })).toBeInTheDocument();
  });
});
