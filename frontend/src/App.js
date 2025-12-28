import React, { useState, useRef } from 'react';
import TopBar from './components/TopBar/TopBar';
import Sidebar from './components/Sidebar/Sidebar';
import FileUpload from './components/FileUpload/FileUpload';
import { uploadDataset } from './services/DatasetService/datasetService';
import DataTablePreview from './components/DataTablePreview/DataTablePreview';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');
    const [previewData, setPreviewData] = useState([]);
    const [hasUploadedData, setHasUploadedData] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedDatasets, setSelectedDatasets] = useState([]);
    const [currentDataset, setCurrentDataset] = useState(null);
    const fileInputRef = useRef(null);

    const handleFilesSelected = (files) => {
        if (!files || files.length === 0) {
            setPreviewData([]);
            return;
        }

        const file = files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text
                .split('\n')
                .filter(Boolean)
                .slice(0, 31) // Header + 30 Zeilen
                .map(row => row.split(','));

            setPreviewData(rows);
        };

        reader.readAsText(file);
    };

    const handleUpload = async (files) => {
        if (!files || files.length === 0) return;

        try {
            const result = await uploadDataset(files[0]);
            console.log('Upload successful:', result);
            
            // Nach erfolgreichem Upload: Daten als hochgeladen markieren
            setHasUploadedData(true);
            
            // Preview-Daten aktualisieren
            handleFilesSelected(files);
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    const handleAddMoreFilesClick = () => {
        fileInputRef.current?.click();
    };

    const handleAddMoreFilesInput = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleFilesSelected(files);
            handleUpload(files);
        }
        // Reset input, damit derselbe Dateiname erneut ausgewählt werden kann
        e.target.value = '';
    };

    const handleDatasetSelect = (dataset, isChecked) => {
        if (isChecked) {
            setSelectedDatasets(prev => [...prev, dataset]);
        } else {
            setSelectedDatasets(prev => 
                prev.filter(ds => ds.dataset_id !== dataset.dataset_id)
            );
        }
    };

    const handleDatasetView = (dataset) => {
        setCurrentDataset(dataset);
        // Hier könnten wir die Daten des Datasets laden
        // Für jetzt verwenden wir die bereits geladenen Preview-Daten
        // TODO: API-Endpunkt zum Laden der Dataset-Daten implementieren
    };

    return (
        <div className="App">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onDatasetSelect={handleDatasetSelect}
                onDatasetView={handleDatasetView}
                selectedDatasets={selectedDatasets}
            />
            <TopBar 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
                onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
                showAddFilesButton={activeTab === 'prepare' && hasUploadedData}
                onAddFilesClick={handleAddMoreFilesClick}
                fileInputRef={fileInputRef}
                onAddFilesInput={handleAddMoreFilesInput}
            />

            <main className={`App-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
                {activeTab === 'prepare' && (
                    <div className="App-content">
                        {!hasUploadedData ? (
                            <>
                                <h1 className="App-title">Upload Data</h1>
                                <p className="App-subtitle">
                                    Upload your data to start the analysis
                                </p>
                                <FileUpload
                                    onFilesSelected={handleFilesSelected}
                                    onUpload={handleUpload}
                                />
                            </>
                        ) : (
                            <DataTablePreview data={previewData} />
                        )}
                    </div>
                )}

                {activeTab === 'explore' && (
                    <div className="App-content">
                        <h1 className="App-title">Explore</h1>
                        <p className="App-subtitle">Explore and visualize your data</p>
                    </div>
                )}

                {activeTab === 'predict' && (
                    <div className="App-content">
                        <h1 className="App-title">Predict</h1>
                        <p className="App-subtitle">Create predictions and forecasts</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;