import { useMemo, useState, useEffect } from 'react';

const buildConversations = (messages) => messages.reduce((acc, msg) => {
  const otherParty = msg.direction === 'inbound' ? msg.from : msg.to;
  if (!acc[otherParty]) acc[otherParty] = [];
  acc[otherParty].push(msg);
  return acc;
}, {});

const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function MessageList({ messages }) {
  const [conversations, setConversations] = useState(() => buildConversations(messages));
  const [selectedContact, setSelectedContact] = useState(() => Object.keys(conversations)[0]);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const next = buildConversations(messages);
    setConversations(next);
    if (!next[selectedContact]) {
      setSelectedContact(Object.keys(next)[0]);
    }
  }, [messages, selectedContact]);

  const sortedContacts = useMemo(() => Object.keys(conversations).sort((a, b) => {
    const latestA = conversations[a]?.[conversations[a].length - 1]?.dateSent || 0;
    const latestB = conversations[b]?.[conversations[b].length - 1]?.dateSent || 0;
    return new Date(latestB) - new Date(latestA);
  }), [conversations]);

  const handleSend = () => {
    if (!replyText || !selectedContact) return;
    const outbound = {
      id: `local-${Date.now()}`,
      direction: 'outbound-reply',
      body: replyText,
      dateSent: new Date().toISOString(),
    };
    setConversations((prev) => ({
      ...prev,
      [selectedContact]: [...(prev[selectedContact] || []), outbound],
    }));
    setReplyText('');
  };

  const applyQuickReply = (template) => setReplyText(template);

  return (
    <div className="messages-container glass-panel">
      <div className="sidebar">
        <h3>Messages</h3>
        <div className="contact-list">
          {sortedContacts.length === 0 ? (
            <p className="empty-state">No messages yet.</p>
          ) : (
            sortedContacts.map(contact => (
              <div
                key={contact}
                className={`contact-item ${selectedContact === contact ? 'active' : ''}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="avatar">{contact[2]}</div>
                <div className="info">
                  <p className="name">{contact}</p>
                  <p className="preview">
                    {conversations[contact][0].body.substring(0, 20)}...
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="chat-area">
        {selectedContact ? (
          <>
            <div className="chat-header">
              <div className="avatar-small">{selectedContact[2]}</div>
              <h4>{selectedContact}</h4>
              <span className="pill">{conversations[selectedContact]?.length || 0} msgs</span>
            </div>

            <div className="message-stream">
              {conversations[selectedContact]?.map(msg => (
                <div key={msg.id} className={`message-bubble ${msg.direction === 'outbound-api' || msg.direction === 'outbound-reply' ? 'sent' : 'received'}`}>
                  <p>{msg.body}</p>
                  <span className="timestamp">{formatTime(msg.dateSent)}</span>
                </div>
              ))}
            </div>

            <div className="input-area">
              <input
                type="text"
                placeholder="Type a message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} disabled={!replyText}>Send</button>
            </div>

            <div className="quick-replies">
              {['On it—will update you shortly.', 'Can we move this to a quick call?', 'Appreciate the note, thank you!'].map(reply => (
                <button key={reply} className="chip" onClick={() => applyQuickReply(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="no-selection">Select a conversation</div>
        )}
      </div>

      <style jsx>{`
        .messages-container {
          display: flex;
          height: calc(100vh - 4rem);
          overflow: hidden;
        }

        .sidebar {
          width: 300px;
          border-right: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
        }

        .sidebar h3 {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .contact-list {
          flex: 1;
          overflow-y: auto;
        }

        .contact-item {
          padding: 1rem;
          display: flex;
          gap: 1rem;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .contact-item:hover {
          background: rgba(255,255,255,0.05);
        }

        .contact-item.active {
          background: rgba(109, 40, 217, 0.2);
          border-left: 3px solid var(--primary);
        }

        .avatar, .avatar-small {
          width: 40px;
          height: 40px;
          background: #333;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .avatar-small {
          width: 32px;
          height: 32px;
          font-size: 0.8rem;
        }

        .info .name {
          font-weight: 500;
          margin-bottom: 0.2rem;
        }

        .info .preview {
          font-size: 0.8rem;
          color: #888;
        }

        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: rgba(0,0,0,0.2);
        }

        .chat-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255,255,255,0.02);
        }

        .message-stream {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message-bubble {
          max-width: 70%;
          padding: 1rem;
          border-radius: 16px;
          position: relative;
        }

        .received {
          align-self: flex-start;
          background: rgba(255,255,255,0.1);
          border-bottom-left-radius: 4px;
        }

        .sent {
          align-self: flex-end;
          background: var(--primary);
          border-bottom-right-radius: 4px;
        }

        .timestamp {
          font-size: 0.7rem;
          opacity: 0.7;
          margin-top: 0.5rem;
          display: block;
          text-align: right;
        }

        .input-area {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex;
          gap: 1rem;
        }

        input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.8rem 1.2rem;
          border-radius: 24px;
          color: white;
          outline: none;
        }

        input:focus {
          border-color: var(--primary);
        }

        button {
          background: var(--primary);
          border: none;
          color: white;
          padding: 0 1.5rem;
          border-radius: 24px;
          cursor: pointer;
          font-weight: 600;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state, .no-selection {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
        }

        .pill {
          margin-left: auto;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e5e7eb;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        .quick-replies {
          display: flex;
          gap: 0.5rem;
          padding: 0 1rem 1rem;
          flex-wrap: wrap;
        }

        .chip {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e5e7eb;
          padding: 0.45rem 0.7rem;
          border-radius: 12px;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
