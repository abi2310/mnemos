import React, { useState } from 'react';
import TopBar from './components/TopBar/TopBar';
import Prepare from './components/Prepare/Prepare';
import Explore from './components/Explore/Explore';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');

    return (
        <div className="App">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="App-main">
                {activeTab === 'prepare' && (
                    <Prepare />
                )}

                {activeTab === 'explore' && (
                    <Explore />
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