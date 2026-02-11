import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar';

// Mock ChatPanel to render actual chat UI elements
jest.mock('../../ChatPanel/ChatPanel', () => {
    return function MockChatPanel({ onNewChat, onChatSelect, hideNav, hideUserProfile }) {
        const [chats, setChats] = require('react').useState([]);
        const [activeChat, setActiveChat] = require('react').useState(null);

        const handleNewChat = () => {
            const id = Date.now() + chats.length;
            const newChat = { id, title: `Chat ${chats.length + 1}` };
            setChats(prev => [newChat, ...prev]);
            setActiveChat(id);
            if (onNewChat) onNewChat(id);
        };

        const handleSelect = (chatId) => {
            setActiveChat(chatId);
            if (onChatSelect) onChatSelect(chatId);
        };

        return (
            <div className="chat-panel">
                {!hideNav && <nav className="sidebar-nav"><span>Nav</span></nav>}
                <div className="chat-history">
                    <div className="chat-history-label">Recent Chats</div>
                    {chats.map((chat) => (
                        <button
                            key={chat.id}
                            className={`chat-history-item ${activeChat === chat.id ? 'active' : ''}`}
                            onClick={() => handleSelect(chat.id)}
                        >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="5" /></svg>
                            <span className="chat-title">{chat.title}</span>
                        </button>
                    ))}
                </div>
                <button className="new-chat-button" onClick={handleNewChat}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="5" /></svg>
                    <span>New Chat</span>
                </button>
                {!hideUserProfile && <div className="user-profile"><span>Profile</span></div>}
            </div>
        );
    };
});

// Mock ChatConversation to avoid complex rendering
jest.mock('../../ChatConversation/ChatConversation', () => {
    return function MockChatConversation({ chatId }) {
        return <div data-testid="chat-conversation">Chat {chatId}</div>;
    };
});

describe('Sidebar Component', () => {
    const defaultProps = {
        isExpanded: false,
        isPinned: false,
        activePage: 'home',
        onPageChange: jest.fn(),
        activeProject: null,
        activeTab: 'prepare',
        onNewChat: jest.fn(),
        onHoverEnter: jest.fn(),
        onHoverLeave: jest.fn(),
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ===== Expand / Collapse =====

    test('rendert keine Nav-Items wenn collapsed', () => {
        render(<Sidebar {...defaultProps} isExpanded={false} />);
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
        expect(screen.queryByText('Projects')).not.toBeInTheDocument();
        expect(screen.queryByText('Datasets')).not.toBeInTheDocument();
    });

    test('rendert Nav-Items wenn expanded', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} />);
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText('Datasets')).toBeInTheDocument();
    });

    test('hat sidebar--open Klasse wenn expanded', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} />);
        expect(container.querySelector('.sidebar')).toHaveClass('sidebar--open');
    });

    test('hat sidebar--collapsed Klasse wenn nicht expanded', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={false} />);
        expect(container.querySelector('.sidebar')).toHaveClass('sidebar--collapsed');
    });

    test('hat sidebar--hover-only Klasse wenn expanded aber nicht pinned', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} isPinned={false} />);
        expect(container.querySelector('.sidebar')).toHaveClass('sidebar--hover-only');
    });

    test('hat keine sidebar--hover-only Klasse wenn pinned', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} isPinned={true} />);
        expect(container.querySelector('.sidebar')).not.toHaveClass('sidebar--hover-only');
    });

    // ===== Hover Handlers =====

    test('ruft onHoverEnter/onHoverLeave auf', () => {
        const { container } = render(<Sidebar {...defaultProps} />);
        const aside = container.querySelector('.sidebar');

        fireEvent.mouseEnter(aside);
        expect(defaultProps.onHoverEnter).toHaveBeenCalledTimes(1);

        fireEvent.mouseLeave(aside);
        expect(defaultProps.onHoverLeave).toHaveBeenCalledTimes(1);
    });

    // ===== Active Page =====

    test('markiert die aktive Seite korrekt', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} activePage="projects" />);
        const projectsBtn = container.querySelectorAll('.sidebar-nav-item')[1];
        expect(projectsBtn).toHaveClass('sidebar-nav-item--active');

        const homeBtn = container.querySelectorAll('.sidebar-nav-item')[0];
        expect(homeBtn).not.toHaveClass('sidebar-nav-item--active');
    });

    // ===== Page Change =====

    test('ruft onPageChange bei Klick auf Nav-Item auf', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} />);
        fireEvent.click(screen.getByText('Datasets'));
        expect(defaultProps.onPageChange).toHaveBeenCalledWith('datasets');
    });

    // ===== Nav Icons =====

    test('rendert SVG-Icons in Nav-Items', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} />);
        const navItems = container.querySelectorAll('.sidebar-nav-item');
        navItems.forEach(item => {
            expect(item.querySelector('svg')).toBeInTheDocument();
        });
    });

    // ===== Chat Section =====

    test('zeigt keinen Chat-Bereich wenn kein Projekt aktiv', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={null} activeTab="explore" />);
        expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
    });

    test('zeigt keinen Chat-Bereich bei Prepare-Tab', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="prepare" />);
        expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
    });

    test('zeigt Chat-Bereich bei Explore-Tab mit aktivem Projekt', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);
        expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    test('hat sidebar--chat Klasse im Explore-Modus', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);
        expect(container.querySelector('.sidebar')).toHaveClass('sidebar--chat');
    });

    test('ChatPanel wird mit hideNav und hideUserProfile aufgerufen', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);
        // ChatPanel's own nav should be hidden
        const chatPanelNav = container.querySelector('.chat-panel .sidebar-nav');
        expect(chatPanelNav).not.toBeInTheDocument();
        // ChatPanel's own user profile should be hidden
        expect(container.querySelector('.chat-panel .user-profile')).not.toBeInTheDocument();
    });

    test('erstellt neuen Chat und zeigt Historie', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(screen.getByText('Recent Chats')).toBeInTheDocument();
        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(defaultProps.onNewChat).toHaveBeenCalledTimes(1);
    });

    test('erstellt mehrere Chats in der Historie', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('New Chat'));
        fireEvent.click(screen.getByText('New Chat'));

        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });

    test('zeigt ChatConversation nach Erstellen eines Chats', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(screen.getByTestId('chat-conversation')).toBeInTheDocument();
    });

    test('New Chat Button hat SVG-Icon', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);
        const newChatBtn = container.querySelector('.new-chat-button');
        expect(newChatBtn.querySelector('svg')).toBeInTheDocument();
    });

    test('Chat-Historie-Items haben SVG-Icons', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('New Chat'));

        const historyItem = container.querySelector('.chat-history-item');
        expect(historyItem.querySelector('svg')).toBeInTheDocument();
    });

    test('wechselt zwischen Chats in der Historie', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('New Chat'));
        fireEvent.click(screen.getByText('New Chat'));

        // Click first chat
        fireEvent.click(screen.getByText('Chat 1'));

        // The active chat item should have the active class
        const historyItems = container.querySelectorAll('.chat-history-item');
        const chat1Item = Array.from(historyItems).find(el => el.textContent.includes('Chat 1'));
        expect(chat1Item).toHaveClass('active');
    });

    // ===== User Profile =====

    test('zeigt User Profile in der Sidebar', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} />);
        expect(screen.getByText('MNEMOS')).toBeInTheDocument();
        expect(screen.getByText('user@mnemos.ai')).toBeInTheDocument();
    });
});
