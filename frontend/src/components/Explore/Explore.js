import React, { useState } from 'react';
import DashboardCanvas from '../DashboardCanvas/DashboardCanvas';
import ChatSidebar from '../ChatSidebar/ChatSidebar';
import ChatConversation from '../ChatConversation/ChatConversation';
import './Explore.css';

/**
 * Explore Component (Refactored)
 *
 * Wenn Projekt ausgewählt:
 * - Links: Chat-Interface (ChatSidebar oder ChatConversation)
 * - Rechts: DashboardCanvas
 */
function Explore() {
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
    };

    const handleChatSelect = (chatId) => {
        setActiveChat(chatId);
    };

    const handleBackToSidebar = () => {
        setActiveChat(null);
    };

    return (
        <div className="explore-container">
            {/* Chat-Interface links */}
            <div className="explore-chat-panel">
                {activeChat ? (
                    <ChatConversation
                        chatId={activeChat}
                        onBack={handleBackToSidebar}
                    />
                ) : (
                    <ChatSidebar
                        chats={chats}
                        activeChat={activeChat}
                        onNewChat={handleNewChat}
                        onChatSelect={handleChatSelect}
                    />
                )}
            </div>

            {/* Dashboard rechts */}
            <div className="explore-dashboard">
                <DashboardCanvas />
            </div>
        </div>
    );
}

export default Explore;
