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

    // Filter Datasets basierend auf Search Query
    const filteredDatasets = useMemo(() => {
        if (!searchQuery.trim()) return datasets;
        
        const query = searchQuery.toLowerCase();
        return datasets.filter(dataset => 
            dataset.filename?.toLowerCase().includes(query) ||
            dataset.id?.toString().includes(query)
        );
    }, [datasets, searchQuery]);

    // Select All Handler
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredDatasets.map(d => d.id));
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

                {/* Bulk Actions */}
                <div className="files-bulk-actions">
                    <button
                        className="files-action-button"
                        disabled={selectedIds.length === 0}
                        title="Download selected files"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5 5m0 0l-5-5m5 5V3" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                        Download ({selectedIds.length})
                    </button>
                    <button
                        className="files-action-button files-action-button--danger"
                        disabled={selectedIds.length === 0}
                        onClick={handleBulkDelete}
                        title="Delete selected files"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                        Delete ({selectedIds.length})
                    </button>
                    <button
                        className="files-action-button"
                        disabled={selectedIds.length === 0}
                        title="Chat with selected files"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path 
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                        Chat with files ({selectedIds.length})
                    </button>
                </div>
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
                                    <th className="files-table-header">Name</th>
                                    <th className="files-table-header">Size</th>
                                    <th className="files-table-header">Upload Date</th>
                                    <th className="files-table-header files-table-header--actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDatasets.map((dataset) => (
                                    <React.Fragment key={dataset.id}>
                                        <tr 
                                            className={`files-table-row ${selectedIds.includes(dataset.id) ? 'selected' : ''}`}
                                        >
                                        <td className="files-table-cell files-table-cell--checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(dataset.id)}
                                                onChange={() => handleSelectRow(dataset.id)}
                                                aria-label={`Select ${dataset.filename}`}
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
                                                <span>{dataset.filename || 'Unnamed file'}</span>
                                            </div>
                                        </td>
                                        <td className="files-table-cell">
                                            {formatFileSize(dataset.file_size)}
                                        </td>
                                        <td className="files-table-cell">
                                            {formatDate(dataset.created_at)}
                                        </td>
                                        <td className="files-table-cell files-table-cell--actions">
                                            <div className="files-row-actions">
                                                <button
                                                    className="files-row-action-button"
                                                    onClick={() => onOpenPreview(dataset)}
                                                    title="Open preview"
                                                    aria-label="Open preview"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
                                                    Open
                                                </button>
                                                <button
                                                    className="files-row-action-button"
                                                    disabled
                                                    title="Download file"
                                                    aria-label="Download file"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path 
                                                            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5 5m0 0l-5-5m5 5V3" 
                                                            stroke="currentColor" 
                                                            strokeWidth="2" 
                                                            strokeLinecap="round" 
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    Download
                                                </button>
                                                <button
                                                    className="files-row-action-button files-row-action-button--danger"
                                                    onClick={() => handleSingleDelete(dataset.id)}
                                                    title="Delete file"
                                                    aria-label="Delete file"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path 
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                                            stroke="currentColor" 
                                                            strokeWidth="2" 
                                                            strokeLinecap="round" 
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* Preview Row - direkt unter der ausgewählten Zeile */}
                                    {selectedPreviewFile && selectedPreviewFile.id === dataset.id && (
                                        <tr className="files-table-row--preview">
                                            <td className="files-table-cell--preview" colSpan="5">
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

