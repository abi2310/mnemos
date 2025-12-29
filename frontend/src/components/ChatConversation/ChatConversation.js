import React, { useState } from 'react';
import './ChatConversation.css';

/**
 * ChatConversation Component
 *
 * Zeigt die Chat-Nachrichten und Input-Feld für die Konversation
 */
function ChatConversation({ chatId, onBack }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'assistant',
            text: 'Hallo! Ich helfe dir bei der Analyse deiner Daten. Stelle mir eine Frage oder beschreibe, was du visualisieren möchtest.',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!inputValue.trim()) return;

        // User-Nachricht hinzufügen
        const userMessage = {
            id: messages.length + 1,
            type: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages([...messages, userMessage]);
        setInputValue('');

        // TODO: API-Call zum Backend für KI-Antwort
        // Placeholder-Antwort
        setTimeout(() => {
            const assistantMessage = {
                id: messages.length + 2,
                type: 'assistant',
                text: 'Ich arbeite an deiner Anfrage. Die Backend-Integration folgt noch.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    return (
        <div className="chat-conversation">
            <div className="conversation-header">
                <button className="back-button" onClick={onBack}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                <h2 className="conversation-title">Chat</h2>
            </div>

            <div className="conversation-messages">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`message message--${message.type}`}
                    >
                        <div className="message-content">
                            {message.text}
                        </div>
                        <div className="message-timestamp">
                            {message.timestamp.toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <form className="conversation-input-form" onSubmit={handleSendMessage}>
                <textarea
                    className="conversation-input"
                    placeholder="Nachricht eingeben..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows={1}
                />
                <button
                    type="submit"
                    className="conversation-send-button"
                    disabled={!inputValue.trim()}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </div>
    );
}

export default ChatConversation;
