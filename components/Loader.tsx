import React from 'react';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
      <p className="mt-4 text-lg text-gray-300">{text}</p>
    </div>
  );
};

export default Loader;
