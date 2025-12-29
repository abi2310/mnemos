import React, { useState, useEffect } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import Sidebar from './components/Sidebar/Sidebar';
import TopBar from './components/TopBar/TopBar';
import Home from './pages/Home';
import Search from './pages/Search';
import Projects from './pages/Projects';
import Prepare from './components/Prepare/Prepare';
import ProjectFiles from './components/ProjectFiles/ProjectFiles';
import Explore from './components/Explore/Explore';
import './App.css';

/**
 * AppContent - Innere App-Komponente mit Zugriff auf ProjectContext
 */
function AppContent() {
    const [activeView, setActiveView] = useState('home');
    const [activeProjectTab, setActiveProjectTab] = useState('prepare');
    const { selectedProject } = useProject();

    // Wenn ein Projekt ausgewählt wird, wechsle zu project-prepare View
    useEffect(() => {
        if (selectedProject) {
            setActiveView('project-prepare');
            setActiveProjectTab('prepare');
        } else {
            // Wenn kein Projekt mehr ausgewählt ist, zurück zur Home-Seite
            setActiveView('home');
        }
    }, [selectedProject]);

    const handleNavigate = (view) => {
        setActiveView(view);
        
        // Wenn zu einem Projekt-Tab navigiert wird
        if (view.startsWith('project-')) {
            const tab = view.replace('project-', '');
            setActiveProjectTab(tab);
        }
    };

    const handleProjectTabChange = (tab) => {
        setActiveProjectTab(tab);
        setActiveView(`project-${tab}`);
    };

    // Bestimme welcher Content gezeigt werden soll
    const renderContent = () => {
        // Projekt-spezifische Views (nur wenn Projekt ausgewählt)
        if (selectedProject) {
            if (activeView === 'project-prepare') {
                return <ProjectFiles />;
            }
            if (activeView === 'project-explore') {
                return <Explore />;
            }
            if (activeView === 'project-predict') {
                return (
                    <div className="App-content">
                        <h1 className="App-title">Predict</h1>
                        <p className="App-subtitle">Create predictions and forecasts</p>
                        <p className="App-subtitle">(Coming soon)</p>
                    </div>
                );
            }
        }

        // Globale Views
        switch (activeView) {
            case 'home':
                return <Home />;
            case 'search':
                return <Search />;
            case 'projects-all':
            case 'projects-favorites':
            case 'projects-shared':
                return <Projects />;
            case 'datasets':
                return <Prepare />;
            default:
                return <Home />;
        }
    };

    const isProjectView = selectedProject && activeView.startsWith('project-');
    const isExploreView = activeView === 'project-explore';

    return (
        <div className="App">
            {/* Sidebar nur anzeigen wenn KEIN Projekt ausgewählt ist */}
            {!selectedProject && (
                <Sidebar activeView={activeView} onNavigate={handleNavigate} />
            )}
            
            <div className="App-content-wrapper">
                <TopBar 
                    activeProjectTab={activeProjectTab}
                    onProjectTabChange={handleProjectTabChange}
                />

                <main className={`App-main ${isProjectView ? 'App-main--project' : ''} ${isExploreView ? 'App-main--explore' : ''}`}>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

/**
 * App - Root-Komponente mit ProjectProvider
 */
function App() {
    return (
        <ProjectProvider>
            <AppContent />
        </ProjectProvider>
    );
}

export default App;