// src/components/ChatConversation/chatApi.js

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const chatApi = {
    // Erstellt einen neuen Chat im Backend
    createChat: async (datasetId = 'default_dataset') => {
        const response = await fetch(`${API_BASE_URL}/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset_id: datasetId }),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create chat: ${await response.text()}`);
        }
        
        return response.json();
    },

    // Lädt alle Nachrichten für eine gegebene chatId
    getChatMessages: async (chatId) => {
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch messages: ${await response.text()}`);
        }
        
        return response.json();
    },

    // Sendet eine neue Nachricht und erhält die KI-Antwort
    sendMessage: async (chatId, text, role = 'user') => {
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role, content: text }),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to send message: ${await response.text()}`);
        }
        
        return response.json();
    }
};
