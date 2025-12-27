import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from '../FileUpload';

describe('FileUpload Component', () => {
    test('rendert Upload-Button', () => {
        render(<FileUpload />);

        expect(
            screen.getByRole('button', { name: /upload data/i })
        ).toBeInTheDocument();
    });

    test('öffnet Dateiauswahl beim Klick auf Upload-Button', () => {
        render(<FileUpload />);

        const button = screen.getByRole('button', { name: /upload data/i });
        const input = screen.getByLabelText(/file upload/i);

        const clickSpy = jest.spyOn(input, 'click');

        fireEvent.click(button);

        expect(clickSpy).toHaveBeenCalled();
    });

    test('zeigt ausgewählte Datei in der Liste an', () => {
        const file = new File(['test'], 'test.csv', { type: 'text/csv' });

        render(<FileUpload />);

        const input = screen.getByLabelText(/file upload/i);

        fireEvent.change(input, {
            target: { files: [file] },
        });

        expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
});