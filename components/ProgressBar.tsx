import React from 'react';

interface ProgressBarProps {
  text?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ text = "Loading..." }) => {
  return (
    <div className="w-full max-w-md mx-auto text-center animate-fade-in">
        <div className="relative w-full bg-gray-700 rounded-full h-4 overflow-hidden border border-gray-600">
            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 animate-indeterminate-bar"></div>
        </div>
      <p className="mt-4 text-lg text-gray-300">{text}</p>
    </div>
  );
};

export default ProgressBar;
