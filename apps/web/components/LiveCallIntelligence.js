import { useState, useEffect } from 'react';

export default function LiveCallIntelligence({ isActive }) {
  const [transcription, setTranscription] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Simulate real-time updates for the demo if no real call is active
  // In production, this would connect to a WebSocket
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      // Mock incoming words
      const words = ["Hello", "I", "am", "calling", "about", "the", "pricing", "plans", "you", "offer"];
      const randomWord = words[Math.floor(Math.random() * words.length)];
      
      setTranscription(prev => [...prev, randomWord]);
      
      // Mock AI analysis trigger
      if (Math.random() > 0.8) {
        setAiSuggestion("Caller seems interested in pricing. Suggest the 'Pro' plan.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="intelligence-panel glass-panel">
      <div className="header">
        <h3>Live Call Intelligence</h3>
        <div className={`status-indicator ${isActive ? 'active' : ''}`}>
          {isActive ? 'Listening...' : 'Standby'}
        </div>
      </div>

      <div className="transcription-area">
        {transcription.length === 0 ? (
          <p className="placeholder">Waiting for speech...</p>
        ) : (
          <p className="text">{transcription.join(' ')}</p>
        )}
      </div>

      {aiSuggestion && (
        <div className="ai-suggestion animate-fade-in">
          <span className="ai-icon">✨</span>
          <p>{aiSuggestion}</p>
        </div>
      )}

      <style jsx>{`
        .intelligence-panel {
          padding: 1.5rem;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .status-indicator {
          font-size: 0.8rem;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          color: #888;
        }

        .status-indicator.active {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          animation: pulse 2s infinite;
        }

        .transcription-area {
          flex: 1;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          overflow-y: auto;
          font-family: monospace;
          line-height: 1.5;
        }

        .placeholder {
          color: #666;
          font-style: italic;
        }

        .ai-suggestion {
          background: linear-gradient(135deg, rgba(109, 40, 217, 0.2), rgba(236, 72, 153, 0.2));
          border: 1px solid var(--primary-glow);
          padding: 1rem;
          border-radius: 8px;
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
        }

        .ai-icon {
          font-size: 1.2rem;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
