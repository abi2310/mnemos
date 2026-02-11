import React, { useState } from 'react';
import ChatPanel from '../ChatPanel/ChatPanel';
import ChatConversation from '../ChatConversation/ChatConversation';
import './Sidebar.css';

function Sidebar({ isExpanded, isPinned, activePage, onPageChange, activeProject, activeTab, onNewChat, onHoverEnter, onHoverLeave }) {
  const showChat = activeProject && activeTab === 'explore';
  const [activeChat, setActiveChat] = useState(null);

  const handleNewChat = (chatId) => {
    setActiveChat(chatId);
    if (onNewChat) onNewChat();
  };

  const handleChatSelect = (chatId) => {
    setActiveChat(chatId);
  };

  return (
    <aside
      className={`sidebar ${isExpanded ? 'sidebar--open' : 'sidebar--collapsed'} ${showChat && isExpanded ? 'sidebar--chat' : ''} ${!isPinned && isExpanded ? 'sidebar--hover-only' : ''}`}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {isExpanded && (
        <>
          <nav className="sidebar-nav">
            <button className={`sidebar-nav-item ${activePage === 'home' ? 'sidebar-nav-item--active' : ''}`} onClick={() => onPageChange('home')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span>Home</span>
            </button>
            <button className={`sidebar-nav-item ${activePage === 'projects' ? 'sidebar-nav-item--active' : ''}`} onClick={() => onPageChange('projects')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <span>Projects</span>
            </button>
            <button className={`sidebar-nav-item ${activePage === 'datasets' ? 'sidebar-nav-item--active' : ''}`} onClick={() => onPageChange('datasets')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
              </svg>
              <span>Datasets</span>
            </button>
          </nav>

          {showChat && (
            <div className="sidebar-chat-section">
              <ChatPanel
                onNewChat={handleNewChat}
                onChatSelect={handleChatSelect}
                hideNav={true}
                hideUserProfile={true}
              />

              {activeChat && (
                <div className="sidebar-chat-container">
                  <ChatConversation key={activeChat} chatId={activeChat} />
                </div>
              )}
            </div>
          )}

          {/* User Profile */}
          <div className="sidebar-user-profile">
            <div className="sidebar-user-avatar"><span>MN</span></div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">MNEMOS</div>
              <div className="sidebar-user-email">user@mnemos.ai</div>
            </div>
            <button className="sidebar-user-menu-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

export default Sidebar;
