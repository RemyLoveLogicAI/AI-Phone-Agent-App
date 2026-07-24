import { useState, useEffect, useMemo } from 'react';

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
      setActionMessage('');
      return undefined;
    }

    const interval = setInterval(() => {
      // Mock incoming words
      const words = ["Hello", "I", "am", "calling", "about", "the", "pricing", "plans", "you", "offer", "demo", "support", "urgent", "billing"];
      const randomWord = words[Math.floor(Math.random() * words.length)];

      setTranscription(prev => [...prev, randomWord].slice(-120));

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
    const engagement = Math.min(100, 25 + wordCount * 6);
    const sentiment = Math.min(100, 35 + wordCount * 5);
    const responsiveness = Math.max(250, 650 - wordCount * 8);
    const bargeIn = Math.max(300, 980 - wordCount * 10);
    const trustScore = Math.min(0.98, 0.35 + wordCount * 0.02);
    const scamConfidence = Math.max(0.02, 0.2 - wordCount * 0.005);
    const trustTier = trustScore >= 0.9 ? 4 : trustScore >= 0.8 ? 3 : trustScore >= 0.65 ? 2 : trustScore >= 0.5 ? 1 : 0;

    return {
      wordCount,
      engagement,
      sentiment,
      responsiveness,
      bargeIn,
      trustScore,
      trustTier,
      scamConfidence,
    };
  }, [transcription]);

  const intentSummary = useMemo(() => {
    const transcript = transcription.join(' ').toLowerCase();
    if (!transcript) {
      return [
        { label: 'sales_inquiry', value: 0.4 },
        { label: 'support', value: 0.35 },
        { label: 'spam', value: 0.25 },
      ];
    }
    const hasPricing = transcript.includes('pricing');
    const hasSupport = transcript.includes('support');
    const hasUrgent = transcript.includes('urgent');
    if (hasSupport) {
      return [
        { label: 'support', value: 0.7 },
        { label: 'sales_inquiry', value: 0.2 },
        { label: 'spam', value: 0.1 },
      ];
    }
    if (hasPricing) {
      return [
        { label: 'sales_inquiry', value: 0.74 },
        { label: 'support', value: 0.18 },
        { label: 'spam', value: 0.08 },
      ];
    }
    if (hasUrgent) {
      return [
        { label: 'support', value: 0.55 },
        { label: 'sales_inquiry', value: 0.2 },
        { label: 'spam', value: 0.25 },
      ];
    }
    return [
      { label: 'sales_inquiry', value: 0.45 },
      { label: 'support', value: 0.35 },
      { label: 'spam', value: 0.2 },
    ];
  }, [transcription]);

  const policyCues = useMemo(() => {
    if (!isActive) return [];
    const cues = [
      stats.trustTier < 2 && 'Low trust tier: block PII disclosure.',
      stats.scamConfidence > 0.7 && 'High scam confidence: trigger verification script.',
      stats.responsiveness > 600 && 'Latency above warning threshold.',
      stats.bargeIn > 900 && 'Barge-in SLA breach risk.',
    ].filter(Boolean);
    return cues.length > 0 ? cues : ['All systems nominal.'];
  }, [isActive, stats]);

  const actionQueue = useMemo(() => {
    if (!isActive) return [];
    const summary = intentSummary.find((intent) => intent.label === 'sales_inquiry')?.value || 0;
    const support = intentSummary.find((intent) => intent.label === 'support')?.value || 0;
    if (support > summary) {
      return ['Open troubleshooting checklist', 'Offer immediate callback slot', 'Log incident summary'];
    }
    return ['Share pricing overview', 'Offer two scheduling windows', 'Send follow-up SMS'];
  }, [isActive, intentSummary]);

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
          <p className="hint">Target &lt; 400ms</p>
        </div>
      </div>

      <div className="stat-grid secondary">
        <div className="stat">
          <p className="label">Trust tier</p>
          <p className="value">Tier {stats.trustTier}</p>
          <p className="hint">Score {(stats.trustScore * 100).toFixed(0)}%</p>
        </div>
        <div className="stat">
          <p className="label">Barge-in response</p>
          <p className="value">{stats.bargeIn} ms</p>
          <p className="hint">SLA &lt; 900ms</p>
        </div>
        <div className="stat">
          <p className="label">Scam confidence</p>
          <p className="value">{(stats.scamConfidence * 100).toFixed(1)}%</p>
          <p className="hint">Auto-scripts &gt; 70%</p>
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

      <div className="intent-panel">
        <h4>Intent distribution</h4>
        <div className="intent-list">
          {intentSummary.map((intent) => (
            <div key={intent.label} className="intent-row">
              <span className="intent-label">{intent.label.replace('_', ' ')}</span>
              <div className="meter">
                <span style={{ width: `${intent.value * 100}%` }} />
              </div>
              <span className="intent-value">{(intent.value * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="policy-grid">
        <div className="policy-panel">
          <h4>Policy cues</h4>
          <ul>
            {policyCues.map((cue, idx) => (
              <li key={idx}>{cue}</li>
            ))}
          </ul>
        </div>
        <div className="policy-panel">
          <h4>Action queue</h4>
          <ul>
            {actionQueue.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

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
        <button
          className="action"
          onClick={() => setActionMessage('Escalation requested. Handoff brief is ready.')}
          disabled={!isActive}
        >
          🧑‍💼 Escalate
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

        .stat-grid.secondary {
          margin-top: -0.2rem;
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

        .hint {
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
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

        .intent-panel {
          margin-top: 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 0.75rem 1rem;
        }

        .intent-panel h4 {
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          color: #e2e8f0;
        }

        .intent-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .intent-row {
          display: grid;
          grid-template-columns: 1fr 2fr auto;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
        }

        .intent-label {
          text-transform: capitalize;
          color: #cbd5f5;
        }

        .intent-value {
          color: #93c5fd;
          font-weight: 600;
        }

        .policy-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .policy-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 0.75rem 1rem;
        }

        .policy-panel h4 {
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          color: #e2e8f0;
        }

        .policy-panel ul {
          padding-left: 1rem;
          margin: 0;
          color: #cbd5f5;
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
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
