import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from '../TopBar';

describe('TopBar Component', () => {
    test('rendert Logo und Navigationseinträge', () => {
        render(<TopBar activeTab="prepare" onTabChange={jest.fn()} />);

        // Logo
        expect(
            screen.getByAltText(/mnemos logo/i)
        ).toBeInTheDocument();

        // Navigation Buttons
        expect(screen.getByRole('button', { name: /prepare/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /explore/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /predict/i })).toBeInTheDocument();
    });

    test('markiert den aktiven Tab korrekt', () => {
        render(<TopBar activeTab="explore" onTabChange={jest.fn()} />);

        const exploreButton = screen.getByRole('button', { name: /explore/i });

        expect(exploreButton).toHaveClass('active');
    });

    test('ruft onTabChange mit korrektem Wert auf', () => {
        const onTabChangeMock = jest.fn();

        render(<TopBar activeTab="prepare" onTabChange={onTabChangeMock} />);

        fireEvent.click(screen.getByRole('button', { name: /predict/i }));

        expect(onTabChangeMock).toHaveBeenCalledTimes(1);
        expect(onTabChangeMock).toHaveBeenCalledWith('predict');
    });
});