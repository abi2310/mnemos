import React, { useState } from 'react';
import TopBar from './components/TopBar/TopBar';
import Sidebar from './components/Sidebar/Sidebar';
import Prepare from './components/Prepare/Prepare';
import Explore from './components/Explore/Explore';
import Datasets from './components/Datasets/Datasets';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activePage, setActivePage] = useState('home');
    const [showNewProject, setShowNewProject] = useState(false);
    const [activeProject, setActiveProject] = useState(null);

    const handleCreateProject = () => {
        setActiveProject({ name: 'New Project' });
        setShowNewProject(false);
        setActiveTab('prepare');
    };

    return (
        <div className="App">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} showNav={!!activeProject} />

            <div className="App-body">
                <Sidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(prev => !prev)}
                    activePage={activePage}
                    onPageChange={(page) => { setActivePage(page); setActiveProject(null); }}
                    activeProject={activeProject}
                    activeTab={activeTab}
                    onNewChat={() => setActiveTab('explore')}
                />

                <main className="App-main">
                    {activeProject ? (
                        <>
                            {activeTab === 'prepare' && (
                                <div className="App-content">
                                    {/* Platzhalter: Tabellenansicht der ausgewählten Datei – wird von anderem Entwickler implementiert */}
                                </div>
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
                        </>
                    ) : (
                        <>
                            {activePage === 'home' && (
                                <div className="App-content">
                                    <h1 className="App-title">Home</h1>
                                </div>
                            )}

                            {activePage === 'projects' && (
                                <div className="App-page-header">
                                    <h1 className="App-title">Projects</h1>
                                    <button className="App-btn-primary" onClick={() => setShowNewProject(true)}>+ New Project</button>
                                </div>
                            )}

                            {activePage === 'datasets' && (
                                <Datasets />
                            )}
                        </>
                    )}
                </main>
            </div>

            {showNewProject && (
                <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">New Project</h2>
                            <button className="modal-close" onClick={() => setShowNewProject(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <label className="modal-label">Project Name</label>
                            <input
                                type="text"
                                className="modal-input"
                                placeholder="Enter project name..."
                            />

                            <Prepare />

                            <button className="App-btn-primary modal-create-btn" onClick={handleCreateProject}>Create Project</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;