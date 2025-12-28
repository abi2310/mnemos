import React, { useState, useEffect } from 'react';
import { getDatasets } from '../../services/DatasetService/datasetService';
import './Sidebar.css';

function Sidebar({ isOpen, onToggle, onDatasetSelect, onDatasetView, selectedDatasets }) {
    const [activeSection, setActiveSection] = useState('myData');
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedDatasets, setExpandedDatasets] = useState({});

    useEffect(() => {
        if (isOpen && activeSection === 'myData') {
            loadDatasets();
        }
    }, [isOpen, activeSection]);

    const loadDatasets = async () => {
        setLoading(true);
        try {
            const data = await getDatasets();
            // Nur aktive Datasets anzeigen
            const activeDatasets = data.filter(ds => ds.status === 'uploaded');
            setDatasets(activeDatasets);
        } catch (error) {
            console.error('Error loading datasets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDatasetClick = (dataset) => {
        // Toggle expanded state
        setExpandedDatasets(prev => ({
            ...prev,
            [dataset.dataset_id]: !prev[dataset.dataset_id]
        }));
        
        // Callback zum Anzeigen der Daten
        if (onDatasetView) {
            onDatasetView(dataset);
        }
    };

    const handleDatasetCheckbox = (dataset, isChecked) => {
        if (onDatasetSelect) {
            onDatasetSelect(dataset, isChecked);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onToggle} />
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <button
                        className="sidebar-toggle"
                        onClick={onToggle}
                        aria-label="Toggle sidebar"
                    >
                        {isOpen ? '←' : '→'}
                    </button>
                    {isOpen && <h2 className="sidebar-title">Menu</h2>}
                </div>

                {isOpen && (
                    <div className="sidebar-content">
                        <nav className="sidebar-nav">
                            <button
                                className={`sidebar-nav-item ${activeSection === 'myData' ? 'active' : ''}`}
                                onClick={() => setActiveSection('myData')}
                            >
                                📊 My Data
                            </button>
                            <button
                                className={`sidebar-nav-item ${activeSection === 'dashboards' ? 'active' : ''}`}
                                onClick={() => setActiveSection('dashboards')}
                            >
                                📈 Dashboards
                            </button>
                            <button
                                className={`sidebar-nav-item ${activeSection === 'chats' ? 'active' : ''}`}
                                onClick={() => setActiveSection('chats')}
                            >
                                💬 Chats
                            </button>
                        </nav>

                        <div className="sidebar-section">
                            {activeSection === 'myData' && (
                                <div className="my-data-section">
                                    <h3 className="sidebar-section-title">My Data</h3>
                                    {loading ? (
                                        <div className="sidebar-loading">Loading...</div>
                                    ) : datasets.length === 0 ? (
                                        <div className="sidebar-empty">No datasets uploaded yet</div>
                                    ) : (
                                        <ul className="dataset-list">
                                            {datasets.map((dataset) => (
                                                <li key={dataset.dataset_id} className="dataset-item">
                                                    <div className="dataset-header">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDatasets?.some(
                                                                ds => ds.dataset_id === dataset.dataset_id
                                                            ) || false}
                                                            onChange={(e) =>
                                                                handleDatasetCheckbox(dataset, e.target.checked)
                                                            }
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="dataset-checkbox"
                                                        />
                                                        <button
                                                            className="dataset-name-button"
                                                            onClick={() => handleDatasetClick(dataset)}
                                                        >
                                                            {dataset.original_name}
                                                        </button>
                                                    </div>
                                                    {expandedDatasets[dataset.dataset_id] && (
                                                        <div className="dataset-details">
                                                            <div className="dataset-detail-item">
                                                                <span className="dataset-detail-label">Size:</span>
                                                                <span>{formatFileSize(dataset.size_bytes)}</span>
                                                            </div>
                                                            <div className="dataset-detail-item">
                                                                <span className="dataset-detail-label">Uploaded:</span>
                                                                <span>{formatDate(dataset.created_at)}</span>
                                                            </div>
                                                            <div className="dataset-detail-item">
                                                                <span className="dataset-detail-label">ID:</span>
                                                                <span className="dataset-id">{dataset.dataset_id}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {activeSection === 'dashboards' && (
                                <div className="sidebar-section-content">
                                    <h3 className="sidebar-section-title">Dashboards</h3>
                                    <div className="sidebar-empty">Coming soon</div>
                                </div>
                            )}

                            {activeSection === 'chats' && (
                                <div className="sidebar-section-content">
                                    <h3 className="sidebar-section-title">Chats</h3>
                                    <div className="sidebar-empty">Coming soon</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default Sidebar;

