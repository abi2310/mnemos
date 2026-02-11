import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar';

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
        render(<Sidebar {...defaultProps} isExpanded={true} activePage="projects" />);
        const projectsItem = screen.getByText('Projects');
        expect(projectsItem).toHaveClass('sidebar-nav-item--active');

        const homeItem = screen.getByText('Home');
        expect(homeItem).not.toHaveClass('sidebar-nav-item--active');
    });

    // ===== Page Change =====

    test('ruft onPageChange bei Klick auf Nav-Item auf', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} />);
        fireEvent.click(screen.getByText('Datasets'));
        expect(defaultProps.onPageChange).toHaveBeenCalledWith('datasets');
    });

    // ===== Chat Section =====

    test('zeigt keinen Chat-Bereich wenn kein Projekt aktiv', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={null} activeTab="explore" />);
        expect(screen.queryByText('+ New Chat')).not.toBeInTheDocument();
    });

    test('zeigt keinen Chat-Bereich bei Prepare-Tab', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="prepare" />);
        expect(screen.queryByText('+ New Chat')).not.toBeInTheDocument();
    });

    test('zeigt Chat-Bereich bei Explore-Tab mit aktivem Projekt', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);
        expect(screen.getByText('+ New Chat')).toBeInTheDocument();
    });

    test('hat sidebar--chat Klasse im Explore-Modus', () => {
        const { container } = render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);
        expect(container.querySelector('.sidebar')).toHaveClass('sidebar--chat');
    });

    test('erstellt neuen Chat und zeigt Historie', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('+ New Chat'));

        expect(screen.getByText('Recent Chats')).toBeInTheDocument();
        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(defaultProps.onNewChat).toHaveBeenCalledTimes(1);
    });

    test('erstellt mehrere Chats in der Historie', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('+ New Chat'));
        fireEvent.click(screen.getByText('+ New Chat'));

        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });

    test('zeigt ChatConversation nach Erstellen eines Chats', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('+ New Chat'));

        expect(screen.getByTestId('chat-conversation')).toBeInTheDocument();
    });

    test('wechselt zwischen Chats in der Historie', () => {
        render(<Sidebar {...defaultProps} isExpanded={true} activeProject={{ name: 'Test' }} activeTab="explore" />);

        fireEvent.click(screen.getByText('+ New Chat'));
        fireEvent.click(screen.getByText('+ New Chat'));

        // Click first chat
        fireEvent.click(screen.getByText('Chat 1'));

        // The active chat item should have the active class
        expect(screen.getByText('Chat 1')).toHaveClass('sidebar-chat-history-item--active');
    });
});

