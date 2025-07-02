import React from 'react';
import { Score, IncorrectAnswer } from '../types.ts';
import { CheckIcon } from './icons/CheckIcon.tsx';
import { XIcon } from './icons/XIcon.tsx';

interface MistakesReviewProps {
  score: Score;
  mistakes: IncorrectAnswer[];
  onStartOver: () => void;
}

const MistakesReview: React.FC<MistakesReviewProps> = ({ score, mistakes, onStartOver }) => {
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="w-full animate-fade-in text-gray-200">
      <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
        Quiz Complete!
      </h2>
      <div className="text-center text-gray-400 mb-6 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
        <p className="text-xl">
          Final Score: <span className="font-bold text-white">{score.correct} / {score.total}</span>
        </p>
        <p className="text-lg">
          Accuracy: <span className="font-bold text-white">{accuracy}%</span>
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-center border-b border-gray-700 pb-2 animate-slide-in-up" style={{ animationDelay: '300ms' }}>Mistakes Review</h3>
        {mistakes.length === 0 ? (
          <p className="text-center text-green-400 bg-green-900/50 p-4 rounded-lg animate-fade-in" style={{ animationDelay: '400ms' }}>
            🎉 Congratulations! You made no mistakes. Perfect score! 🎉
          </p>
        ) : (
          <div className="space-y-4">
            {mistakes.map((mistake, index) => (
              <div 
                key={index} 
                className="group relative bg-gray-900/70 p-4 rounded-lg border border-gray-700 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-900/20 animate-slide-in-up group-hover:z-20"
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                <p className="font-semibold text-gray-300 mb-3">{index + 1}. {mistake.question}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start bg-red-900/60 p-2 rounded-md">
                    <XIcon className="w-5 h-5 mr-3 text-red-400 flex-shrink-0 mt-1" />
                    <div>
                      <span className="font-medium text-red-300">Your Answer: </span>
                      <span className="text-red-200">{mistake.yourAnswer}</span>
                    </div>
                  </div>
                  <div className="flex items-start bg-green-900/60 p-2 rounded-md">
                    <CheckIcon className="w-5 h-5 mr-3 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <span className="font-medium text-green-300">Correct Answer: </span>
                      <span className="text-green-200">{mistake.correctAnswer}</span>
                    </div>
                  </div>
                </div>

                {/* Explanation Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 max-w-sm p-3 bg-gray-950 border border-indigo-500 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 transform group-hover:scale-100 scale-95">
                  <h4 className="font-bold text-indigo-400 mb-1 text-base">Explanation</h4>
                  <p className="text-sm text-gray-300 italic">
                    {mistake.explanation || 'No explanation available.'}
                  </p>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-indigo-500"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '600ms' }}>
        <button
          onClick={onStartOver}
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transform hover:scale-105 transition-transform"
        >
          Start New Quiz
        </button>
      </div>
    </div>
  );
};

export default MistakesReview;