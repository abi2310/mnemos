import React from 'react';
import ChatConversation from '../ChatConversation/ChatConversation';
import './Sidebar.css';

function Sidebar({ isOpen, onToggle, activePage, onPageChange, activeProject, activeTab, onNewChat }) {
  const showChat = activeProject && activeTab === 'explore';

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--collapsed'} ${showChat ? 'sidebar--chat' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
      >
        <span className="sidebar-toggle-icon">
          {isOpen ? '◀' : '▶'}
        </span>
      </button>

      <nav className="sidebar-nav">
        <span className={`sidebar-nav-item ${activePage === 'home' ? 'sidebar-nav-item--active' : ''}`} onClick={() => onPageChange('home')}>Home</span>
        <span className={`sidebar-nav-item ${activePage === 'projects' ? 'sidebar-nav-item--active' : ''}`} onClick={() => onPageChange('projects')}>Projects</span>
        <span className={`sidebar-nav-item ${activePage === 'datasets' ? 'sidebar-nav-item--active' : ''}`} onClick={() => onPageChange('datasets')}>Datasets</span>
      </nav>

      {showChat && (
        <div className="sidebar-chat-section">
          <button className="sidebar-new-chat-btn" onClick={onNewChat}>
            + New Chat
          </button>
          <div className="sidebar-chat-container">
            <ChatConversation />
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;

