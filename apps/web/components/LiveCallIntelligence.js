import { useState, useEffect, useMemo } from 'react';

/**
 * Render a live call intelligence panel that displays real-time transcription, AI suggestions, derived insights, and call stats.
 *
 * When active, the component updates transcription, suggestions, insights, and stats from incoming speech; when not active, it resets transient state.
 * @param {Object} props
 * @param {boolean} props.isActive - Controls whether the panel is actively listening and updating; when false the component clears transient data and stops updates.
 * @returns {JSX.Element} The Live Call Intelligence UI panel.
 */
export default function LiveCallIntelligence({ isActive }) {
  const [transcription, setTranscription] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [insights, setInsights] = useState([]);
  const [actionMessage, setActionMessage] = useState('');

  // Simulate real-time updates for the demo if no real call is active
  // In production, this would connect to a WebSocket
  useEffect(() => {
    if (!isActive) {
      setTranscription([]);
      setAiSuggestion(null);
      setInsights([]);
      return undefined;
    }

    const interval = setInterval(() => {
      // Mock incoming words
      const words = ["Hello", "I", "am", "calling", "about", "the", "pricing", "plans", "you", "offer", "demo", "support", "urgent", "billing"];
      const randomWord = words[Math.floor(Math.random() * words.length)];

      setTranscription(prev => [...prev, randomWord]);

      // Mock AI analysis trigger
      if (Math.random() > 0.8) {
        setAiSuggestion("Caller seems interested in pricing. Suggest the 'Pro' plan.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const joinedText = transcription.join(' ');
    const detectedPricing = joinedText.toLowerCase().includes('pricing');
    const detectedSupport = joinedText.toLowerCase().includes('support');
    const detectedUrgency = joinedText.toLowerCase().includes('urgent');

    const freshInsights = [
      detectedPricing && 'Pricing curiosity detected — prep a value summary.',
      detectedSupport && 'Caller is seeking support — open the troubleshooting checklist.',
      detectedUrgency && 'Urgency keywords detected — prioritize agent pickup.',
    ].filter(Boolean);

    setInsights(freshInsights);

    if (detectedUrgency) {
      setAiSuggestion('Flagging urgency. Offer to escalate or provide immediate callback.');
    }
  }, [isActive, transcription]);

  const stats = useMemo(() => {
    const wordCount = transcription.length;
    const engagement = Math.min(100, 25 + wordCount * 7);
    const sentiment = Math.min(100, 40 + wordCount * 5);
    const responsiveness = Math.max(35, 95 - wordCount * 2);

    return {
      wordCount,
      engagement,
      sentiment,
      responsiveness,
    };
  }, [transcription]);

  return (
    <div className="intelligence-panel glass-panel">
      <div className="header">
        <h3>Live Call Intelligence</h3>
        <div className={`status-indicator ${isActive ? 'active' : ''}`}>
          {isActive ? 'Listening...' : 'Standby'}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <p className="label">Engagement</p>
          <div className="meter">
            <span style={{ width: `${stats.engagement}%` }} />
          </div>
          <p className="value">{stats.engagement}%</p>
        </div>
        <div className="stat">
          <p className="label">Sentiment</p>
          <div className="meter warm">
            <span style={{ width: `${stats.sentiment}%` }} />
          </div>
          <p className="value">{stats.sentiment}%</p>
        </div>
        <div className="stat">
          <p className="label">Response latency</p>
          <p className="value subtle">{stats.responsiveness} ms</p>
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

      {insights.length > 0 && (
        <div className="insights">
          {insights.map((insight, idx) => (
            <span key={idx} className="chip">
              {insight}
            </span>
          ))}
        </div>
      )}

      <div className="action-bar">
        <button
          className="action"
          onClick={() => setActionMessage('Saved a time-stamped marker for follow-up.')}
          disabled={!isActive}
        >
          📍 Drop marker
        </button>
        <button
          className="action"
          onClick={() => setActionMessage('Queued an SMS with your current summary.')}
          disabled={!isActive}
        >
          ✉️ Auto-follow-up
        </button>
      </div>

      {actionMessage && <p className="action-message">{actionMessage}</p>}

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

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 0.75rem;
          border-radius: 12px;
        }

        .label {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 0.35rem;
        }

        .meter {
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          height: 8px;
          overflow: hidden;
        }

        .meter span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #34d399);
          transition: width 0.3s ease;
        }

        .meter.warm span {
          background: linear-gradient(90deg, #f59e0b, #fb7185);
        }

        .value {
          margin-top: 0.35rem;
          font-weight: 600;
        }

        .value.subtle {
          color: #9ca3af;
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

        .insights {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .chip {
          background: rgba(255,255,255,0.08);
          padding: 0.4rem 0.7rem;
          border-radius: 999px;
          font-size: 0.85rem;
          color: #e5e7eb;
        }

        .action-bar {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .action {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: white;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .action:not(:disabled):hover {
          border-color: var(--primary);
          background: rgba(109, 40, 217, 0.15);
        }

        .action-message {
          margin-top: 0.5rem;
          color: #a5b4fc;
          font-size: 0.9rem;
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