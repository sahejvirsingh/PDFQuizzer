
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon.tsx';

interface PdfUploadProps {
  onFilesSelected: (files: FileList) => void;
  limit: number;
}

const PdfUpload: React.FC<PdfUploadProps> = ({ onFilesSelected, limit }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div className="w-full text-center">
      <label
        htmlFor="pdf-upload"
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ease-in-out ${isDragging ? 'border-indigo-400 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-10 h-10 mb-4 text-gray-400" />
          <p className="mb-2 text-sm text-gray-400">
            <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">PDFs (up to 5 files, {limit.toLocaleString()} characters per PDF)</p>
        </div>
        <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} multiple />
      </label>
    </div>
  );
};

export default PdfUpload;
