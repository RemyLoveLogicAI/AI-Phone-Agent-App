import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Lock, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function Login() {
  const [step, setStep] = useState(1); // 1: Credentials, 2: Voice 2FA
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
        
        if (result.toLowerCase().includes('authenticate') || result.toLowerCase().includes('login')) {
          handleVoiceSuccess();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error(event.error);
        setIsListening(false);
        setError('Voice recognition failed. Please try again.');
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleCredentialSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setStep(2);
  };

  const startListening = () => {
    setError('');
    setIsListening(true);
    setTranscript('');
    recognitionRef.current?.start();
  };

  const handleVoiceSuccess = async () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsLoading(true);
    
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError('Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Agent Access
            </h1>
            <p className="text-gray-400 mt-2">Secure AI Terminal</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleCredentialSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Identity</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="agent@example.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Passcode</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 group"
                >
                  Proceed to Verification
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <div className={`absolute inset-0 rounded-full border-2 border-blue-500/30 ${isListening ? 'animate-ping' : ''}`} />
                  <button
                    onClick={startListening}
                    disabled={isLoading}
                    className={`relative z-10 w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening ? 'bg-blue-600 scale-110' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Mic className={`w-8 h-8 ${isListening ? 'text-white' : 'text-blue-400'}`} />
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Voice Verification</h3>
                  <p className="text-gray-400 text-sm">
                    Click the microphone and say <br/>
                    <span className="text-white font-mono bg-white/10 px-2 py-1 rounded mt-2 inline-block">"Authenticate me"</span>
                  </p>
                </div>

                <div className="h-12 flex items-center justify-center">
                  {transcript ? (
                    <p className="text-blue-300 italic">"{transcript}"</p>
                  ) : (
                    <p className="text-gray-600 text-sm">Waiting for voice input...</p>
                  )}
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}

                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Back to credentials
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
