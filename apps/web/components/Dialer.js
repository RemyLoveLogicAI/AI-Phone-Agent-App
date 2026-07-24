import { useState } from 'react';

export default function Dialer({ onCallStart }) {
  const MAX_LENGTH = 15;
  const MIN_LENGTH = 7;
  const [number, setNumber] = useState('');
  const [helperText, setHelperText] = useState('Start dialing or paste a number');
  const isCallReady = number.length >= MIN_LENGTH;

  const normalizeNumber = (value) => value.replace(/[^\d*#]/g, '').slice(0, MAX_LENGTH);

  const handleDigit = (digit) => {
    setNumber((prev) => {
      if (prev.length >= MAX_LENGTH) return prev;
      const nextValue = `${prev}${digit}`;
      if (nextValue.length >= MIN_LENGTH) {
        setHelperText('Ready to place a secure outbound call');
      } else if (nextValue.length >= 3) {
        setHelperText(`Enter at least ${MIN_LENGTH} digits to validate`);
      }
      return nextValue;
    });
  };

  const handleInputChange = (event) => {
    const nextValue = normalizeNumber(event.target.value);
    setNumber(nextValue);
    if (!nextValue) {
      setHelperText('Start dialing or paste a number');
    } else if (nextValue.length < MIN_LENGTH) {
      setHelperText(`Enter at least ${MIN_LENGTH} digits to validate`);
    } else {
      setHelperText('Ready to place a secure outbound call');
    }
  };

  const handleBackspace = () => {
    setNumber((prev) => {
      const updated = prev.slice(0, -1);
      if (updated.length === 0) {
        setHelperText('Start dialing or paste a number');
      } else if (updated.length < 3) {
        setHelperText(`Add a few more digits to validate`);
      } else if (updated.length < MIN_LENGTH) {
        setHelperText(`Enter at least ${MIN_LENGTH} digits to validate`);
      }
      return updated;
    });
  };

  const handleClear = () => {
    setNumber('');
    setHelperText('Start dialing or paste a number');
  };

  const handleCall = () => {
    if (isCallReady) {
      onCallStart(number);
      setHelperText('Connecting to carrier...');
    } else {
      setHelperText(`Enter at least ${MIN_LENGTH} digits before calling`);
    }
  };

  return (
    <div className="dialer-container glass-panel">
      <div className="display" aria-live="polite">
        {number || <span className="placeholder">Enter number...</span>}
      </div>

      <label className="input-label" htmlFor="dialer-input">
        Paste or edit number
      </label>
      <input
        id="dialer-input"
        className="dialer-input"
        type="tel"
        value={number}
        onChange={handleInputChange}
        placeholder="e.g. 4155550102"
        inputMode="numeric"
        aria-label="Dialer input"
      />

      <div className="helper-row">
        <p className="helper-text">{helperText}</p>
        <span className="meta">{number.length}/{MAX_LENGTH}</span>
      </div>

      <div className="controls">
        <button className="pill" onClick={handleBackspace} disabled={!number} aria-label="Delete last digit">
          ⌫ Backspace
        </button>
        <button className="pill" onClick={handleClear} disabled={!number} aria-label="Clear number">
          Clear
        </button>
      </div>

      <div className="keypad" aria-label="Dial pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((digit) => (
          <button
            key={digit}
            className="key glass-button"
            onClick={() => handleDigit(digit)}
            aria-label={`Dial ${digit}`}
          >
            {digit}
          </button>
        ))}
      </div>

      <button className="call-button" onClick={handleCall} disabled={!isCallReady} aria-label="Call number">
        📞
      </button>

      <style jsx>{`
        .dialer-container {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 350px;
          margin: 0 auto;
        }

        .display {
          font-size: 2rem;
          margin-bottom: 1rem;
          min-height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 2px;
          background: rgba(255, 255, 255, 0.02);
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .helper-row {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          color: #888;
          font-size: 0.9rem;
        }

        .helper-text {
          color: #9ca3af;
        }

        .meta {
          font-family: monospace;
          color: #6ee7b7;
        }

        .input-label {
          width: 100%;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b7280;
          margin-bottom: 0.35rem;
        }

        .dialer-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 0.65rem 1rem;
          color: #e5e7eb;
          margin-bottom: 1rem;
        }

        .dialer-input:focus {
          outline: none;
          border-color: var(--primary-glow);
          box-shadow: 0 0 0 2px rgba(109, 40, 217, 0.2);
        }

        .controls {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          width: 100%;
          justify-content: center;
          flex-wrap: wrap;
        }

        .pill {
          background: rgba(255,255,255,0.06);
          color: #cbd5e1;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.5rem 1rem;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pill:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pill:not(:disabled):hover {
          border-color: var(--primary-glow);
          color: white;
        }

        .placeholder {
          color: #666;
          font-size: 1.2rem;
          letter-spacing: normal;
        }

        .keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
          width: 100%;
        }

        .key {
          height: 60px;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
        }

        .call-button {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #34d399);
          border: none;
          color: white;
          font-size: 1.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        .call-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .call-button:not(:disabled):hover {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }

        .call-button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
