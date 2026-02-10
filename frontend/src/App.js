import React, { useState } from 'react';
import TopBar from './components/TopBar/TopBar';
import Sidebar from './components/Sidebar/Sidebar';
import Prepare from './components/Prepare/Prepare';
import Explore from './components/Explore/Explore';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="App">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="App-body">
                <Sidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(prev => !prev)}
                />

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
        </div>
    );
}

export default App;