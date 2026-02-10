import React, { useState } from 'react';
import TopBar from './components/TopBar/TopBar';
import Sidebar from './components/Sidebar/Sidebar';
import Prepare from './components/Prepare/Prepare';
import Explore from './components/Explore/Explore';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activePage, setActivePage] = useState('home');

    return (
        <div className="App">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="App-body">
                <Sidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(prev => !prev)}
                    activePage={activePage}
                    onPageChange={setActivePage}
                />

                <main className="App-main">
                    {activePage === 'home' && (
                        <div className="App-content">
                            <h1 className="App-title">Home</h1>
                        </div>
                    )}

                    {activePage === 'projects' && (
                        <div className="App-page-header">
                            <h1 className="App-title">Projects</h1>
                            <button className="App-btn-primary">+ New Project</button>
                        </div>
                    )}

                    {activePage === 'datasets' && (
                        <div className="App-content">
                            <h1 className="App-title">Datasets</h1>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;