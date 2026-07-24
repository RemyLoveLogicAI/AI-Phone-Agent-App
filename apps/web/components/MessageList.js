import { useMemo, useState, useEffect } from 'react';

const buildConversations = (messages) => messages.reduce((acc, msg) => {
  const otherParty = msg.direction === 'inbound' ? msg.from : msg.to;
  if (!acc[otherParty]) acc[otherParty] = [];
  acc[otherParty].push(msg);
  return acc;
}, {});

const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const getInitials = (contact) => {
  if (!contact) return '?';
  const words = contact.split(/[\s-]+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  const alphanumeric = contact.replace(/[^a-zA-Z0-9]/g, '');
  if (/[a-zA-Z]/.test(alphanumeric)) {
    return alphanumeric.slice(0, 2).toUpperCase();
  }
  return alphanumeric.slice(-2) || contact.slice(0, 2).toUpperCase();
};

export default function MessageList({ messages }) {
  const [conversations, setConversations] = useState(() => buildConversations(messages));
  const [selectedContact, setSelectedContact] = useState(() => Object.keys(conversations)[0]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastReadByContact, setLastReadByContact] = useState({});

  useEffect(() => {
    const next = buildConversations(messages);
    setConversations(next);
    const nextContacts = Object.keys(next);
    if (!next[selectedContact] && nextContacts.length > 0) {
      setSelectedContact(nextContacts[0]);
    }
  }, [messages, selectedContact]);

  useEffect(() => {
    if (selectedContact) {
      const latestSeen = conversations[selectedContact]?.[conversations[selectedContact].length - 1]?.dateSent;
      if (!latestSeen) return;
      setLastReadByContact((prev) => {
        const current = prev[selectedContact];
        if (current && new Date(current) >= new Date(latestSeen)) {
          return prev;
        }
        return { ...prev, [selectedContact]: latestSeen };
      });
    }
  }, [selectedContact, conversations]);

  const sortedContacts = useMemo(() => Object.keys(conversations).sort((a, b) => {
    const latestA = conversations[a]?.[conversations[a].length - 1]?.dateSent || 0;
    const latestB = conversations[b]?.[conversations[b].length - 1]?.dateSent || 0;
    return new Date(latestB) - new Date(latestA);
  }), [conversations]);

  const visibleContacts = useMemo(() => {
    if (!searchQuery) return sortedContacts;
    const query = searchQuery.toLowerCase();
    return sortedContacts.filter((contact) => contact.toLowerCase().includes(query));
  }, [searchQuery, sortedContacts]);

  const unreadCounts = useMemo(() => {
    const counts = {};
    Object.keys(conversations).forEach((contact) => {
      const lastReadAt = lastReadByContact[contact] ? new Date(lastReadByContact[contact]) : null;
      const inboundCount = conversations[contact].filter((msg) => {
        if (msg.direction !== 'inbound') return false;
        if (!lastReadAt) return true;
        return new Date(msg.dateSent) > lastReadAt;
      }).length;
      counts[contact] = inboundCount;
    });
    return counts;
  }, [conversations, lastReadByContact]);

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
        <div className="search">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search contacts"
            aria-label="Search contacts"
          />
        </div>
        <div className="contact-list">
          {visibleContacts.length === 0 ? (
            <p className="empty-state">{searchQuery ? 'No matching contacts.' : 'No messages yet.'}</p>
          ) : (
            visibleContacts.map(contact => {
              const latestMessage = conversations[contact][conversations[contact].length - 1];
              const unreadCount = unreadCounts[contact] || 0;
              return (
              <div
                key={contact}
                className={`contact-item ${selectedContact === contact ? 'active' : ''}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="avatar">{getInitials(contact)}</div>
                <div className="info">
                  <p className="name">{contact}</p>
                  <p className="preview">
                    {latestMessage?.body ? `${latestMessage.body.substring(0, 24)}...` : 'No messages yet.'}
                  </p>
                </div>
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </div>
              );
            })
          )}
        </div>
      </div>

      <div className="chat-area">
        {selectedContact ? (
          <>
            <div className="chat-header">
              <div className="avatar-small">{getInitials(selectedContact)}</div>
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

        .search {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .search input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.5rem 0.75rem;
          border-radius: 12px;
          color: white;
          outline: none;
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

        .badge {
          background: #22c55e;
          color: #0f172a;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          border-radius: 999px;
          margin-left: auto;
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
