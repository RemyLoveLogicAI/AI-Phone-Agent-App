import Layout from '../components/Layout';
import Dialer from '../components/Dialer';
import LiveCallIntelligence from '../components/LiveCallIntelligence';
import { useState } from 'react';

export default function Calls() {
  const [activeCall, setActiveCall] = useState(null);

  const handleCallStart = (number) => {
    setActiveCall({ number, status: 'calling' });
    // In a real app, we would trigger the API to start the call here
    // fetch('/api/voice/make-call', { method: 'POST', body: JSON.stringify({ to: number }) })
  };

  const handleHangup = () => {
    setActiveCall(null);
  };

  return (
    <Layout>
      <div className="calls-page animate-fade-in">
        <div className="grid-layout">
          <div className="left-panel">
            <h2 className="section-title">Phone</h2>
            {activeCall ? (
              <div className="active-call-card glass-panel">
                <div className="avatar-large">
                  {activeCall.number[0]}
                </div>
                <h3>{activeCall.number}</h3>
                <p className="status">{activeCall.status}...</p>
                <button className="hangup-button" onClick={handleHangup}>
                  End Call
                </button>
              </div>
            ) : (
              <Dialer onCallStart={handleCallStart} />
            )}
          </div>

          <div className="right-panel">
            <h2 className="section-title">Live Intelligence</h2>
            <LiveCallIntelligence isActive={!!activeCall} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .calls-page {
          padding: 2rem;
          height: 100%;
        }

        .grid-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 2rem;
          height: calc(100vh - 4rem);
        }

        .section-title {
          margin-bottom: 1.5rem;
          font-size: 1.2rem;
          color: #888;
        }

        .active-call-card {
          padding: 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          text-align: center;
        }

        .avatar-large {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: 700;
          color: white;
          box-shadow: 0 0 30px rgba(109, 40, 217, 0.5);
        }

        .status {
          color: #10b981;
          animation: pulse 2s infinite;
        }

        .hangup-button {
          background: #ef4444;
          color: white;
          border: none;
          padding: 1rem 3rem;
          border-radius: 30px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 2rem;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
          transition: all 0.2s;
        }

        .hangup-button:hover {
          transform: scale(1.05);
          background: #dc2626;
        }
      `}</style>
    </Layout>
  );
}
