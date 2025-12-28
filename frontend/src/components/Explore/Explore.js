import React, { useState, useRef, useEffect } from 'react';
import ChatPanel from '../ChatPanel/ChatPanel';
import DashboardCanvas from '../DashboardCanvas/DashboardCanvas';
import ChatConversation from '../ChatConversation/ChatConversation';
import './Explore.css';

/**
 * Explore Component
 *
 * Hauptkomponente für den Explore-Tab.
 * Links: ChatPanel (Sidebar) oder ChatConversation (Chat)
 * Rechts: DashboardCanvas (immer sichtbar)
 */
function Explore() {
    const [leftView, setLeftView] = useState('sidebar'); // 'sidebar' oder 'conversation'
    const [activeChat, setActiveChat] = useState(null);
    const [leftWidth, setLeftWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const leftPanelRef = useRef(null);

    const handleNewChat = (chatId) => {
        setActiveChat(chatId);
        setLeftView('conversation');
        // Vergrößere den Chat smooth auf 480px
        setLeftWidth(480);
    };

    const handleChatSelect = (chatId) => {
        setActiveChat(chatId);
        setLeftView('conversation');
        // Vergrößere den Chat smooth auf 480px
        setLeftWidth(480);
    };

    const handleBackToSidebar = () => {
        setLeftView('sidebar');
        setActiveChat(null);
        // Verkleinere zurück auf 320px
        setLeftWidth(320);
    };

    const handleMouseDown = (e) => {
        setIsResizing(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const newWidth = e.clientX;
            if (newWidth >= 280 && newWidth <= 800) {
                setLeftWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <div className="explore-container">
            <div className="explore-split-view">
                {/* Linke Spalte: Sidebar oder Chat-Konversation */}
                <div
                    className="explore-panel explore-panel--left"
                    ref={leftPanelRef}
                    style={{ width: `${leftWidth}px` }}
                >
                    {leftView === 'sidebar' ? (
                        <ChatPanel
                            onNewChat={handleNewChat}
                            onChatSelect={handleChatSelect}
                        />
                    ) : (
                        <ChatConversation
                            chatId={activeChat}
                            onBack={handleBackToSidebar}
                        />
                    )}
                </div>

                {/* Resize Handle */}
                <div
                    className={`resize-handle ${isResizing ? 'resizing' : ''}`}
                    onMouseDown={handleMouseDown}
                />

                {/* Rechte Spalte: Dashboard (immer sichtbar) */}
                <div className="explore-panel explore-panel--dashboard">
                    <DashboardCanvas />
                </div>
            </div>
        </div>
    );
}

export default Explore;
