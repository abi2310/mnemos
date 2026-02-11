import React, { useState, useRef, useCallback } from 'react';
import TopBar from './components/TopBar/TopBar';
import Sidebar from './components/Sidebar/Sidebar';
import Prepare from './components/Prepare/Prepare';
import Explore from './components/Explore/Explore';
import Datasets from './components/Datasets/Datasets';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('prepare');
    const [sidebarPinned, setSidebarPinned] = useState(false);
    const [sidebarHovered, setSidebarHovered] = useState(false);
    const [activePage, setActivePage] = useState('home');
    const [showNewProject, setShowNewProject] = useState(false);
    const [activeProject, setActiveProject] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [projectNameError, setProjectNameError] = useState(false);
    const hoverTimeoutRef = useRef(null);

    const handleCreateProject = () => {
        if (!projectName.trim()) {
            setProjectNameError(true);
            return;
        }
        setActiveProject({ name: projectName.trim() });
        setShowNewProject(false);
        setProjectName('');
        setProjectNameError(false);
        setActiveTab('prepare');
    };

    const handleHoverEnter = useCallback(() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setSidebarHovered(true);
    }, []);

    const handleHoverLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => setSidebarHovered(false), 250);
    }, []);

    const sidebarExpanded = sidebarPinned || sidebarHovered;
    const showChat = activeProject && activeTab === 'explore';

    return (
        <div className={`App ${sidebarPinned ? 'App--sidebar-pinned' : ''} ${sidebarPinned && showChat ? 'App--sidebar-chat' : ''}`}>
            <TopBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showNav={!!activeProject}
                onSidebarToggle={() => setSidebarPinned(prev => !prev)}
                sidebarPinned={sidebarPinned}
                onSidebarHoverEnter={handleHoverEnter}
                onSidebarHoverLeave={handleHoverLeave}
            />

            <div className="App-body">
                <Sidebar
                    isExpanded={sidebarExpanded}
                    isPinned={sidebarPinned}
                    activePage={activePage}
                    onPageChange={(page) => { setActivePage(page); setActiveProject(null); }}
                    activeProject={activeProject}
                    activeTab={activeTab}
                    onNewChat={() => setActiveTab('explore')}
                    onHoverEnter={handleHoverEnter}
                    onHoverLeave={handleHoverLeave}
                />

                <main className="App-main">
                    {activeProject ? (
                        <>
                            {activeTab === 'prepare' && (
                                <div className="App-content">
                                    <h1 className="App-title">Prepare</h1>
                                    <p className="App-subtitle" style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                                        Here you will be able to view your datasets in table form, edit values, check column types, handle missing data, and transform your files for analysis. — Not yet implemented.
                                    </p>
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
                                    <img src="/mnemoslogo.png" alt="Mnemos Logo" style={{ height: '80px', marginBottom: 'var(--spacing-6)' }} />
                                    <h1 className="App-title">Welcome to MNEMOS.<span style={{ color: 'var(--color-accent)' }}>AI</span></h1>
                                    <p className="App-subtitle">Analyze like never before</p>

                                    <div className="App-quickguide">
                                        <h2 className="App-quickguide-title">Quick Guide</h2>
                                        <div className="App-quickguide-grid">
                                            <div className="App-quickguide-card">
                                                <span className="App-quickguide-icon">📂</span>
                                                <h3>Datasets</h3>
                                                <p>Upload and manage your data files. View all datasets at a glance, see which projects use them, and preview their contents.</p>
                                            </div>
                                            <div className="App-quickguide-card">
                                                <span className="App-quickguide-icon">🗂️</span>
                                                <h3>Projects</h3>
                                                <p>Create projects to organize your analyses. Select datasets, configure your workspace, and collaborate with your team.</p>
                                            </div>
                                            <div className="App-quickguide-card">
                                                <span className="App-quickguide-icon">📋</span>
                                                <h3>Prepare</h3>
                                                <p>Inspect and clean your data. View tables, check column types, handle missing values, and transform your datasets for analysis.</p>
                                            </div>
                                            <div className="App-quickguide-card">
                                                <span className="App-quickguide-icon">🔍</span>
                                                <h3>Explore</h3>
                                                <p>Discover insights through interactive dashboards. Chat with your data using AI, create visualizations, and uncover hidden patterns.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activePage === 'projects' && (
                                <>
                                    <div className="App-page-header">
                                        <h1 className="App-title">Projects</h1>
                                        <button className="App-btn-primary" onClick={() => setShowNewProject(true)}>+ New Project</button>
                                    </div>
                                    <p className="App-subtitle" style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                                        Existing projects will be displayed here. — Not yet implemented.
                                    </p>
                                </>
                            )}

                            {activePage === 'datasets' && (
                                <Datasets />
                            )}
                        </>
                    )}
                </main>
            </div>

            {showNewProject && (
                <div className="modal-overlay" onClick={() => { setShowNewProject(false); setProjectName(''); setProjectNameError(false); }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">New Project</h2>
                            <button className="modal-close" onClick={() => { setShowNewProject(false); setProjectName(''); setProjectNameError(false); }}>✕</button>
                        </div>
                        <div className="modal-body">
                            <label className="modal-label">Project Name</label>
                            <input
                                type="text"
                                className={`modal-input ${projectNameError ? 'modal-input--error' : ''}`}
                                placeholder="Enter project name..."
                                value={projectName}
                                onChange={(e) => { setProjectName(e.target.value); setProjectNameError(false); }}
                            />
                            {projectNameError && (
                                <p className="modal-error">Please enter a project name.</p>
                            )}

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
