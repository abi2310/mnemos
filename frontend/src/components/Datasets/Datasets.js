import React, { useState, useEffect, useMemo } from 'react';
import { getDatasets } from '../../services/DatasetService/datasetService';
import './Datasets.css';

/**
 * Datasets Component
 *
 * Übersicht aller hochgeladenen Dateien.
 * Pro Datei: Vorschau (Tabellenform) und Anzeige der Projektverwendung.
 */
function Datasets() {
    const [datasets, setDatasets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedPreview, setExpandedPreview] = useState(null);
    const [expandedProjects, setExpandedProjects] = useState(null);
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        try {
            setIsLoading(true);
            const data = await getDatasets();
            setDatasets(data);
        } catch (error) {
            console.error('Failed to load datasets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDatasets = useMemo(() => {
        let result = datasets;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(dataset =>
                dataset.original_name?.toLowerCase().includes(query) ||
                dataset.dataset_id?.toString().includes(query)
            );
        }
        result = [...result].sort((a, b) => {
            let valA, valB;
            if (sortKey === 'original_name') {
                valA = (a.original_name || '').toLowerCase();
                valB = (b.original_name || '').toLowerCase();
            } else if (sortKey === 'size_bytes') {
                valA = a.size_bytes || 0;
                valB = b.size_bytes || 0;
            } else {
                valA = new Date(a.created_at || 0).getTime();
                valB = new Date(b.created_at || 0).getTime();
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [datasets, searchQuery, sortKey, sortDir]);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortIndicator = (key) => {
        if (sortKey !== key) return '';
        return sortDir === 'asc' ? ' ▲' : ' ▼';
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
    };

    const togglePreview = (datasetId) => {
        setExpandedPreview(prev => prev === datasetId ? null : datasetId);
        setExpandedProjects(null);
    };

    const toggleProjects = (datasetId) => {
        setExpandedProjects(prev => prev === datasetId ? null : datasetId);
        setExpandedPreview(null);
    };

    return (
        <div className="datasets-page">
            <div className="datasets-header">
                <h1 className="datasets-title">Datasets</h1>
            </div>

            {/* Toolbar */}
            <div className="datasets-toolbar">
                <div className="datasets-search">
                    <svg
                        className="datasets-search-icon"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <input
                        type="text"
                        className="datasets-search-input"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search files"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="datasets-table-container">
                {isLoading ? (
                    <div className="datasets-loading">
                        <p>Loading files...</p>
                    </div>
                ) : filteredDatasets.length === 0 ? (
                    <div className="datasets-empty">
                        <svg
                            className="datasets-empty-icon"
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <p className="datasets-empty-text">
                            {searchQuery ? 'No files found' : 'No files uploaded yet'}
                        </p>
                        {searchQuery && (
                            <button
                                className="datasets-empty-button"
                                onClick={() => setSearchQuery('')}
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="datasets-table-wrapper">
                        <table className="datasets-table">
                            <thead>
                                <tr>
                                    <th className="datasets-table-header datasets-table-header--sortable" onClick={() => handleSort('original_name')}>Name{sortIndicator('original_name')}</th>
                                    <th className="datasets-table-header datasets-table-header--sortable" onClick={() => handleSort('size_bytes')}>Size{sortIndicator('size_bytes')}</th>
                                    <th className="datasets-table-header datasets-table-header--sortable" onClick={() => handleSort('created_at')}>Upload Date{sortIndicator('created_at')}</th>
                                    <th className="datasets-table-header datasets-table-header--actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDatasets.map((dataset) => (
                                    <React.Fragment key={dataset.dataset_id}>
                                        <tr className="datasets-table-row">
                                            <td className="datasets-table-cell datasets-table-cell--name">
                                                <div>
                                                    <svg
                                                        className="datasets-file-icon"
                                                        width="20"
                                                        height="20"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    <span>{dataset.original_name || 'Unnamed file'}</span>
                                                </div>
                                            </td>
                                            <td className="datasets-table-cell">
                                                {formatFileSize(dataset.size_bytes)}
                                            </td>
                                            <td className="datasets-table-cell">
                                                {formatDate(dataset.created_at)}
                                            </td>
                                            <td className="datasets-table-cell datasets-table-cell--actions">
                                                <div className="datasets-row-actions">
                                                    <button
                                                        className={`datasets-row-action-btn ${expandedProjects === dataset.dataset_id ? 'datasets-row-action-btn--active' : ''}`}
                                                        onClick={() => toggleProjects(dataset.dataset_id)}
                                                        title="Used in Projects"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                            <path
                                                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                        Projects
                                                    </button>
                                                    <button
                                                        className={`datasets-row-action-btn ${expandedPreview === dataset.dataset_id ? 'datasets-row-action-btn--active' : ''}`}
                                                        onClick={() => togglePreview(dataset.dataset_id)}
                                                        title="Preview"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                            <path
                                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path
                                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                        Preview
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Projects Row */}
                                        {expandedProjects === dataset.dataset_id && (
                                            <tr className="datasets-table-row--expanded">
                                                <td colSpan="4" className="datasets-table-cell--expanded">
                                                    <div className="datasets-projects-panel">
                                                        <div className="datasets-projects-header">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                <path
                                                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                            </svg>
                                                            <span>Used in Projects</span>
                                                            <button
                                                                className="datasets-projects-close"
                                                                onClick={() => setExpandedProjects(null)}
                                                                aria-label="Close"
                                                            >✕</button>
                                                        </div>
                                                        <div className="datasets-projects-body">
                                                            <p className="datasets-projects-empty">NEEDS TO BE IMPLEMENTED!</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Preview Row */}
                                        {expandedPreview === dataset.dataset_id && (
                                            <tr className="datasets-table-row--expanded">
                                                <td colSpan="4" className="datasets-table-cell--expanded">
                                                    <div className="datasets-preview-placeholder">
                                                        <p>NEEDS TO BE IMPLEMENTED!</p>
                                                        <button
                                                            className="datasets-preview-close"
                                                            onClick={() => setExpandedPreview(null)}
                                                        >Close</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Datasets;

