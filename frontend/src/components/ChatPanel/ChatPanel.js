import React, { useState } from 'react';
import './ChatPanel.css';

/**
 * ChatPanel Component
 *
 * Sidebar Navigation ähnlich wie ChatGPT/Lovable
 */
function ChatPanel({ onNewChat, onChatSelect }) {
    const [activeNav, setActiveNav] = useState('home');
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);

    const handleNewChat = () => {
        const newChat = {
            id: Date.now(),
            title: `Chat ${chats.length + 1}`,
            createdAt: new Date(),
            messages: []
        };

        setChats([newChat, ...chats]);
        setActiveChat(newChat.id);

        // Callback an parent (Explore) component
        if (onNewChat) {
            onNewChat(newChat.id);
        }

        // TODO: Backend-Integration - Chat erstellen
        console.log('New chat created:', newChat);
    };

    const handleChatSelect = (chatId) => {
        setActiveChat(chatId);

        // Callback an parent (Explore) component
        if (onChatSelect) {
            onChatSelect(chatId);
        }

        // TODO: Backend-Integration - Chat laden
        console.log('Chat selected:', chatId);
    };

    return (
        <div className="chat-panel">
            {/* Navigation */}
            <nav className="sidebar-nav">
                <button
                    className={`nav-item ${activeNav === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveNav('home')}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span>Home</span>
                </button>

                <button
                    className={`nav-item ${activeNav === 'search' ? 'active' : ''}`}
                    onClick={() => setActiveNav('search')}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <span>Search</span>
                </button>

                <button
                    className={`nav-item ${activeNav === 'datasets' ? 'active' : ''}`}
                    onClick={() => setActiveNav('datasets')}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    <span>Datasets</span>
                </button>

                <button
                    className={`nav-item ${activeNav === 'shared' ? 'active' : ''}`}
                    onClick={() => setActiveNav('shared')}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>Shared with me</span>
                </button>
            </nav>

            {/* Chat History */}
            <div className="chat-history">
                <div className="chat-history-label">Recent Chats</div>
                {chats.map((chat) => (
                    <button
                        key={chat.id}
                        className={`chat-history-item ${activeChat === chat.id ? 'active' : ''}`}
                        onClick={() => handleChatSelect(chat.id)}
                    >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        <span className="chat-title">{chat.title}</span>
                    </button>
                ))}
            </div>

            {/* New Chat Button */}
            <button className="new-chat-button" onClick={handleNewChat}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>New Chat</span>
            </button>

            {/* User Profile */}
            <div className="user-profile">
                <div className="user-avatar">
                    <span>MN</span>
                </div>
                <div className="user-info">
                    <div className="user-name">MNEMOS</div>
                    <div className="user-email">user@mnemos.ai</div>
                </div>
                <button className="user-menu-button">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default ChatPanel;
