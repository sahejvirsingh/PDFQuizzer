import React, { useState, useEffect } from 'react';
import { Quiz, Score } from '../types.ts';
import { CheckIcon } from './icons/CheckIcon.tsx';
import { XIcon } from './icons/XIcon.tsx';

interface QuizViewProps {
  quiz: Quiz;
  score: Score;
  onAnswer: (isCorrect: boolean, selectedOption: string) => void;
  onNextQuestion: () => void;
  onSkip: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ quiz, score, onAnswer, onNextQuestion, onSkip }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [quiz]);

  const handleAnswerClick = (option: string) => {
    if (isAnswered) return;

    const isCorrect = option === quiz.answer;
    setSelectedAnswer(option);
    setIsAnswered(true);
    onAnswer(isCorrect, option);
  };

  const getButtonClass = (option: string) => {
    if (!isAnswered) {
      return 'bg-gray-700 hover:bg-gray-600 transform hover:scale-[1.03]';
    }
    if (option === quiz.answer) {
      return 'bg-green-500/80 ring-2 ring-green-400 scale-105';
    }
    if (option === selectedAnswer) {
      return 'bg-red-500/80';
    }
    return 'bg-gray-700 opacity-50';
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="text-right text-lg font-bold text-gray-300 mb-4 tracking-wider animate-fade-in">
        Score: <span className="text-purple-400 transition-colors">{score.correct}</span> / {score.total}
      </div>
      <div className="bg-gray-900/50 p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-100 mb-6 animate-slide-in-up" style={{ animationDelay: '100ms' }}>{quiz.question}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quiz.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerClick(option)}
              disabled={isAnswered}
              className={`p-4 rounded-lg text-left transition-all duration-300 text-white font-medium flex items-center justify-between animate-slide-in-up ${getButtonClass(option)} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ animationDelay: `${200 + index * 100}ms` }}
            >
              <span>{option}</span>
              {isAnswered && option === quiz.answer && <CheckIcon className="w-6 h-6 text-white" />}
              {isAnswered && option === selectedAnswer && option !== quiz.answer && <XIcon className="w-6 h-6 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center h-[52px] flex items-center justify-center">
        {isAnswered ? (
          <div className="animate-fade-in w-full" style={{ animationDelay: '500ms' }}>
            <button
              onClick={onNextQuestion}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transform hover:scale-105 transition-transform"
            >
              Next Question
            </button>
          </div>
        ) : (
          <div className="animate-fade-in w-full">
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-white font-semibold transition-colors py-2 px-4 rounded-lg hover:bg-gray-700/50"
            >
              Skip
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default QuizView;