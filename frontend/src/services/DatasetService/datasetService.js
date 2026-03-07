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

export async function getQualityReport(id) {
    const response = await fetch(`${API_BASE_URL}/datasets/${id}/quality-report`);
    if (!response.ok) {
        throw new Error('Failed to load quality report');
    }
    return response.json();
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

export async function getDatasetPreview(id, limit = 100, useCleaned = false) {
    const url = new URL(`${API_BASE_URL}/datasets/${id}/preview`);
    url.searchParams.append('limit', limit);
    if (useCleaned) {
        url.searchParams.append('use_cleaned', 'true');
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Failed to load dataset preview');
    }
    return response.json();
}

export async function updateDataset(id, file, useCleaned = false) {
    const formData = new FormData();
    formData.append('file', file);
    if (useCleaned) {
        formData.append('use_cleaned', 'true');
    }

    const response = await fetch(`${API_BASE_URL}/datasets/${id}`, {
        method: 'PUT',
        body: formData,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Dataset update failed: ${text}`);
    }

    return await response.json();
}