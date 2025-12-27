const API_BASE_URL = 'http://localhost:8000/api/v1';

export async function uploadDataset(file) {
    const formData = new FormData();
    // Wichtig: Key MUSS 'file' heißen (FastAPI UploadFile = File(...))
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/datasets`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Dataset upload failed: ${text}`);
    }

    // Backend speichert die Datei (StorageService) + Metadaten (DB)
    // und liefert DatasetOut zurück (z. B. id, filename, created_at)
    return await response.json();
}

export async function getDatasets() {
    const response = await fetch(`${API_BASE_URL}/datasets`);
    return response.json();
}

export async function deleteDataset(id) {
    await fetch(`${API_BASE_URL}/datasets/${id}`, {
        method: 'DELETE',
    });
}

export async function getDatasetSchema(id) {
    const response = await fetch(`${API_BASE_URL}/datasets/${id}/schema`);
    return response.json();
}