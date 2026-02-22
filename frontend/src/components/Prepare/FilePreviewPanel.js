import React from 'react';
import './FilePreviewPanel.css';

/**
 * FilePreviewPanel - UI-Skeleton für Datei-Vorschau
 * 
 * Zeigt ein expandable Panel unterhalb der Tabelle mit:
 * - Dateiname und Metadaten
 * - Placeholder Tabelle (8 Zeilen × 6 Spalten)
 * - Hinweistext: "Preview will be implemented later"
 * - Buttons: Close, Open in new view
 * 
 * Keine echte CSV/Excel Verarbeitung - nur UI-Design
 */
function FilePreviewPanel({ file, onClose }) {
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

    // Generate skeleton table (8 rows × 6 columns)
    const skeletonRows = Array.from({ length: 8 }, (_, i) => i);
    const skeletonCols = Array.from({ length: 6 }, (_, i) => i);

    return (
        <div className="preview-panel" role="region" aria-label="File preview">
            {/* Header */}
            <div className="preview-header">
                <div className="preview-header-content">
                    <div className="preview-title-section">
                        <svg 
                            className="preview-file-icon" 
                            width="24" 
                            height="24" 
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
                        <div>
                            <h3 className="preview-title">{file.filename || 'Unnamed file'}</h3>
                            <div className="preview-metadata">
                                <span className="preview-metadata-item">
                                    {formatFileSize(file.file_size)}
                                </span>
                                <span className="preview-metadata-divider">•</span>
                                <span className="preview-metadata-item">
                                    {formatDate(file.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="preview-actions">
                        <button
                            className="preview-action-button"
                            disabled
                            title="Open in new view (not implemented)"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path 
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                />
                            </svg>
                            Open in new view
                        </button>
                        <button
                            className="preview-action-button preview-action-button--close"
                            onClick={onClose}
                            aria-label="Close preview"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path 
                                    d="M6 18L18 6M6 6l12 12" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                />
                            </svg>
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="preview-content">
                {/* Info Banner */}
                <div className="preview-info-banner">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path 
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                    <p>Preview will be implemented later. This is a placeholder UI.</p>
                </div>

                {/* Skeleton Table */}
                <div className="preview-table-wrapper">
                    <table className="preview-table">
                        <thead>
                            <tr>
                                {skeletonCols.map((col) => (
                                    <th key={col} className="preview-table-header">
                                        <div className="skeleton-text skeleton-text--header"></div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {skeletonRows.map((row) => (
                                <tr key={row}>
                                    {skeletonCols.map((col) => (
                                        <td key={col} className="preview-table-cell">
                                            <div className="skeleton-text"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FilePreviewPanel;

