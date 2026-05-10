import Layout from '../components/Layout';
import VoiceAgent from '../components/VoiceAgent';
import { withAuth } from '../lib/auth';

/**
 * Voice AI Demo Page
 * Browser-based voice interaction with AI agent
 */
function VoiceDemo() {
  return (
    <Layout>
      <div className="voice-demo-page">
        <div className="page-header">
          <h1>Voice AI Demo</h1>
          <p className="subtitle">
            Experience real-time voice conversations with AI powered by Deepgram,
            OpenAI, and Cartesia.
          </p>
        </div>

        <div className="demo-info">
          <h3>How it works:</h3>
          <ol>
            <li>Click "Connect to Voice Agent" to establish a WebSocket connection</li>
            <li>Click "Start Listening" and grant microphone permissions</li>
            <li>Speak naturally - your speech is transcribed in real-time</li>
            <li>The AI processes your speech and responds with natural voice</li>
            <li>Use "Interrupt AI" to cut off the agent mid-response (barge-in)</li>
          </ol>

          <div className="tech-stack">
            <h4>Technology Stack:</h4>
            <ul>
              <li>🎤 <strong>Deepgram Nova-2</strong> - Real-time speech recognition</li>
              <li>🧠 <strong>OpenAI GPT-4</strong> - Natural language understanding</li>
              <li>🔊 <strong>Cartesia Sonic</strong> - Ultra-low latency text-to-speech</li>
              <li>⚡ <strong>WebSocket</strong> - Real-time bidirectional audio streaming</li>
            </ul>
          </div>
        </div>

        <VoiceAgent />

        <div className="additional-features">
          <h3>Additional Features:</h3>
          <div className="feature-grid">
            <div className="feature-card">
              <h4>📞 Phone Integration</h4>
              <p>
                Call <strong>your Twilio number</strong> to interact with the AI
                agent over a real phone call.
              </p>
            </div>

            <div className="feature-card">
              <h4>📝 Full Transcripts</h4>
              <p>
                Every conversation is logged with timestamps and can be
                retrieved via the API.
              </p>
            </div>

            <div className="feature-card">
              <h4>📊 Analytics</h4>
              <p>
                Track call duration, barge-in events, error rates, and more
                through the ledger system.
              </p>
            </div>

            <div className="feature-card">
              <h4>🔧 Customizable</h4>
              <p>
                Adjust voice, language, system prompts, and behavior to fit
                your use case.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .voice-demo-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .page-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .subtitle {
          color: #888;
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .demo-info {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .demo-info h3 {
          margin-top: 0;
        }

        .demo-info ol {
          line-height: 1.8;
        }

        .demo-info ol li {
          margin-bottom: 0.5rem;
        }

        .tech-stack {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tech-stack h4 {
          margin-bottom: 1rem;
        }

        .tech-stack ul {
          list-style: none;
          padding: 0;
        }

        .tech-stack li {
          padding: 0.5rem 0;
          font-size: 1rem;
        }

        .additional-features {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 2px solid rgba(255, 255, 255, 0.1);
        }

        .additional-features h3 {
          text-align: center;
          margin-bottom: 2rem;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .feature-card h4 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.2rem;
        }

        .feature-card p {
          color: #aaa;
          line-height: 1.6;
          margin: 0;
        }
      `}</style>
    </Layout>
  );
}

export default withAuth(VoiceDemo);
