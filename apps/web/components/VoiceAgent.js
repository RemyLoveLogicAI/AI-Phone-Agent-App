import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Voice Agent Component
 * Browser-based voice AI client with real-time transcription and audio playback
 */
export default function VoiceAgent() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const processorRef = useRef(null);
  const playbackQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  /**
   * Initialize audio context and socket connection
   */
  useEffect(() => {
    // Initialize Audio Context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });

    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Connect to voice server
   */
  const connect = async () => {
    try {
      setStatus('Connecting...');
      setError(null);

      // Connect to WebSocket
      socketRef.current = io('http://localhost:3001/voice', {
        transports: ['websocket'],
      });

      // Setup socket event handlers
      socketRef.current.on('connect', () => {
        setIsConnected(true);
        setStatus('Connected');
        console.log('Connected to voice server');
      });

      socketRef.current.on('ready', (data) => {
        setStatus('Ready to talk');
        console.log('Voice session ready:', data);
      });

      socketRef.current.on('transcript', (data) => {
        console.log('Transcript:', data);
        setTranscript((prev) => [
          ...prev,
          {
            type: 'user',
            text: data.text,
            isFinal: data.isFinal,
            timestamp: new Date(),
          },
        ]);
      });

      socketRef.current.on('audio', async (data) => {
        // Queue audio for playback
        playbackQueueRef.current.push(new Float32Array(data.audio));
        if (!isPlayingRef.current) {
          playAudioQueue();
        }
      });

      socketRef.current.on('tts_complete', () => {
        console.log('AI finished speaking');
      });

      socketRef.current.on('clear_audio', () => {
        // Clear playback queue (barge-in)
        playbackQueueRef.current = [];
        isPlayingRef.current = false;
        setIsSpeaking(false);
      });

      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
        setStatus('Disconnected');
        console.log('Disconnected from voice server');
      });

      socketRef.current.on('error', (err) => {
        console.error('Socket error:', err);
        setError(err.message || 'Connection error');
        setStatus('Error');
      });
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      setStatus('Error');
    }
  };

  /**
   * Disconnect from voice server
   */
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopRecording();
    setIsConnected(false);
    setStatus('Disconnected');
  };

  /**
   * Start recording microphone
   */
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;

      // Create audio processing pipeline
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!socketRef.current || !isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Send audio to server
        socketRef.current.emit('audio', {
          audio: Array.from(inputData),
          sampleRate: audioContextRef.current.sampleRate,
        });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processorRef.current = processor;
      setIsRecording(true);
      setStatus('Listening...');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone: ' + err.message);
    }
  };

  /**
   * Stop recording microphone
   */
  const stopRecording = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    setIsRecording(false);
    setStatus('Connected');
  };

  /**
   * Play audio queue
   */
  const playAudioQueue = async () => {
    if (playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const audioData = playbackQueueRef.current.shift();

    // Create audio buffer
    const audioBuffer = audioContextRef.current.createBuffer(
      1,
      audioData.length,
      16000,
    );

    audioBuffer.getChannelData(0).set(audioData);

    // Create source and play
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      playAudioQueue();
    };

    source.start(0);
  };

  /**
   * Handle barge-in (interrupt AI)
   */
  const handleBargeIn = () => {
    if (socketRef.current && isSpeaking) {
      socketRef.current.emit('barge_in');
      playbackQueueRef.current = [];
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  };

  /**
   * Toggle recording
   */
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="voice-agent-container">
      <div className="voice-agent-header">
        <h2>🎤 Voice AI Agent</h2>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {status}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="voice-controls">
        {!isConnected ? (
          <button onClick={connect} className="btn btn-primary btn-large">
            Connect to Voice Agent
          </button>
        ) : (
          <>
            <button
              onClick={toggleRecording}
              className={`btn btn-large ${isRecording ? 'btn-danger' : 'btn-success'}`}
            >
              {isRecording ? '⏹️ Stop Listening' : '🎤 Start Listening'}
            </button>

            {isSpeaking && (
              <button onClick={handleBargeIn} className="btn btn-warning">
                ✋ Interrupt AI
              </button>
            )}

            <button onClick={disconnect} className="btn btn-secondary">
              Disconnect
            </button>
          </>
        )}
      </div>

      <div className="transcript-container">
        <h3>Conversation Transcript</h3>
        <div className="transcript-messages">
          {transcript.length === 0 ? (
            <p className="empty-state">Conversation will appear here...</p>
          ) : (
            transcript.map((msg, idx) => (
              <div key={idx} className={`message ${msg.type}`}>
                <span className="message-label">
                  {msg.type === 'user' ? '👤 You' : '🤖 AI'}:
                </span>
                <span className="message-text">{msg.text}</span>
                {!msg.isFinal && <span className="interim">(interim)</span>}
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .voice-agent-container {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .voice-agent-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .status-indicator {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .status-indicator.connected {
          background: #22c55e;
          color: white;
        }

        .status-indicator.disconnected {
          background: #6b7280;
          color: white;
        }

        .error-message {
          background: #fee2e2;
          border: 1px solid #ef4444;
          color: #991b1b;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .voice-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.1rem;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-success {
          background: #22c55e;
          color: white;
        }

        .btn-success:hover {
          background: #16a34a;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-warning {
          background: #f59e0b;
          color: white;
        }

        .btn-warning:hover {
          background: #d97706;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .transcript-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .transcript-container h3 {
          margin-top: 0;
          margin-bottom: 1rem;
        }

        .transcript-messages {
          max-height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          padding: 2rem;
        }

        .message {
          padding: 0.75rem;
          border-radius: 8px;
          line-height: 1.5;
        }

        .message.user {
          background: rgba(59, 130, 246, 0.2);
          border-left: 3px solid #3b82f6;
        }

        .message.assistant {
          background: rgba(34, 197, 94, 0.2);
          border-left: 3px solid #22c55e;
        }

        .message-label {
          font-weight: 600;
          margin-right: 0.5rem;
        }

        .interim {
          color: #9ca3af;
          font-style: italic;
          font-size: 0.85rem;
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
}
