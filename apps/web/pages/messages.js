import Layout from '../components/Layout';
import MessageList from '../components/MessageList';
import { useState, useEffect } from 'react';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/dashboard/stats'); // Reusing stats endpoint for now as it returns messages
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  return (
    <Layout>
      <div className="messages-page animate-fade-in">
        {loading ? (
          <div className="loading">Loading conversations...</div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      <style jsx>{`
        .messages-page {
          padding: 1rem;
          height: 100%;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #888;
        }
      `}</style>
    </Layout>
  );
}
