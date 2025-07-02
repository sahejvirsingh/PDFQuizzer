
import React, { useMemo, useRef } from 'react';
import { ProcessedPdf } from '../types.ts';

interface LimitValidationViewProps {
  pdfs: ProcessedPdf[];
  limit: number;
  onConfirm: () => void;
  onRemovePdf: (name: string) => void;
  onCancel: () => void;
  onAddFiles: (files: FileList) => void;
}

const LimitValidationView: React.FC<LimitValidationViewProps> = ({
  pdfs,
  limit,
  onConfirm,
  onRemovePdf,
  onCancel,
  onAddFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAnyOverLimit = useMemo(() => {
    return pdfs.some(pdf => pdf.charCount > limit);
  }, [pdfs, limit]);

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      if(e.target) e.target.value = '';
    }
  };

  return (
    <div className="w-full animate-fade-in text-gray-200">
      <h2 className="text-2xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
        Review Your Documents
      </h2>
      <p className="text-center text-gray-400 mb-6">
        A quiz will be generated from the combined text. Each PDF cannot exceed {limit.toLocaleString()} characters.
      </p>

      {isAnyOverLimit && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm animate-fade-in">
          <p><span className="font-bold">Action Required:</span> Remove documents that exceed the character limit to continue.</p>
        </div>
      )}

      {/* File List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {pdfs.map((pdf, index) => {
          const isPdfOverLimit = pdf.charCount > limit;
          const percentage = Math.min((pdf.charCount / limit) * 100, 100);
          return (
            <div 
              key={pdf.name} 
              className="flex flex-col bg-gray-900/70 p-3 rounded-lg border transition-colors animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms`, borderColor: isPdfOverLimit ? 'rgba(220, 38, 38, 0.5)' : 'transparent' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={pdf.name}>{pdf.name}</p>
                  <p className={`text-sm ${isPdfOverLimit ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                    {pdf.charCount.toLocaleString()} characters
                    {isPdfOverLimit && ` (Limit Exceeded)`}
                  </p>
                </div>
                <button
                  onClick={() => onRemovePdf(pdf.name)}
                  className="ml-4 px-3 py-1 text-sm bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 flex-shrink-0 transition-transform transform hover:scale-105"
                >
                  Remove
                </button>
              </div>
               <div className="w-full bg-gray-700/50 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${isPdfOverLimit ? 'bg-red-500' : 'bg-indigo-500'}`}
                      style={{ width: `${percentage}%` }}
                  ></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Cancel Button: Left on desktop, bottom-centered on mobile */}
        <div className="w-full sm:w-auto order-last sm:order-first flex justify-center">
          <button
              onClick={onCancel}
              className="px-6 py-2 text-gray-300 hover:text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
          >
              Cancel
          </button>
        </div>
        
        {/* Main Actions: Right on desktop, top on mobile */}
        <div className="w-full sm:w-auto order-first sm:order-last flex flex-col sm:flex-row-reverse gap-4">
            <button
              onClick={onConfirm}
              disabled={isAnyOverLimit || pdfs.length === 0}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 transition-all transform hover:scale-105 disabled:transform-none"
            >
              Generate Quiz
            </button>
            <button
                onClick={handleAddClick}
                className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-transform transform hover:scale-105"
            >
                Add More PDFs...
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="application/pdf"
                multiple
            />
        </div>
      </div>
    </div>
  );
};

export default LimitValidationView;
