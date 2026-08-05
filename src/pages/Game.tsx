import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useStore from '../store';
import useSound from '../hooks/useSound';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Image as ImageIcon, Heart, Lightbulb, FastForward, Clock } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

interface Question {
  id: string;
  difficulty: string;
  topic: string;
  question: string;
  imagePrompt: string;
  imageUrl?: string;
  options: string[];
  explanation?: string;
  timeLimitSeconds: number;
  questionToken: string; // From backend
}

export default function Game() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  const updateUserStats = useStore((state) => state.updateUserStats);
  const { playSound } = useSound();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean, correctAnswer: string, xpDelta: number, coinDelta: number, levelComplete: boolean } | null>(null);
  
  // Phase 4: Progression
  const [lives, setLives] = useState(3);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'gameover' | 'completed'>('playing');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBossLevel = Number(levelId) % 5 === 0;
  const targetScore = isBossLevel ? 10 : 5;

  useEffect(() => {
    if (gameState === 'playing') fetchNextQuestion();
    return () => clearInterval(timerRef.current!);
  }, [levelId, gameState]);

  useEffect(() => {
    if (gameState !== 'playing') {
      clearTimeout(timerRef.current!);
      return;
    }

    if (timeLeft > 0 && !selectedAnswer) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && question && !selectedAnswer) {
      handleTimeUp();
    }
    return () => clearTimeout(timerRef.current!);
  }, [timeLeft, selectedAnswer, question, gameState]);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setResult(null);
    setHiddenOptions([]);
    try {
      const response = await axios.post(`${API_URL}/questions/generate`, { level: Number(levelId) }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestion(response.data);
      setTimeLeft(response.data.timeLimitSeconds);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer || gameState !== 'playing') return;
    setSelectedAnswer(answer);
    
    try {
      const timeTaken = question!.timeLimitSeconds - timeLeft;
      const response = await axios.post(`${API_URL}/game/answer`, {
        questionToken: question!.questionToken,
        selectedAnswer: answer,
        timeTaken
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      const { isCorrect, xpDelta, coinDelta, levelComplete } = response.data;
      setResult(response.data);
      updateUserStats(xpDelta, coinDelta);

      if (isCorrect) {
        playSound('correct');
        const newCorrect = correctAnswers + 1;
        setCorrectAnswers(newCorrect);
        if (levelComplete) {
          setTimeout(() => handleLevelComplete(), 2000);
        }
      } else {
        playSound('wrong');
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setTimeout(() => setGameState('gameover'), 2000);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTimeUp = () => {
    handleAnswer("TIMEOUT");
  };

  const handleLevelComplete = async () => {
    playSound('complete');
    setGameState('completed');
  };

  // Hints
  const useFiftyFifty = async () => {
    if (user!.coins < 10 || hiddenOptions.length > 0 || !question) return;
    
    try {
      const response = await axios.post(`${API_URL}/game/hint`, {
        type: '50-50', questionToken: question.questionToken
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setHiddenOptions(response.data.hiddenOptions);
      updateUserStats(0, -10);
    } catch (error) {
      console.error(error);
    }
  };

  const useSkip = async () => {
    if (user!.coins < 20 || !question) return;
    try {
      updateUserStats(0, -20);
      const newCorrect = correctAnswers + 1;
      setCorrectAnswers(newCorrect);
      if (newCorrect >= targetScore) {
         handleLevelComplete();
      } else {
         fetchNextQuestion();
      }
    } catch (error) {}
  };

  const useExtraTime = async () => {
    if (user!.coins < 5 || !question) return;
    updateUserStats(0, -5);
    setTimeLeft(prev => prev + 15);
  };

  if (loading && gameState === 'playing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-slate-800/80 backdrop-blur-md border-b border-slate-700">
        <button onClick={() => navigate('/')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="font-bold text-lg text-slate-200">
          Level {levelId} - {question?.topic}
          <div className="text-xs text-sky-400 text-center font-normal">Progress: {correctAnswers}/{targetScore}</div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <Heart key={i} className={`w-6 h-6 ${i <= lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'}`} />
          ))}
        </div>
      </div>

      {gameState === 'gameover' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-4xl font-bold text-rose-500 mb-4">Game Over</h2>
          <p className="text-slate-400 mb-8">You ran out of lives!</p>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700 transition-colors border border-slate-700">Back to Map</button>
        </div>
      )}

      {gameState === 'completed' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <TrophyIcon className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-4xl font-bold text-emerald-400 mb-4">Level Cleared!</h2>
          <p className="text-slate-400 mb-8">+100 XP | +50 Coins</p>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-emerald-500 text-slate-900 rounded-xl font-bold hover:bg-emerald-400 transition-colors">Continue</button>
        </div>
      )}

      {gameState === 'playing' && question && (
        <div className="flex-1 flex flex-col items-center p-4 max-w-2xl mx-auto w-full">
          
          {/* Hints Bar */}
          <div className="w-full flex justify-end gap-2 mb-4">
            <button onClick={useFiftyFifty} disabled={user!.coins < 10 || hiddenOptions.length > 0 || !!selectedAnswer} className="flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50">
              <Lightbulb className="w-4 h-4" /> 50/50 (-10)
            </button>
            <button onClick={useExtraTime} disabled={user!.coins < 5 || !!selectedAnswer} className="flex items-center gap-1 text-xs font-bold bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg border border-sky-500/30 hover:bg-sky-500/30 disabled:opacity-50">
              <Clock className="w-4 h-4" /> +15s (-5)
            </button>
            <button onClick={useSkip} disabled={user!.coins < 20 || !!selectedAnswer} className="flex items-center gap-1 text-xs font-bold bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50">
              <FastForward className="w-4 h-4" /> Skip (-20)
            </button>
          </div>

          {/* Timer Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / question.timeLimitSeconds) * 100}%` }}
              transition={{ duration: 1, ease: 'linear' }}
              className={`h-full ${timeLeft > 5 ? 'bg-sky-500' : 'bg-rose-500'}`}
            />
          </div>

          {/* Image Display */}
          <div className="w-full aspect-video bg-slate-800 rounded-2xl mb-8 flex flex-col items-center justify-center text-slate-500 border border-slate-700 overflow-hidden relative shadow-2xl group">
            {question.imageUrl && question.imageUrl.startsWith('http') ? (
              <img src={question.imageUrl} alt={question.imagePrompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <>
                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm">Image: {question.imagePrompt}</span>
              </>
            )}
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] text-white/70">
              Source: Wikimedia / Unsplash
            </div>
          </div>

          {/* Question */}
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{question.question}</h2>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {question.options.map((option, idx) => {
              if (hiddenOptions.includes(option)) {
                 return <div key={idx} className="p-4 rounded-xl border-2 border-slate-800/50 bg-slate-900/50 opacity-20 pointer-events-none text-transparent">Hidden</div>;
              }

              let btnClass = "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-sky-500";
              if (result) {
                if (option === result.correctAnswer) {
                  btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-100";
                } else if (option === selectedAnswer) {
                  btnClass = "bg-rose-500/20 border-rose-500 text-rose-100";
                } else {
                  btnClass = "bg-slate-800 border-slate-700 opacity-50";
                }
              } else if (selectedAnswer === option) {
                btnClass = "bg-sky-500/20 border-sky-500 text-sky-100";
              }

              return (
                <motion.button
                  whileHover={!selectedAnswer ? { scale: 1.02 } : {}}
                  whileTap={!selectedAnswer ? { scale: 0.98 } : {}}
                  key={idx}
                  disabled={!!selectedAnswer}
                  onClick={() => handleAnswer(option)}
                  className={`p-4 rounded-xl border-2 text-lg font-medium transition-all ${btnClass}`}
                >
                  {option}
                </motion.button>
              )
            })}
          </div>

          {/* Result Overlay */}
          <AnimatePresence>
            {result && gameState === 'playing' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-8 p-6 rounded-2xl w-full border ${result.isCorrect ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-rose-500/10 border-rose-500/50'}`}
              >
                <h3 className={`text-2xl font-bold mb-2 ${result.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.isCorrect ? 'Correct!' : 'Incorrect'}
                </h3>
                <p className="text-slate-300 mb-4">{question.explanation}</p>
                
                <div className="flex gap-4 mb-6">
                  <span className={`px-3 py-1 rounded-full font-bold ${result.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.xpDelta > 0 ? '+' : ''}{result.xpDelta} XP
                  </span>
                  {result.coinDelta > 0 && (
                    <span className="px-3 py-1 rounded-full font-bold bg-amber-500/20 text-amber-400">
                      +{result.coinDelta} Coins
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => {
                     // Normally handled by timeouts, but if user clicks next manually
                     if (result.isCorrect && correctAnswers >= targetScore) {
                        handleLevelComplete();
                     } else if (!result.isCorrect && lives <= 0) {
                        setGameState('gameover');
                     } else {
                        fetchNextQuestion();
                     }
                  }}
                  className="w-full py-4 rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-white transition-colors"
                >
                  Next Question
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TrophyIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
  );
}
