const API_BASE_URL = 'http://localhost:8000/api/v1';

export async function getProjects() {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
        throw new Error('Failed to load projects');
    }
    return response.json();
}

export async function createProject(payload) {
    const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Project creation failed: ${text}`);
    }
    return response.json();
}

export async function updateProject(projectId, payload) {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Project update failed: ${text}`);
    }
    return response.json();
}

export async function deleteProject(projectId) {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Project delete failed: ${text}`);
    }
}
