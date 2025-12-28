import React, { useState, useRef } from 'react';
import TopBar from './components/TopBar/TopBar';
import FileUpload from './components/FileUpload/FileUpload';
import { uploadDataset } from './services/DatasetService/datasetService';
import DataTablePreview from './components/DataTablePreview/DataTablePreview';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');
    const [previewData, setPreviewData] = useState([]);
    const [hasUploadedData, setHasUploadedData] = useState(false);
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

    return (
        <div className="App">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="App-main">
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
                            <>
                                <div className="App-header-with-add-button">
                                    <button
                                        className="App-add-files-button"
                                        onClick={handleAddMoreFilesClick}
                                        type="button"
                                        aria-label="Add more files"
                                    >
                                        + Add Files
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".csv,.xlsx,.xls,.json"
                                        onChange={handleAddMoreFilesInput}
                                        className="file-upload-input"
                                        aria-label="File Upload"
                                    />
                                </div>
                                <DataTablePreview data={previewData} />
                            </>
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