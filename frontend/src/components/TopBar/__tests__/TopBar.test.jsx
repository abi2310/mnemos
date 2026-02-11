import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from '../TopBar';

describe('TopBar Component', () => {
    const defaultProps = {
        activeTab: 'prepare',
        onTabChange: jest.fn(),
        showNav: false,
        onSidebarToggle: jest.fn(),
        sidebarPinned: false,
        onSidebarHoverEnter: jest.fn(),
        onSidebarHoverLeave: jest.fn(),
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('rendert Logo', () => {
        render(<TopBar {...defaultProps} />);
        expect(screen.getByAltText(/mnemos logo/i)).toBeInTheDocument();
    });

    test('rendert den Sidebar-Toggle-Button', () => {
        render(<TopBar {...defaultProps} />);
        const toggle = screen.getByLabelText(/Sidebar fixieren/i);
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveTextContent('☰');
    });

    test('zeigt ✕ wenn Sidebar gepinnt ist', () => {
        render(<TopBar {...defaultProps} sidebarPinned={true} />);
        const toggle = screen.getByLabelText(/Sidebar loslösen/i);
        expect(toggle).toHaveTextContent('✕');
    });

    test('ruft onSidebarToggle bei Klick auf', () => {
        render(<TopBar {...defaultProps} />);
        fireEvent.click(screen.getByLabelText(/Sidebar fixieren/i));
        expect(defaultProps.onSidebarToggle).toHaveBeenCalledTimes(1);
    });

    test('ruft Hover-Handler bei mouseEnter/mouseLeave auf', () => {
        render(<TopBar {...defaultProps} />);
        const toggle = screen.getByLabelText(/Sidebar fixieren/i);

        fireEvent.mouseEnter(toggle);
        expect(defaultProps.onSidebarHoverEnter).toHaveBeenCalledTimes(1);

        fireEvent.mouseLeave(toggle);
        expect(defaultProps.onSidebarHoverLeave).toHaveBeenCalledTimes(1);
    });

    test('versteckt Navigation wenn showNav false ist', () => {
        render(<TopBar {...defaultProps} showNav={false} />);
        const topbar = document.querySelector('.topbar');
        expect(topbar).not.toHaveClass('topbar--with-nav');
    });

    test('zeigt Navigation wenn showNav true ist', () => {
        render(<TopBar {...defaultProps} showNav={true} />);
        const topbar = document.querySelector('.topbar');
        expect(topbar).toHaveClass('topbar--with-nav');
    });

    test('rendert alle Navigationseinträge', () => {
        render(<TopBar {...defaultProps} showNav={true} />);
        expect(screen.getByRole('button', { name: /prepare/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /explore/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /predict/i })).toBeInTheDocument();
    });

    test('markiert den aktiven Tab korrekt', () => {
        render(<TopBar {...defaultProps} showNav={true} activeTab="explore" />);
        const exploreButton = screen.getByRole('button', { name: /explore/i });
        expect(exploreButton).toHaveClass('active');
    });

    test('ruft onTabChange mit korrektem Wert auf', () => {
        render(<TopBar {...defaultProps} showNav={true} />);
        fireEvent.click(screen.getByRole('button', { name: /predict/i }));
        expect(defaultProps.onTabChange).toHaveBeenCalledWith('predict');
    });
});
