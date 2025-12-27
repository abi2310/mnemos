import React, { useState } from 'react';
import TopBar from './components/TopBar/TopBar';
import FileUpload from './components/FileUpload/FileUpload';
import DataTablePreview from './components/DataTablePreview/DataTablePreview';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');
    const [previewData, setPreviewData] = useState([]);

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
        console.log('Uploading files:', files);
        // Backend-Upload kommt später
    };

    return (
        <div className="App">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="App-main">
                {activeTab === 'prepare' && (
                    <div className="App-content">
                        <h1 className="App-title">Upload Data</h1>
                        <p className="App-subtitle">
                            Upload your data to start the analysis
                        </p>

                        <FileUpload
                            onFilesSelected={handleFilesSelected}
                            onUpload={handleUpload}
                        />

                        <DataTablePreview data={previewData} />
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