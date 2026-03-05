import React, { useState, useEffect } from 'react';
import { getDatasetPreview, updateDataset } from '../../services/DatasetService/datasetService';
import DataTablePreview from '../DataTablePreview/DataTablePreview';
import { convertDataToCSV } from './DataTypeUtils';
import './DataWrangler.css';

function DataWrangler({ datasets, onRemoveDataset }) {
    const [selectedDatasetId, setSelectedDatasetId] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (datasets.length > 0 && !selectedDatasetId) {
            setSelectedDatasetId(datasets[0].dataset_id);
        }
    }, [datasets, selectedDatasetId]);

    useEffect(() => {
        if (!selectedDatasetId) {
            setPreviewData([]);
            return;
        }

        const loadPreview = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getDatasetPreview(selectedDatasetId, 200);
                setPreviewData(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load dataset data.');
            } finally {
                setIsLoading(false);
            }
        };
        loadPreview();
    }, [selectedDatasetId]);

    const handleCellChange = async (rowIndex, colIndex, newValue) => {
        try {
            // Updated local state
            const newData = [...previewData];
            const newRow = [...newData[rowIndex + 1]];
            newRow[colIndex] = newValue;
            newData[rowIndex + 1] = newRow;
            setPreviewData(newData);

            // Convert and save entire file using generic PUT
            const csvString = convertDataToCSV(newData);
            const selectedDataset = datasets.find(d => d.dataset_id === selectedDatasetId);
            const originalName = selectedDataset?.original_name || 'dataset.csv';

            const file = new File([csvString], originalName, { type: 'text/csv' });
            await updateDataset(selectedDatasetId, file);
        } catch (err) {
            console.error("Failed to update cell backend:", err);
            setError("Failed to save changes visually. Try again.");
        }
    };

    if (!datasets || datasets.length === 0) {
        return (
            <div className="wrangler-empty">
                <div className="wrangler-empty-content">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                        <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h2>No datasets available</h2>
                    <p>Upload a dataset to start wrangling data.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="data-wrangler-container">
            {/* Top Toolbar */}
            <div className="wrangler-toolbar">
                <div className="wrangler-toolbar-left">
                    <div className="wrangler-dataset-tabs">
                        {datasets.map(d => (
                            <button
                                key={d.dataset_id}
                                className={`wrangler-tab ${selectedDatasetId === d.dataset_id ? 'active' : ''}`}
                                onClick={() => setSelectedDatasetId(d.dataset_id)}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', opacity: 0.7 }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                {d.original_name || `Dataset ${d.dataset_id}`}
                                {onRemoveDataset && (
                                    <span
                                        className="wrangler-tab-close"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveDataset(d.dataset_id);
                                        }}
                                        title="Remove dataset"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="wrangler-toolbar-right">
                    <button className="wrangler-action-btn primary">Export Code</button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="wrangler-main">
                {isLoading ? (
                    <div className="wrangler-loading">
                        <div className="spinner"></div>
                        <p>Loading dataset...</p>
                    </div>
                ) : error ? (
                    <div className="wrangler-error">{error}</div>
                ) : (
                    <div className="wrangler-table-area">
                        {previewData.length > 0 ? (
                            <DataTablePreview
                                data={previewData}
                                datasetId={selectedDatasetId}
                                onCellChange={handleCellChange}
                            />
                        ) : (
                            <div className="wrangler-empty-state">No data rows found.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DataWrangler;
