import React, { useState } from 'react';
import TopBar from './components/TopBar/TopBar';
import FileUpload from './components/FileUpload/FileUpload';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('prepare');

  const handleFilesSelected = (files) => {
    console.log('Selected files:', files);
    // Dateien wurden ausgewählt, aber noch nicht hochgeladen
  };

  const handleUpload = async (files) => {
    console.log('Uploading files:', files);
    // Hier wird später der Backend-Upload implementiert
    // try {
    //   await uploadFiles(files);
    //   // Erfolgsmeldung anzeigen
    // } catch (error) {
    //   // Fehlermeldung anzeigen
    // }
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
