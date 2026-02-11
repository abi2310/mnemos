import React, { useState, useMemo } from 'react';
import FilePreviewPanel from './FilePreviewPanel';
import './FilesSection.css';

/**
 * FilesSection - Übersicht der hochgeladenen Dateien
 * 
 * Features:
 * - Toolbar mit Search Input
 * - Bulk Actions (Download, Delete, Chat with files)
 * - Tabelle mit Checkbox, Name, Size, Upload Date, Row Actions
 * - Row Actions: Open, Download, Delete
 * - Expandable Preview Panel unterhalb der Tabelle
 */
function FilesSection({ 
    datasets, 
    isLoading, 
    onDelete, 
    onOpenPreview,
    selectedPreviewFile,
    onClosePreview
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');

    // Filter und Sort Datasets
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

    // Select All Handler
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredDatasets.map(d => d.dataset_id));
        } else {
            setSelectedIds([]);
        }
    };

    // Single Select Handler
    const handleSelectRow = (datasetId) => {
        setSelectedIds(prev => {
            if (prev.includes(datasetId)) {
                return prev.filter(id => id !== datasetId);
            } else {
                return [...prev, datasetId];
            }
        });
    };

    // Bulk Delete Handler
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        
        if (!window.confirm(`Delete ${selectedIds.length} file(s)?`)) return;

        try {
            await onDelete(selectedIds);
            setSelectedIds([]);
        } catch (error) {
            console.error('Bulk delete failed:', error);
            alert('Failed to delete files. Please try again.');
        }
    };

    // Single Delete Handler
    const handleSingleDelete = async (datasetId) => {
        if (!window.confirm('Delete this file?')) return;

        try {
            await onDelete([datasetId]);
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete file. Please try again.');
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Format date
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

    const allSelected = filteredDatasets.length > 0 && 
                       selectedIds.length === filteredDatasets.length;
    const someSelected = selectedIds.length > 0 && !allSelected;

    return (
        <section className="files-section">
            {/* Toolbar */}
            <div className="files-toolbar">
                {/* Search Input */}
                <div className="files-search">
                    <svg 
                        className="files-search-icon" 
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
                        className="files-search-input"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search files"
                    />
                </div>

                {/* Bulk Actions - reserviert für zukünftige Nutzung */}
            </div>

            {/* Table */}
            <div className="files-table-container">
                {isLoading ? (
                    <div className="files-loading">
                        <p>Loading files...</p>
                    </div>
                ) : filteredDatasets.length === 0 ? (
                    <div className="files-empty">
                        <svg 
                            className="files-empty-icon" 
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
                        <p className="files-empty-text">
                            {searchQuery ? 'No files found' : 'No files uploaded yet'}
                        </p>
                        {searchQuery && (
                            <button
                                className="files-empty-button"
                                onClick={() => setSearchQuery('')}
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="files-table-wrapper">
                        <table className="files-table">
                            <thead>
                                <tr>
                                    <th className="files-table-header files-table-header--checkbox">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={input => {
                                                if (input) {
                                                    input.indeterminate = someSelected;
                                                }
                                            }}
                                            onChange={handleSelectAll}
                                            aria-label="Select all files"
                                        />
                                    </th>
                                    <th className="files-table-header files-table-header--sortable" onClick={() => handleSort('original_name')}>Name{sortIndicator('original_name')}</th>
                                    <th className="files-table-header files-table-header--sortable" onClick={() => handleSort('size_bytes')}>Size{sortIndicator('size_bytes')}</th>
                                    <th className="files-table-header files-table-header--sortable" onClick={() => handleSort('created_at')}>Upload Date{sortIndicator('created_at')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDatasets.map((dataset) => (
                                    <React.Fragment key={dataset.dataset_id}>
                                        <tr 
                                            className={`files-table-row ${selectedIds.includes(dataset.dataset_id) ? 'selected' : ''}`}
                                        >
                                        <td className="files-table-cell files-table-cell--checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(dataset.dataset_id)}
                                                onChange={() => handleSelectRow(dataset.dataset_id)}
                                                aria-label={`Select ${dataset.original_name}`}
                                            />
                                        </td>
                                        <td className="files-table-cell files-table-cell--name">
                                            <div>
                                                <svg 
                                                    className="files-table-file-icon" 
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
                                        <td className="files-table-cell">
                                            {formatFileSize(dataset.size_bytes)}
                                        </td>
                                        <td className="files-table-cell">
                                            {formatDate(dataset.created_at)}
                                        </td>
                                    </tr>
                                    
                                    {/* Preview Row - direkt unter der ausgewählten Zeile */}
                                    {selectedPreviewFile && selectedPreviewFile.dataset_id === dataset.dataset_id && (
                                        <tr className="files-table-row--preview">
                                            <td className="files-table-cell--preview" colSpan="4">
                                                <FilePreviewPanel
                                                    file={selectedPreviewFile}
                                                    onClose={onClosePreview}
                                                />
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
        </section>
    );
}

export default FilesSection;

