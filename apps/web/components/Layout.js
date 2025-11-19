import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { LogOut } from 'lucide-react';

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const isActive = (path) => router.pathname === path;

  // Don't show sidebar on login page
  if (router.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <nav className="sidebar glass-panel">
        <div className="logo">
          <div className="logo-icon">AI</div>
          <span>Assistant</span>
        </div>
        
        <ul className="nav-links">
          <li>
            <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
              <span className="icon">📊</span>
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/calls" className={`nav-item ${isActive('/calls') ? 'active' : ''}`}>
              <span className="icon">📞</span>
              <span>Calls</span>
            </Link>
          </li>
          <li>
            <Link href="/messages" className={`nav-item ${isActive('/messages') ? 'active' : ''}`}>
              <span className="icon">💬</span>
              <span>Messages</span>
            </Link>
          </li>
        </ul>
        
        {user && (
          <div className="user-profile">
            <div className="avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
              ) : (
                user.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="user-info">
              <p className="name">{user.name}</p>
              <p className="status">Online</p>
            </div>
            <button onClick={logout} className="logout-btn" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </nav>
      
      <main className="main-content">
        {children}
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          background: radial-gradient(circle at top right, #1a1a1a 0%, var(--background) 100%);
        }
        
        .sidebar {
          width: 280px;
          margin: 1rem;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          height: calc(100vh - 2rem);
          position: sticky;
          top: 1rem;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 3rem;
          color: var(--foreground);
        }
        
        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.9rem;
        }
        
        .nav-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          color: #888;
          transition: all 0.3s ease;
        }
        
        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: var(--foreground);
        }
        
        .nav-item.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 20px rgba(109, 40, 217, 0.4);
        }
        
        .icon {
          font-size: 1.2rem;
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .avatar {
          width: 40px;
          height: 40px;
          background: #333;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
          overflow: hidden;
        }
        
        .user-info {
          flex: 1;
        }

        .user-info .name {
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        .user-info .status {
          font-size: 0.8rem;
          color: #4ade80;
        }

        .logout-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(255, 0, 0, 0.1);
          color: #ff4444;
        }
        
        .main-content {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
