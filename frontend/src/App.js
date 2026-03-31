import React, { useState, useRef, useCallback, useEffect } from 'react';
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
    const [projects, setProjects] = useState([]);
    const [activeProject, setActiveProject] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [projectNameError, setProjectNameError] = useState(false);
    const [openedProjects, setOpenedProjects] = useState([]);
    const hoverTimeoutRef = useRef(null);
    const hoverSuppressedRef = useRef(false);

    useEffect(() => {
        if (activeProject && !openedProjects.includes(activeProject.id)) {
            setOpenedProjects(prev => [...prev, activeProject.id]);
        }
    }, [activeProject, openedProjects]);

    const handleCreateProject = () => {
        if (!projectName.trim()) {
            setProjectNameError(true);
            return;
        }
        const newProject = { name: projectName.trim(), id: Date.now(), createdAt: new Date().toISOString() };
        setProjects([...projects, newProject]);
        setActiveProject(newProject);
        setShowNewProject(false);
        setProjectName('');
        setProjectNameError(false);
        setActiveTab('prepare');
    };

    const handleDeleteProject = (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this project?')) {
            setProjects(prev => prev.filter(p => p.id !== id));
            if (activeProject && activeProject.id === id) {
                setActiveProject(null);
            }
        }
    };

    const handleRenameProject = (e, id, currentName) => {
        e.stopPropagation();
        const newName = window.prompt('Enter new project name:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
            if (activeProject && activeProject.id === id) {
                setActiveProject(prev => ({ ...prev, name: newName.trim() }));
            }
        }
    };

    const handleSidebarToggle = useCallback(() => {
        setSidebarPinned(prev => {
            if (prev) {
                // Beim Unpin: Hover unterdrücken, damit Sidebar sofort schließt
                hoverSuppressedRef.current = true;
                setSidebarHovered(false);
                setTimeout(() => { hoverSuppressedRef.current = false; }, 400);
            }
            return !prev;
        });
    }, []);

    const handleHoverEnter = useCallback(() => {
        if (hoverSuppressedRef.current) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setSidebarHovered(true);
    }, []);

    const handleHoverLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => setSidebarHovered(false), 250);
    }, []);

    const sidebarExpanded = sidebarPinned || sidebarHovered;
    const showChat = activeProject && activeTab === 'explore';

    return (
        <div data-testid="app-root" className={`App ${sidebarPinned ? 'App--sidebar-pinned' : ''} ${sidebarPinned && showChat ? 'App--sidebar-chat' : ''}`}>
            <TopBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showNav={!!activeProject}
                onSidebarToggle={handleSidebarToggle}
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
                            {openedProjects.map(projId => (
                                <div key={`workspace-${projId}`} style={{ display: activeProject.id === projId ? 'block' : 'none', height: '100%', width: '100%' }}>
                                    <div style={{ display: activeTab === 'prepare' ? 'block' : 'none', height: '100%', width: '100%' }}>
                                        <Prepare hideUpload={true} />
                                    </div>

                                    <div style={{ display: activeTab === 'explore' ? 'block' : 'none', height: '100%', width: '100%' }}>
                                        <Explore />
                                    </div>

                                    <div style={{ display: activeTab === 'predict' ? 'block' : 'none', height: '100%', width: '100%' }}>
                                        <div className="App-content">
                                            <h1 className="App-title">Predict</h1>
                                            <p className="App-subtitle">Create predictions and forecasts</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                                    {projects.length === 0 ? (
                                        <p className="App-subtitle" style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: 'var(--spacing-4)' }}>
                                            No projects created yet. Click "+ New Project" to get started.
                                        </p>
                                    ) : (
                                        <div className="projects-list" style={{
                                            display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-6)'
                                        }}>
                                            {projects.map(proj => (
                                                <div
                                                    key={proj.id}
                                                    className="project-list-item"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: 'var(--spacing-3) var(--spacing-4)',
                                                        backgroundColor: 'var(--color-bg-secondary)',
                                                        border: '1px solid var(--color-border-medium)',
                                                        borderRadius: 'var(--radius-base)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => {
                                                        setActiveProject(proj);
                                                        setActiveTab('prepare');
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.borderColor = 'var(--color-border-medium)';
                                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-accent)' }}>
                                                            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{proj.name}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                            Created: {new Date(proj.createdAt || proj.id).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                                            <button
                                                                onClick={(e) => handleRenameProject(e, proj.id, proj.name)}
                                                                style={{
                                                                    padding: '4px 8px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'transparent',
                                                                    border: '1px solid var(--color-border-medium)', borderRadius: '4px', color: 'var(--color-text-primary)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseOver={(e) => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.color = 'var(--color-accent)'; }}
                                                                onMouseOut={(e) => { e.target.style.borderColor = 'var(--color-border-medium)'; e.target.style.color = 'var(--color-text-primary)'; }}
                                                            >
                                                                Rename
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteProject(e, proj.id)}
                                                                style={{
                                                                    padding: '4px 8px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'transparent',
                                                                    border: '1px solid var(--color-border-medium)', borderRadius: '4px', color: 'var(--color-text-primary)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseOver={(e) => { e.target.style.backgroundColor = 'var(--color-error)'; e.target.style.borderColor = 'var(--color-error)'; e.target.style.color = 'white'; }}
                                                                onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.borderColor = 'var(--color-border-medium)'; e.target.style.color = 'var(--color-text-primary)'; }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                <div data-testid="modal-overlay" className="modal-overlay" onClick={() => { setShowNewProject(false); setProjectName(''); setProjectNameError(false); }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">New Project</h2>
                            <button className="modal-close" aria-label="Close modal" onClick={() => { setShowNewProject(false); setProjectName(''); setProjectNameError(false); }}>✕</button>
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
