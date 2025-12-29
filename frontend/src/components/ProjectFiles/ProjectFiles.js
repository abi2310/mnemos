import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { getDatasets } from '../../services/DatasetService/datasetService';
import './ProjectFiles.css';

/**
 * ProjectFiles Component
 * 
 * Zeigt die Dateien/Datasets eines Projekts in Tabellenform.
 * Ermöglicht später die Anpassung von Attributen wie id, name, etc.
 */
function ProjectFiles() {
    const { selectedProject } = useProject();
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFileId, setSelectedFileId] = useState(null);

    useEffect(() => {
        loadProjectFiles();
    }, [selectedProject]);

    const loadProjectFiles = async () => {
        if (!selectedProject) return;

        try {
            setIsLoading(true);
            // TODO: Später mit projectId filtern wenn Backend das unterstützt
            const data = await getDatasets();
            
            // Mock: Filtere Datasets für dieses Projekt (später vom Backend)
            // Für jetzt zeigen wir alle Datasets als Projekt-Files
            // Filtere nur gültige Einträge (mit id)
            const validFiles = (data || []).filter(file => file && file.id);
            setFiles(validFiles);
        } catch (error) {
            console.error('Failed to load project files:', error);
            setFiles([]); // Setze leeres Array bei Fehler
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileClick = (fileId) => {
        setSelectedFileId(selectedFileId === fileId ? null : fileId);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!selectedProject) {
        return (
            <div className="project-files-empty">
                <p>No project selected</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="project-files-loading">
                <div className="project-files-spinner"></div>
                <p>Loading project files...</p>
            </div>
        );
    }

    return (
        <div className="project-files-container">
            <div className="project-files-header">
                <h2 className="project-files-title">Project Files</h2>
                <p className="project-files-subtitle">
                    Manage and configure datasets for <strong>{selectedProject.name}</strong>
                </p>
            </div>

            {/* Implementation Notice */}
            <div className="project-files-notice">
                <div className="project-files-notice-badge">Preview</div>
                <p className="project-files-notice-text">
                    Data preview needs to be implemented
                </p>
            </div>

            <div className="project-files-content">
                {files.length === 0 ? (
                    <div className="project-files-empty">
                        <svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3H17V7H3V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 10H17V14H3V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 17H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p>No files in this project yet</p>
                        <p className="project-files-empty-hint">
                            Upload datasets to get started
                        </p>
                    </div>
                ) : (
                    <div className="project-files-table-wrapper">
                        <table className="project-files-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Size</th>
                                    <th>Rows</th>
                                    <th>Columns</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file) => {
                                    if (!file || !file.id) return null;
                                    
                                    return (
                                        <React.Fragment key={file.id}>
                                            <tr 
                                                className={`project-files-row ${selectedFileId === file.id ? 'selected' : ''}`}
                                                onClick={() => handleFileClick(file.id)}
                                            >
                                                <td className="project-files-cell-id">
                                                    <code>{file.id.substring(0, 8)}...</code>
                                                </td>
                                                <td className="project-files-cell-name">
                                                    {file.filename || 'Untitled'}
                                                </td>
                                                <td className="project-files-cell-type">
                                                    <span className="project-files-badge">
                                                        {file.file_type || 'CSV'}
                                                    </span>
                                                </td>
                                                <td>{formatFileSize(file.size)}</td>
                                                <td>{file.row_count?.toLocaleString() || 'N/A'}</td>
                                                <td>{file.column_count || 'N/A'}</td>
                                                <td>{formatDate(file.created_at)}</td>
                                            <td>
                                                <button 
                                                    className="project-files-btn-action"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // TODO: Implement edit
                                                    }}
                                                    title="Edit attributes"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M14.5 2.5C14.8978 2.1022 15.4374 1.87868 16 1.87868C16.2786 1.87868 16.5544 1.93355 16.8118 2.04015C17.0692 2.14674 17.303 2.30301 17.5 2.5C17.697 2.69698 17.8533 2.9308 17.9599 3.18819C18.0665 3.44558 18.1213 3.72142 18.1213 4C18.1213 4.27858 18.0665 4.55442 17.9599 4.81181C17.8533 5.0692 17.697 5.30302 17.5 5.5L6.5 16.5L2 18L3.5 13.5L14.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                        {selectedFileId === file.id && (
                                            <tr className="project-files-detail-row">
                                                <td colSpan="8">
                                                    <div className="project-files-detail">
                                                        <div className="project-files-detail-section">
                                                            <h4>File Details</h4>
                                                            <dl className="project-files-detail-list">
                                                                <div className="project-files-detail-item">
                                                                    <dt>Full ID:</dt>
                                                                    <dd><code>{file.id}</code></dd>
                                                                </div>
                                                                <div className="project-files-detail-item">
                                                                    <dt>Filename:</dt>
                                                                    <dd>{file.filename}</dd>
                                                                </div>
                                                                <div className="project-files-detail-item">
                                                                    <dt>Upload Path:</dt>
                                                                    <dd><code>{file.upload_path || 'N/A'}</code></dd>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                        
                                                        <div className="project-files-detail-section">
                                                            <h4>Metadata</h4>
                                                            <p className="project-files-detail-hint">
                                                                Future: Edit attributes, configure preprocessing, set data types
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectFiles;

