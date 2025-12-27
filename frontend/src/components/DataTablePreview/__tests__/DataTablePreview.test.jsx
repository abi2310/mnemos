import { render, screen } from '@testing-library/react';
import DataTablePreview from '../DataTablePreview';


describe('DataTablePreview – zusätzliche Tests', () => {
    const data = [
        ['id', 'name', 'age'],
        ['1', 'Alice', '28'],
        ['2', 'Bob', '34'],
    ];

    test('rendert einen Scroll-Wrapper für die Tabelle', () => {
        render(<DataTablePreview data={data} />);

        const wrapper = screen.getByTestId('data-preview-wrapper');
        expect(wrapper).toBeInTheDocument();
    });

    test('rendert genau eine Tabellen-Überschriftenzeile (thead)', () => {
        render(<DataTablePreview data={data} />);

        const headerCells = screen.getAllByRole('columnheader');
        expect(headerCells).toHaveLength(3);
    });

    test('rendert die korrekte Anzahl an Datenzeilen', () => {
        render(<DataTablePreview data={data} />);

        const rows = screen.getAllByRole('row');

        // 1 Header-Zeile + 2 Datenzeilen
        expect(rows).toHaveLength(3);
    });
});