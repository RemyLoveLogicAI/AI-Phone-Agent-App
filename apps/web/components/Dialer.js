import { useState } from 'react';

export default function Dialer({ onCallStart }) {
  const [number, setNumber] = useState('');

  const handleDigit = (digit) => {
    setNumber(prev => prev + digit);
  };

  const handleCall = () => {
    if (number) {
      onCallStart(number);
    }
  };

  return (
    <div className="dialer-container glass-panel">
      <div className="display">
        {number || <span className="placeholder">Enter number...</span>}
      </div>
      
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((digit) => (
          <button key={digit} className="key glass-button" onClick={() => handleDigit(digit)}>
            {digit}
          </button>
        ))}
      </div>

      <button className="call-button" onClick={handleCall}>
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
          margin-bottom: 2rem;
          height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 2px;
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
          border-radius: 50%;
        }

        .call-button {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #10b981;
          border: none;
          color: white;
          font-size: 1.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        .call-button:hover {
          transform: scale(1.05);
        }

        .call-button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
