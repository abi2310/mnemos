import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Datasets from '../Datasets';
import { getDatasets } from '../../../services/DatasetService/datasetService';

jest.mock('../../../services/DatasetService/datasetService', () => ({
    getDatasets: jest.fn(),
    uploadDataset: jest.fn(),
    deleteDataset: jest.fn(),
    getDatasetSchema: jest.fn(),
}));

const mockDatasets = [
    {
        dataset_id: '1',
        original_name: 'sales_data.csv',
        size_bytes: 1024 * 500,
        created_at: '2026-01-15T10:30:00Z',
    },
    {
        dataset_id: '2',
        original_name: 'customer_list.csv',
        size_bytes: 1024 * 1024 * 2,
        created_at: '2026-02-01T14:00:00Z',
    },
    {
        dataset_id: '3',
        original_name: 'analytics_report.xlsx',
        size_bytes: 256,
        created_at: '2025-12-20T08:00:00Z',
    },
];

describe('Datasets Component', () => {
    beforeEach(() => {
        getDatasets.mockResolvedValue(mockDatasets);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ===== Rendering =====

    test('zeigt Lade-Zustand initial', () => {
        getDatasets.mockReturnValue(new Promise(() => {})); // never resolves
        render(<Datasets />);
        expect(screen.getByText(/Loading files/i)).toBeInTheDocument();
    });

    test('zeigt Datasets nach dem Laden', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });
        expect(screen.getByText('customer_list.csv')).toBeInTheDocument();
        expect(screen.getByText('analytics_report.xlsx')).toBeInTheDocument();
    });

    test('zeigt Titel', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('Datasets', { selector: '.datasets-title' })).toBeInTheDocument();
        });
    });

    test('zeigt leeren Zustand wenn keine Datasets', async () => {
        getDatasets.mockResolvedValue([]);
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText(/No files uploaded yet/i)).toBeInTheDocument();
        });
    });

    // ===== Search =====

    test('filtert Datasets nach Suchbegriff', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Search files/i);
        fireEvent.change(searchInput, { target: { value: 'customer' } });

        expect(screen.getByText('customer_list.csv')).toBeInTheDocument();
        expect(screen.queryByText('sales_data.csv')).not.toBeInTheDocument();
        expect(screen.queryByText('analytics_report.xlsx')).not.toBeInTheDocument();
    });

    test('zeigt "No files found" bei Suche ohne Treffer', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/Search files/i), { target: { value: 'nonexistent' } });
        expect(screen.getByText(/No files found/i)).toBeInTheDocument();
    });

    test('zeigt "Clear search" Button bei leerer Suche', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/Search files/i), { target: { value: 'nonexistent' } });
        const clearBtn = screen.getByText(/Clear search/i);
        expect(clearBtn).toBeInTheDocument();

        fireEvent.click(clearBtn);
        expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
    });

    // ===== Sorting =====

    test('sortiert nach Name aufsteigend/absteigend', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        const nameHeader = screen.getByText(/^Name/);
        fireEvent.click(nameHeader);

        // Get all rows
        const rows = document.querySelectorAll('.datasets-table-row');
        const names = Array.from(rows).map(r => r.querySelector('.datasets-table-cell--name span').textContent);
        expect(names[0]).toBe('analytics_report.xlsx');
        expect(names[1]).toBe('customer_list.csv');
        expect(names[2]).toBe('sales_data.csv');

        // Click again for descending
        fireEvent.click(nameHeader);
        const rowsDesc = document.querySelectorAll('.datasets-table-row');
        const namesDesc = Array.from(rowsDesc).map(r => r.querySelector('.datasets-table-cell--name span').textContent);
        expect(namesDesc[0]).toBe('sales_data.csv');
        expect(namesDesc[2]).toBe('analytics_report.xlsx');
    });

    test('sortiert nach Größe', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        const sizeHeader = screen.getByText(/^Size/);
        fireEvent.click(sizeHeader);

        const rows = document.querySelectorAll('.datasets-table-row');
        const names = Array.from(rows).map(r => r.querySelector('.datasets-table-cell--name span').textContent);
        // Ascending: 256 B < 500 KB < 2 MB
        expect(names[0]).toBe('analytics_report.xlsx');
        expect(names[1]).toBe('sales_data.csv');
        expect(names[2]).toBe('customer_list.csv');
    });

    test('sortiert nach Upload-Datum', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        // Default sort is created_at desc
        // Click to switch to asc
        const dateHeader = screen.getByText(/^Upload Date/);
        fireEvent.click(dateHeader);

        const rows = document.querySelectorAll('.datasets-table-row');
        const names = Array.from(rows).map(r => r.querySelector('.datasets-table-cell--name span').textContent);
        // Ascending: Dec 2025, Jan 2026, Feb 2026
        expect(names[0]).toBe('analytics_report.xlsx');
        expect(names[1]).toBe('sales_data.csv');
        expect(names[2]).toBe('customer_list.csv');
    });

    // ===== Expandable Panels =====

    test('öffnet und schließt Preview-Panel', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        // Click Preview button on first dataset
        const previewButtons = screen.getAllByTitle('Preview');
        fireEvent.click(previewButtons[0]);

        expect(screen.getByText(/NEEDS TO BE IMPLEMENTED/i)).toBeInTheDocument();

        // Click Close
        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByText(/NEEDS TO BE IMPLEMENTED/i)).not.toBeInTheDocument();
    });

    test('öffnet und schließt Projects-Panel', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        const projectButtons = screen.getAllByTitle('Used in Projects');
        fireEvent.click(projectButtons[0]);

        expect(screen.getByText('Used in Projects', { selector: 'span' })).toBeInTheDocument();

        // Click close
        fireEvent.click(screen.getByLabelText('Close'));
        expect(screen.queryByText('Used in Projects', { selector: 'span' })).not.toBeInTheDocument();
    });

    test('öffnet nur ein Panel gleichzeitig', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        // Open preview on first dataset
        const previewButtons = screen.getAllByTitle('Preview');
        fireEvent.click(previewButtons[0]);
        expect(screen.getByText(/NEEDS TO BE IMPLEMENTED/i)).toBeInTheDocument();

        // Open projects on same dataset - should close preview
        const projectButtons = screen.getAllByTitle('Used in Projects');
        fireEvent.click(projectButtons[0]);
        // Preview should be closed, projects should be open
        expect(screen.queryByText('Close')).not.toBeInTheDocument();
        expect(screen.getByText('Used in Projects', { selector: 'span' })).toBeInTheDocument();
    });

    test('öffnet Preview nur für das geklickte Dataset', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        const previewButtons = screen.getAllByTitle('Preview');
        fireEvent.click(previewButtons[1]); // Click on second dataset

        // Only one preview panel should be open
        const expandedRows = document.querySelectorAll('.datasets-table-row--expanded');
        expect(expandedRows).toHaveLength(1);
    });

    // ===== File Size Formatting =====

    test('formatiert Dateigrößen korrekt', async () => {
        render(<Datasets />);
        await waitFor(() => {
            expect(screen.getByText('sales_data.csv')).toBeInTheDocument();
        });

        expect(screen.getByText('256 B')).toBeInTheDocument();
        expect(screen.getByText('500.00 KB')).toBeInTheDocument();
        expect(screen.getByText('2.00 MB')).toBeInTheDocument();
    });
});

