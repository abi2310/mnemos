import { uploadDataset, deleteDataset } from '../datasetService';

global.fetch = jest.fn();

describe('datasetService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('uploadDataset sendet POST Request mit Datei', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: '123', filename: 'test.csv' }),
        });

        const file = new File(['a,b,c'], 'test.csv', { type: 'text/csv' });

        const result = await uploadDataset(file);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/datasets'),
            expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData),
            })
        );

        expect(result.id).toBe('123');
    });

    test('deleteDataset sendet DELETE Request', async () => {
        fetch.mockResolvedValueOnce({ ok: true });

        await deleteDataset('123');

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/datasets/123'),
            { method: 'DELETE' }
        );
    });
});