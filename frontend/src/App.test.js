import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import App from './App';
import { getDatasets } from './services/DatasetService/datasetService';

jest.mock('./services/DatasetService/datasetService', () => ({
    getDatasets: jest.fn(),
    uploadDataset: jest.fn(),
    deleteDataset: jest.fn(),
    getDatasetSchema: jest.fn(),
}));

describe('App Component', () => {
    beforeEach(() => {
        getDatasets.mockResolvedValue([]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('rendert die App ohne Fehler', () => {
        render(<App />);
        const mainElement = screen.getByRole('main');
        expect(mainElement).toBeInTheDocument();
    });

    // ===== Home Page =====

    test('zeigt die Home-Seite mit Logo, Willkommenstext und Quick Guide', () => {
        render(<App />);

        const logos = screen.getAllByAltText(/Mnemos Logo/i);
        expect(logos.length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText(/Welcome to MNEMOS\./i)).toBeInTheDocument();
        expect(screen.getByText(/Analyze like never before/i)).toBeInTheDocument();
        expect(screen.getByText(/Quick Guide/i)).toBeInTheDocument();
        expect(screen.getByText(/Datasets/i, { selector: 'h3' })).toBeInTheDocument();
        expect(screen.getByText(/Projects/i, { selector: 'h3' })).toBeInTheDocument();
        expect(screen.getByText(/Prepare/i, { selector: 'h3' })).toBeInTheDocument();
        expect(screen.getByText(/Explore/i, { selector: 'h3' })).toBeInTheDocument();
    });

    test('versteckt die TopBar-Navigation auf der Startseite', () => {
        render(<App />);

        screen.queryByRole('button', { name: /^prepare$/i });
        const topbar = screen.getByRole('banner');
        expect(topbar).not.toHaveClass('topbar--with-nav');
    });

    // ===== Navigation =====

    const clickSidebarNav = (name) => {
        const sidebar = screen.getByRole('complementary');
        fireEvent.click(within(sidebar).getByText(name));
    };

    test('navigiert zur Projects-Seite über die Sidebar', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);

        clickSidebarNav('Projects');

        expect(screen.getByText('+ New Project')).toBeInTheDocument();
        expect(screen.getByText(/Existing projects will be displayed here/i)).toBeInTheDocument();
    });

    test('navigiert zur Datasets-Seite über die Sidebar', async () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);

        await act(async () => {
            clickSidebarNav('Datasets');
        });

        await waitFor(() => {
            expect(screen.getByText('Datasets', { selector: '.datasets-title' })).toBeInTheDocument();
        });
    });

    test('navigiert zurück zur Home-Seite über die Sidebar', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);

        clickSidebarNav('Projects');
        expect(screen.getByText('+ New Project')).toBeInTheDocument();

        clickSidebarNav('Home');
        expect(screen.getByText(/Welcome to MNEMOS\./i)).toBeInTheDocument();
    });

    // ===== New Project Modal =====

    test('öffnet und schließt das New-Project-Modal', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);
        clickSidebarNav('Projects');

        fireEvent.click(screen.getByText('+ New Project'));
        expect(screen.getByText('New Project', { selector: '.modal-title' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter project name/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Close modal/i }));
        expect(screen.queryByText('New Project', { selector: '.modal-title' })).not.toBeInTheDocument();
    });

    test('zeigt Fehlermeldung bei leerem Projektnamen', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);
        clickSidebarNav('Projects');

        fireEvent.click(screen.getByText('+ New Project'));
        fireEvent.click(screen.getByText('Create Project'));

        expect(screen.getByText(/Please enter a project name/i)).toBeInTheDocument();
    });

    test('Fehlermeldung verschwindet bei Texteingabe', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);
        clickSidebarNav('Projects');

        fireEvent.click(screen.getByText('+ New Project'));
        fireEvent.click(screen.getByText('Create Project'));
        expect(screen.getByText(/Please enter a project name/i)).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText(/Enter project name/i), { target: { value: 'Test' } });
        expect(screen.queryByText(/Please enter a project name/i)).not.toBeInTheDocument();
    });

    test('erstellt ein Projekt und zeigt die Tab-Navigation', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);
        clickSidebarNav('Projects');

        fireEvent.click(screen.getByText('+ New Project'));
        fireEvent.change(screen.getByPlaceholderText(/Enter project name/i), { target: { value: 'My Project' } });
        fireEvent.click(screen.getByText('Create Project'));

        expect(screen.queryByText('New Project', { selector: '.modal-title' })).not.toBeInTheDocument();

        const topbar = screen.getByRole('banner');
        expect(topbar).toHaveClass('topbar--with-nav');
    });

    // ===== Prepare Tab Placeholder =====

    test('zeigt Prepare-Platzhalter wenn Projekt aktiv', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);
        clickSidebarNav('Projects');
        fireEvent.click(screen.getByText('+ New Project'));
        fireEvent.change(screen.getByPlaceholderText(/Enter project name/i), { target: { value: 'Test' } });
        fireEvent.click(screen.getByText('Create Project'));

        expect(screen.getByText(/Drag files to upload or/i)).toBeInTheDocument();
        expect(screen.queryByText(/Not yet implemented/i)).not.toBeInTheDocument();
    });

    // ===== Sidebar Toggle =====

    test('Toggle-Button zeigt ☰ wenn nicht gepinnt und ✕ wenn gepinnt', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        expect(toggleButton).toHaveTextContent('☰');

        fireEvent.click(toggleButton);

        const unpinButton = screen.getByLabelText(/Sidebar loslösen/i);
        expect(unpinButton).toHaveTextContent('✕');
    });

    test('Sidebar erhält App--sidebar-pinned Klasse wenn gepinnt', () => {
        render(<App />);

        const appDiv = screen.getByTestId('app-root');
        expect(appDiv).not.toHaveClass('App--sidebar-pinned');

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);

        expect(appDiv).toHaveClass('App--sidebar-pinned');
    });

    // ===== Modal Overlay Click =====

    test('schließt das Modal bei Klick auf Overlay', () => {
        render(<App />);

        const toggleButton = screen.getByLabelText(/Sidebar fixieren/i);
        fireEvent.click(toggleButton);
        clickSidebarNav('Projects');

        fireEvent.click(screen.getByText('+ New Project'));
        expect(screen.getByText('New Project', { selector: '.modal-title' })).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('modal-overlay'));
        expect(screen.queryByText('New Project', { selector: '.modal-title' })).not.toBeInTheDocument();
    });
});
