import React, { useState, useEffect } from 'react';
import { getDatasetPreview } from '../../services/DatasetService/datasetService';
import DataTablePreview from '../DataTablePreview/DataTablePreview';
import './DataWrangler.css';

function DataWrangler({ datasets }) {
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
                    <select
                        className="wrangler-dataset-select"
                        value={selectedDatasetId || ''}
                        onChange={(e) => setSelectedDatasetId(e.target.value)}
                    >
                        <option value="" disabled>Select Dataset</option>
                        {datasets.map(d => (
                            <option key={d.dataset_id} value={d.dataset_id}>
                                {d.original_name || `Dataset ${d.dataset_id}`}
                            </option>
                        ))}
                    </select>
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
                            <DataTablePreview data={previewData} />
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
