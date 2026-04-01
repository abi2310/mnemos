import React, { useState, useRef, useEffect } from 'react';
import './ChatConversation.css';
import { chatApi } from './chatApi';
import { getDatasets } from '../../services/DatasetService/datasetService';

// Globales Mapping zwischen lokalen Frontend Mock-IDs (die aus ChatPanel kommen) und echten Backend-IDs
const chatSessionMap = {};

/**
 * ChatConversation Component
 *
 * Zeigt die Chat-Nachrichten und Input-Feld für die Konversation
 */
function ChatConversation({ chatId, onBack }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Wir prüfen, ob die übergebene chatId (ein Timestamp vom Mock-Sidebar) 
    // schon mit einer echten Backend-ID verknüpft ist.
    const [backendChatId, setBackendChatId] = useState(chatSessionMap[chatId] || null);
    const messagesEndRef = useRef(null);

    // Lade komplette Chat-History wenn chatId sich ändert
    useEffect(() => {
        const actualBackendId = chatSessionMap[chatId] || null;

        if (actualBackendId) {
            setBackendChatId(actualBackendId);
            setIsLoading(true);
            chatApi.getChatMessages(actualBackendId)
                .then(messagesData => {
                    if (messagesData && messagesData.length > 0) {
                        const formattedMessages = messagesData
                            .filter(msg => msg.role !== 'system')
                            .map(msg => {
                                let parsedArtifacts = [];
                                if (msg.generated_image) {
                                    parsedArtifacts.push({
                                        artifact_type: 'image',
                                        path: msg.generated_image
                                    });
                                }

                                return {
                                    id: msg.id,
                                    type: msg.role === 'user' ? 'user' : 'assistant',
                                    text: msg.content,
                                    artifacts: parsedArtifacts,
                                    timestamp: new Date(msg.created_at || Date.now())
                                };
                            });
                        setMessages(formattedMessages);
                    } else {
                        setMessages([{
                            id: 1,
                            type: 'assistant',
                            text: 'Hallo! Der Chat ist noch leer. Was möchtest du tun?',
                            timestamp: new Date()
                        }]);
                    }
                })
                .catch(err => {
                    console.error('Fehler beim Laden des Chats:', err);
                    setMessages([{
                        id: 1,
                        type: 'assistant',
                        text: 'Mein Speicher für diese Unterhaltung ist leider unerreichbar.',
                        timestamp: new Date()
                    }]);
                })
                .finally(() => setIsLoading(false));
        } else {
            setBackendChatId(null);
            setMessages([{
                id: 1,
                type: 'assistant',
                text: 'Hallo! Ich helfe dir bei der Analyse deiner Daten. Stelle mir eine Frage oder beschreibe, was du visualisieren möchtest.',
                timestamp: new Date()
            }]);
        }
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!inputValue.trim() || isLoading) return;

        const text = inputValue.trim();

        // User-Nachricht hinzufügen
        const userMessage = {
            id: messages.length + 1,
            type: 'user',
            text: text,
            timestamp: new Date()
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            let currentChatId = backendChatId;

            // Chat im Backend anlegen, falls noch nicht passiert
            if (!currentChatId) {
                const dbDatasets = await getDatasets();
                if (!dbDatasets || dbDatasets.length === 0) {
                    throw new Error('NoDatasetError');
                }
                const datasetId = dbDatasets[0].dataset_id;

                const newChat = await chatApi.createChat(datasetId);
                currentChatId = newChat.id;
                setBackendChatId(currentChatId);

                // Mappe den lokalen Mock-ID Status auf die persistente Backend ID!
                if (chatId) {
                    chatSessionMap[chatId] = currentChatId;
                }
            }

            // Nachricht via API senden
            const response = await chatApi.sendMessage(currentChatId, text, 'user');

            let assistantText = 'Ich habe die Anfrage verarbeitet, aber keine Textantwort erhalten.';
            let assistantArtifacts = [];

            if (response.assistant_message && response.assistant_message.content) {
                assistantText = response.assistant_message.content;
            } else if (response.final_response && response.final_response.message) {
                assistantText = response.final_response.message;
            } else if (response.content) {
                assistantText = response.content;
            }

            // Diagramme / Bilder extrahieren
            if (response.assistant_message && response.assistant_message.generated_image) {
                assistantArtifacts.push({
                    artifact_type: 'image',
                    path: response.assistant_message.generated_image
                });
            } else if (response.final_response && response.final_response.artifacts) {
                assistantArtifacts = response.final_response.artifacts;
            }

            const assistantMessage = {
                id: response.assistant_message?.id || Date.now(),
                type: 'assistant',
                text: assistantText,
                artifacts: assistantArtifacts,
                timestamp: new Date()
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error during API call for chat:', error);

            let errorText = 'Fehler bei der Kommunikation mit dem KI Agenten. Bitte überprüfe das Backend.';
            if (error.message === 'NoDatasetError') {
                errorText = 'Bitte lade zuerst einen Datensatz hoch (unter dem Tab Datasets), bevor du den KI-Agenten startest.';
            }

            const errorMessage = {
                id: Date.now(),
                type: 'assistant',
                text: errorText,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
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
                            {message.artifacts && message.artifacts.length > 0 && (
                                <div className="message-artifacts" style={{ marginTop: '10px' }}>
                                    {message.artifacts.map((artifact, idx) => {
                                        if (artifact.artifact_type === 'image' || (artifact.path && artifact.path.match(/\.(jpeg|jpg|gif|png)$/i))) {
                                            const imgUrl = `http://localhost:8000${artifact.path}`;
                                            const imgTitle = artifact.description || 'Generiertes Diagramm';

                                            const handleDragStart = (e) => {
                                                const data = {
                                                    type: 'artifact_image',
                                                    url: imgUrl,
                                                    description: imgTitle
                                                };
                                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                            };

                                            const handleAddToDashboard = () => {
                                                const event = new CustomEvent('add-to-dashboard', {
                                                    detail: {
                                                        type: 'artifact_image',
                                                        url: imgUrl,
                                                        description: imgTitle
                                                    }
                                                });
                                                window.dispatchEvent(event);
                                            };

                                            return (
                                                <div key={idx} className="artifact-image-container">
                                                    <img
                                                        src={imgUrl}
                                                        alt={imgTitle}
                                                        draggable="true"
                                                        onDragStart={handleDragStart}
                                                        className="artifact-image"
                                                    />
                                                    <button
                                                        onClick={handleAddToDashboard}
                                                        className="add-to-dashboard-btn"
                                                        title="Zum Dashboard hinzufügen"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                                        </svg>
                                                        Dashboard
                                                    </button>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="message-timestamp">
                            {message.timestamp.toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
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
