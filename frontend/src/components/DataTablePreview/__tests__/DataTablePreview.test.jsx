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

    test('rendert die korrekten Spaltenheader (3 Titel, 3 Typen, 3 Viz = 9 Header-Zellen)', () => {
        render(<DataTablePreview data={data} />);

        const headerCells = screen.getAllByRole('columnheader');
        expect(headerCells).toHaveLength(9);
    });

    test('rendert die korrekte Anzahl an Datenzeilen', () => {
        render(<DataTablePreview data={data} />);

        const rows = screen.getAllByRole('row');

        // 3 Header-Zeilen (Titel, Typen, Viz) + 2 Datenzeilen = 5
        expect(rows).toHaveLength(5);
    });
});