import Layout from '../components/Layout';
import { useState, useEffect } from 'react';
import { withAuth, useAuth } from '../lib/auth';

function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ calls: [], messages: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Poll every 10 seconds for real-time-ish updates
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const missedCalls = stats.calls.filter(c => c.status === 'no-answer' || c.status === 'busy' || c.status === 'failed').length;
  const recentActivity = [
    ...stats.calls.map(c => ({ type: 'call', ...c, date: new Date(c.dateCreated) })),
    ...stats.messages.map(m => ({ type: 'message', ...m, date: new Date(m.dateSent) }))
  ].sort((a, b) => b.date - a.date).slice(0, 5);

  return (
    <Layout>
      <div className="dashboard-container animate-fade-in">
        <header className="dashboard-header">
          <div className="flex justify-between items-center">
            <div>
              <h1>Welcome Back, {user?.name}</h1>
              <p className="subtitle">Your AI Assistant is active and monitoring calls.</p>
            </div>
            <button 
              onClick={async () => {
                setLoading(true);
                // Simulate a call coming in
                try {
                  await fetch('/api/voice/incoming', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      CallSid: 'sim_' + Date.now(),
                      From: '+15550009999'
                    })
                  });
                  // Refresh stats
                  const res = await fetch('/api/dashboard/stats');
                  if (res.ok) setStats(await res.json());
                } catch (e) {
                  console.error(e);
                } finally {
                  setLoading(false);
                }
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Simulate Incoming Call
            </button>
          </div>
        </header>

        <div className="stats-grid">
          <div className="glass-panel stat-card">
            <h3>Recent Calls</h3>
            <p className="stat-value">{loading ? '-' : stats.calls.length}</p>
          </div>
          <div className="glass-panel stat-card">
            <h3>Missed Calls</h3>
            <p className="stat-value">{loading ? '-' : missedCalls}</p>
          </div>
          <div className="glass-panel stat-card">
            <h3>Recent Messages</h3>
            <p className="stat-value">{loading ? '-' : stats.messages.length}</p>
          </div>
        </div>

        <div className="recent-activity glass-panel">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {loading ? (
              <p style={{padding: '1rem', color: '#888'}}>Loading activity...</p>
            ) : recentActivity.length === 0 ? (
              <p style={{padding: '1rem', color: '#888'}}>No recent activity found.</p>
            ) : (
              recentActivity.map((item) => (
                <div key={item.id} className={`activity-item ${item.aiAnalysis?.isSpam ? 'spam-item' : ''}`}>
                  <span className="icon">{item.type === 'call' ? '📞' : '💬'}</span>
                  <div className="details">
                    <p className="title">
                      {item.type === 'call' 
                        ? `${item.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call: ${item.from === process.env.NEXT_PUBLIC_MY_NUMBER ? item.to : item.from}`
                        : `Message: ${item.body.substring(0, 30)}${item.body.length > 30 ? '...' : ''}`
                      }
                    </p>
                    <p className="time">{item.date.toLocaleString()}</p>
                    
                    {/* AI Insights */}
                    {item.aiAnalysis && (
                      <div className="ai-insights">
                        {item.aiAnalysis.isSpam && <span className="tag spam">🚫 Spam Detected</span>}
                        {item.aiAnalysis.isUrgent && <span className="tag urgent">🔥 Urgent</span>}
                        <p className="summary">"{item.aiAnalysis.summary}"</p>
                      </div>
                    )}
                    {item.transcription && (
                      <p className="transcription">📝 {item.transcription}</p>
                    )}
                  </div>
                  <div className="status-badge" style={{ marginLeft: 'auto' }}>
                    {item.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-header {
          margin-bottom: 3rem;
        }
        
        .subtitle {
          color: #888;
          margin-top: 0.5rem;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        
        .stat-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        
        .stat-card h3 {
          font-size: 0.9rem;
          color: #aaa;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .stat-value {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(to right, var(--primary-glow), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .recent-activity {
          padding: 2rem;
        }
        
        .recent-activity h2 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }
        
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .activity-item:last-child {
          border-bottom: none;
        }
        
        .icon {
          font-size: 1.5rem;
          background: rgba(255,255,255,0.1);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .details .title {
          font-weight: 500;
        }
        
        .details .time {
          font-size: 0.8rem;
          color: #888;
        }

        .status-badge {
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          color: #aaa;
          text-transform: uppercase;
        }

        .spam-item {
          background: rgba(255, 0, 0, 0.05);
        }

        .ai-insights {
          margin-top: 0.5rem;
          font-size: 0.85rem;
        }

        .tag {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 0.5rem;
          font-weight: bold;
          font-size: 0.7rem;
        }

        .tag.spam {
          background: #ff4444;
          color: white;
        }

        .tag.urgent {
          background: #ffbb33;
          color: black;
        }

        .summary {
          color: #ccc;
          font-style: italic;
          margin-top: 0.25rem;
        }

        .transcription {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #888;
          background: rgba(255,255,255,0.05);
          padding: 0.5rem;
          border-radius: 4px;
        }
      `}</style>
    </Layout>
  );
}

export default withAuth(Home);
