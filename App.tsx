

import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Quiz, Score, ProcessedPdf, IncorrectAnswer } from './types.ts';
import PdfUpload from './components/PdfUpload.tsx';
import QuizView from './components/QuizView.tsx';
import Loader from './components/Loader.tsx';
import ProgressBar from './components/ProgressBar.tsx';
import LimitValidationView from './components/LimitValidationView.tsx';
import MistakesReview from './components/MistakesReview.tsx';
import { generateQuizBatchFromText, generateExplanationForMistake } from './services/geminiService.ts';

// This tells TypeScript that pdfjsLib is a global variable from the CDN script
declare const pdfjsLib: any;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const CHARACTER_LIMIT = 1000000;
// Prefetching is triggered when the user reaches the 3rd question.
// Assuming a batch of 20, this happens when the queue length drops to 18.
const PREFETCH_THRESHOLD = 18;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [pdfText, setPdfText] = useState<string>('');
  const [processedPdfs, setProcessedPdfs] = useState<ProcessedPdf[]>([]);
  
  const [quizQueue, setQuizQueue] = useState<Quiz[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState<boolean>(false);
  
  const [score, setScore] = useState<Score>({ correct: 0, total: 0 });
  const [mistakes, setMistakes] = useState<IncorrectAnswer[]>([]);
  const [error, setError] = useState<string>('');
  
  const currentQuiz = quizQueue[0];

  const resetState = () => {
    setAppState(AppState.IDLE);
    setPdfText('');
    setProcessedPdfs([]);
    setQuizQueue([]);
    setAskedQuestions(new Set());
    setIsFetching(false);
    setScore({ correct: 0, total: 0 });
    setMistakes([]);
    setError('');
  };

  // Effect for pre-fetching new questions in the background
  useEffect(() => {
    const prefetchQuestions = async () => {
      if (appState === AppState.QUIZ && pdfText && !isFetching && quizQueue.length <= PREFETCH_THRESHOLD) {
        setIsFetching(true);
        try {
          const quizBatch = await generateQuizBatchFromText(pdfText, Array.from(askedQuestions));
          if (quizBatch && quizBatch.length > 0) {
            // As a safeguard, filter out any questions that the model may have repeated.
            const newUniqueQuestions = quizBatch.filter(q => !askedQuestions.has(q.question));
            
            if (newUniqueQuestions.length > 0) {
              setQuizQueue(prev => [...prev, ...newUniqueQuestions]);
              setAskedQuestions(prevSet => {
                const updatedSet = new Set(prevSet);
                newUniqueQuestions.forEach(q => updatedSet.add(q.question));
                return updatedSet;
              });
            }
          }
        } catch (err) {
          console.error("Failed to pre-fetch next quiz batch:", err);
          // Don't set a fatal error, just log it. The quiz can continue with what's left.
        } finally {
          setIsFetching(false);
        }
      }
    };
    prefetchQuestions();
  }, [quizQueue.length, appState, pdfText, isFetching, askedQuestions]);

  const handleFilesAdded = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    const totalFiles = processedPdfs.length + files.length;
    if (totalFiles > 5) {
        alert(`You can upload a maximum of 5 PDFs. You already have ${processedPdfs.length} and tried to add ${files.length}.`);
        if (appState !== AppState.VALIDATING_LIMITS) {
            setAppState(AppState.IDLE);
        }
        return;
    }
    
    setAppState(AppState.PROCESSING_PDF);

    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      alert('Please select at least one valid PDF file.');
      setAppState(processedPdfs.length > 0 ? AppState.VALIDATING_LIMITS : AppState.IDLE);
      return;
    }

    try {
      const fileProcessingPromises = pdfFiles.map(file => {
        return new Promise<ProcessedPdf>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              if (!event.target?.result) {
                console.error(`File reading failed for ${file.name}.`);
                return resolve({ name: file.name, text: '', charCount: 0 });
              }
              
              const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
              const pdf = await pdfjsLib.getDocument(typedArray).promise;
              let fileText = '';
              
              const pagePromises = Array.from({ length: pdf.numPages }, (_, i) =>
                pdf.getPage(i + 1).then(page => page.getTextContent())
              );

              const allPageTextContents = await Promise.all(pagePromises);
              allPageTextContents.forEach(textContent => {
                fileText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
              });
              
              resolve({ name: file.name, text: fileText, charCount: fileText.length });
            } catch (err) {
                console.error(`Error processing page content for ${file.name}`, err);
                resolve({ name: file.name, text: '', charCount: 0 });
            }
          };
          reader.onerror = () => {
            console.error(`Failed to read file: ${file.name}`);
            resolve({ name: file.name, text: '', charCount: 0 });
          };
          reader.readAsArrayBuffer(file);
        });
      });

      const newPdfs = await Promise.all(fileProcessingPromises);
      
      setProcessedPdfs(prevPdfs => {
        const existingNames = new Set(prevPdfs.map(p => p.name));
        const uniqueNewPdfs = newPdfs.filter(p => p.charCount > 0 && !existingNames.has(p.name));
        const combined = [...prevPdfs, ...uniqueNewPdfs];
        if (combined.length === 0) {
            setError("No text could be extracted from the provided PDF(s). Please check the file(s) and try again.");
            setAppState(AppState.ERROR);
        } else {
            setAppState(AppState.VALIDATING_LIMITS);
        }
        return combined;
      });

    } catch (error) {
        console.error('Error processing PDFs:', error);
        setError('Failed to process one or more PDF files.');
        setAppState(AppState.ERROR);
    }
  }, [processedPdfs, appState]);

  const handleRemovePdf = (name: string) => {
    setProcessedPdfs(prevPdfs => prevPdfs.filter(pdf => pdf.name !== name));
  };

  const handleValidationComplete = async () => {
    const combinedText = processedPdfs.map(p => p.text).join('\n\n');
     if (combinedText.trim().length < 100) {
        setError("The combined text from the selected PDFs is too short. Please add more content.");
        setAppState(AppState.ERROR);
        return;
    }
    setPdfText(combinedText);
    setAppState(AppState.GENERATING_QUIZ);
    setIsFetching(true);
    setError('');
    try {
        const initialBatch = await generateQuizBatchFromText(combinedText, []);
        if (initialBatch && initialBatch.length > 0) {
            setQuizQueue(initialBatch);
            setAskedQuestions(new Set(initialBatch.map(q => q.question)));
            setAppState(AppState.QUIZ);
        } else {
            throw new Error('Failed to generate the initial set of questions. The content may not be suitable.');
        }
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the quiz.');
        setAppState(AppState.ERROR);
    } finally {
        setIsFetching(false);
    }
  };

  const handleNextQuestion = () => {
    setQuizQueue(prev => prev.slice(1));
  };

  const handleAnswer = (isCorrect: boolean, selectedOption: string) => {
    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else if (currentQuiz) {
        const mistakeIndex = mistakes.length;
        const newMistake: IncorrectAnswer = {
            question: currentQuiz.question,
            yourAnswer: selectedOption,
            correctAnswer: currentQuiz.answer,
            explanation: "Generating explanation..." // Placeholder text
        };
        setMistakes(prev => [...prev, newMistake]);

        // Asynchronously fetch the explanation without blocking the UI
        generateExplanationForMistake(
            currentQuiz.question,
            selectedOption,
            currentQuiz.answer,
            pdfText
        ).then(explanation => {
            setMistakes(prevMistakes => {
                const updatedMistakes = [...prevMistakes];
                if (updatedMistakes[mistakeIndex]) {
                    updatedMistakes[mistakeIndex].explanation = explanation ?? "Could not generate an explanation.";
                }
                return updatedMistakes;
            });
        }).catch(err => {
            console.error("Failed to generate explanation:", err);
            setMistakes(prevMistakes => {
                const updatedMistakes = [...prevMistakes];
                 if (updatedMistakes[mistakeIndex]) {
                    updatedMistakes[mistakeIndex].explanation = "An error occurred while generating the explanation.";
                }
                return updatedMistakes;
            });
        });
    }
    setScore(prev => ({ ...prev, total: prev.total + 1 }));
  };
  
  const handleSkipQuestion = () => {
    if (!currentQuiz) return;
    // Treat skip as an incorrect answer
    handleAnswer(false, "Skipped");
    // Move to the next question immediately
    handleNextQuestion();
  };

  const handleEndQuiz = () => {
    setAppState(AppState.QUIZ_ENDED);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
        return <PdfUpload onFilesSelected={handleFilesAdded} limit={CHARACTER_LIMIT} />;
      case AppState.PROCESSING_PDF:
        return <Loader text="Analyzing PDF(s)..." />;
      case AppState.VALIDATING_LIMITS:
        return (
          <LimitValidationView
            pdfs={processedPdfs}
            limit={CHARACTER_LIMIT}
            onConfirm={handleValidationComplete}
            onRemovePdf={handleRemovePdf}
            onCancel={resetState}
            onAddFiles={handleFilesAdded}
          />
        );
      case AppState.GENERATING_QUIZ:
        return <ProgressBar text="Generating questions..." />;
      case AppState.QUIZ:
        if (currentQuiz) {
           return <QuizView key={currentQuiz.question} quiz={currentQuiz} onAnswer={handleAnswer} onNextQuestion={handleNextQuestion} onSkip={handleSkipQuestion} score={score} />;
        }
        if (isFetching) {
            return <Loader text="Fetching more questions..."/>;
        }
        // This case is reached if the queue is empty and we are not fetching.
        // The user can choose to end the quiz, or wait if a fetch failed and they anticipate it will be retried.
        return (
            <div className="text-center animate-fade-in">
                <h2 className="text-xl text-gray-300 mb-4">You've answered all available questions.</h2>
                <p className="text-gray-400 mb-6">You can review your answers or wait for more questions to load if available.</p>
                <button
                    onClick={handleEndQuiz}
                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-transform transform hover:scale-105"
                >
                    Review & Finish
                </button>
            </div>
        );
      case AppState.QUIZ_ENDED:
        return (
          <MistakesReview
            score={score}
            mistakes={mistakes}
            onStartOver={resetState}
          />
        );
      case AppState.ERROR:
        return (
          <div className="text-center animate-fade-in">
            <h2 className="text-xl text-red-400 mb-4">An Error Occurred</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={resetState}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-transform transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-70"></div>
       <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20800%20800%22%3E%3Cg%20fill=%22none%22%20stroke=%22%232A0E61%22%20stroke-width=%221%22%3E%3Cpath%20d=%22M769%20229L1037%20260.9M927%20880L731%20737%20M72.5%20274.5l-95-99%20M-1.5%20440.5l-142-142%22/%3E%3Cpath%20d=%22M-24.5%20204.5L147%20108.5%20M695%20160L545%20111%20M-46.5%20925.5l14-158%22/%3E%3Cpath%20d=%22M884%20229L833%20343%20M322%20352L179%20314%20M876%20792L732%20732%22/%3E%3Cpath%20d=%22M944%20300L853%20260%20M316%20484L179%20522%20M239%20804L356%20749%22/%3E%3Cpath%20d=%22M819%20550L732%20732%20M222%20288L179%20314%20M463%20925L623%20732%20M695%20160L545%20111%20M-14.5%20424.5L146%20463.5M-12.5%20642.5L210%20463.5%22/%3E%3C/g%3E%3Cg%20fill=%22%2321094E%22%3E%3Ccircle%20cx=%22769%22%20cy=%22229%22%20r=%222%22/%3E%3Ccircle%20cx=%22927%22%20cy=%22880%22%20r=%222%22/%3E%3Ccircle%20cx=%22463%22%20cy=%22925%22%20r=%222%22/%3E%3Ccircle%20cx=%22623%22%20cy=%22732%22%20r=%222%22/%3E%3Ccircle%20cx=%221037%22%20cy=%22260.9%22%20r=%222%22/%3E%3Ccircle%20cx=%22731%22%20cy=%22737%22%20r=%222%22/%3E%3Ccircle%20cx=%22-24.5%22%20cy=%22204.5%22%20r=%222%22/%3E%3Ccircle%20cx=%22147%22%20cy=%22108.5%22%20r=%222%22/%3E%3Ccircle%20cx=%22-46.5%22%20cy=%22925.5%22%20r=%222%22/%3E%3Ccircle%20cx=%22884%22%20cy=%22229%22%20r=%222%22/%3E%3Ccircle%20cx=%22833%22%20cy=%22343%22%20r=%222%22/%3E%3Ccircle%20cx=%22322%22%20cy=%22352%22%20r=%222%22/%3E%3Ccircle%20cx=%22179%22%20cy=%22314%22%20r=%222%22/%3E%3Ccircle%20cx=%22876%22%20cy=%22792%22%20r=%222%22/%3E%3Ccircle%20cx=%22732%22%20cy=%22732%22%20r=%222%22/%3E%3Ccircle%20cx=%22944%22%20cy=%22300%22%20r=%222%22/%3E%3Ccircle%20cx=%22853%22%20cy=%22260%22%20r=%222%22/%3E%3Ccircle%20cx=%22316%22%20cy=%22484%22%20r=%222%22/%3E%3Ccircle%20cx=%22179%22%20cy=%22522%22%20r=%222%22/%3E%3Ccircle%20cx=%22239%22%20cy=%22804%22%20r=%222%22/%3E%3Ccircle%20cx=%22356%22%20cy=%22749%22%20r=%222%22/%3E%3Ccircle%20cx=%22819%22%20cy=%22550%22%20r=%222%22/%3E%3Ccircle%20cx=%22222%22%20cy=%22288%22%20r=%222%22/%3E%3Ccircle%2
cx=%22-14.5%22%20cy=%22424.5%22%20r=%222%22/%3E%3Ccircle%20cx=%22146%22%20cy=%22463.5%22%20r=%222%22/%3E%3Ccircle%20cx=%22-12.5%22%20cy=%22642.5%22%20r=%222%22/%3E%3Ccircle%20cx=%22210%22%20cy=%22463.5%22%20r=%222%22/%3E%3C/g%3E%3C/svg%3E')] opacity-10"></div>
       <div className="w-full max-w-2xl mx-auto z-10">
        <header className="text-center mb-8 animate-fade-in" style={{animationDelay: '100ms'}}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
              PDF Quizzer
            </h1>
            <p className="mt-2 text-lg text-gray-400">Upload PDFs and test your knowledge with AI-generated questions.</p>
        </header>
        <main className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-6 md:p-8 min-h-[300px] flex items-center justify-center transition-all duration-300">
          {renderContent()}
        </main>
        <footer className="text-center mt-8 text-gray-500 text-sm animate-fade-in" style={{animationDelay: '300ms'}}>
            <p>By Sahejvir Singh</p>
            {appState === AppState.QUIZ && (
                <div className="mt-4 h-6 flex items-center justify-center gap-x-6">
                    {isFetching && quizQueue.length > 0 && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 animate-fade-in">
                            <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-purple-400"></div>
                            <span>Loading next batch...</span>
                        </div>
                    )}
                    <button onClick={handleEndQuiz} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Review & Finish</button>
                </div>
            )}
        </footer>
       </div>
    </div>
  );
};

export default App;