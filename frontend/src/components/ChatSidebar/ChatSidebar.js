import React from 'react';
import './ChatSidebar.css';

/**
 * ChatSidebar Component
 * 
 * Nur Chat-Funktionalität für Explore-View:
 * - New Chat Button
 * - Chat History
 * - Keine Navigation Items
 */
function ChatSidebar({ chats, activeChat, onNewChat, onChatSelect }) {
    return (
        <div className="chat-sidebar">
            {/* Header */}
            <div className="chat-sidebar-header">
                <h2 className="chat-sidebar-title">Chats</h2>
            </div>

            {/* New Chat Button */}
            <div className="chat-sidebar-actions">
                <button className="chat-sidebar-new-btn" onClick={onNewChat}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 5V15M5 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>New Chat</span>
                </button>
            </div>

            {/* Chat History */}
            <div className="chat-sidebar-list">
                {chats.length === 0 ? (
                    <div className="chat-sidebar-empty">
                        <p>No chats yet</p>
                        <p className="chat-sidebar-empty-hint">Start a new conversation to begin</p>
                    </div>
                ) : (
                    chats.map((chat) => (
                        <button
                            key={chat.id}
                            className={`chat-sidebar-item ${activeChat === chat.id ? 'active' : ''}`}
                            onClick={() => onChatSelect(chat.id)}
                        >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 9.5C17 13.6421 13.6421 17 9.5 17C8.23 17 7.03 16.68 6 16.12L2 17L2.88 13C2.32 11.97 2 10.77 2 9.5C2 5.35786 5.35786 2 9.5 2C13.6421 2 17 5.35786 17 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="chat-sidebar-item-title">{chat.title}</span>
                            <button 
                                className="chat-sidebar-item-delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Delete chat
                                }}
                                title="Delete chat"
                            >
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 6L14 14M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

export default ChatSidebar;

