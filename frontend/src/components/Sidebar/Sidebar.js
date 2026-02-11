import React, { useState } from 'react';
import ChatConversation from '../ChatConversation/ChatConversation';
import './Sidebar.css';

function Sidebar({ isOpen, onToggle, activePage, onPageChange, activeProject, activeTab, onNewChat }) {
  const showChat = activeProject && activeTab === 'explore';
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: `Chat ${chats.length + 1}`,
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
    if (onNewChat) onNewChat();
  };

  const handleChatSelect = (chatId) => {
    setActiveChat(chatId);
  };

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
          <button className="sidebar-new-chat-btn" onClick={handleNewChat}>
            + New Chat
          </button>

          {chats.length > 0 && (
            <div className="sidebar-chat-history">
              <div className="sidebar-chat-history-label">Recent Chats</div>
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  className={`sidebar-chat-history-item ${activeChat === chat.id ? 'sidebar-chat-history-item--active' : ''}`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  {chat.title}
                </button>
              ))}
            </div>
          )}

          {activeChat && (
            <div className="sidebar-chat-container">
              <ChatConversation key={activeChat} chatId={activeChat} />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default Sidebar;

