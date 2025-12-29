import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import './Sidebar.css';

/**
 * Sidebar Component - Hauptnavigation
 * 
 * Navigation Items (von oben nach unten):
 * - Home
 * - Search
 * - Projects (mit Subitems: All Projects, Favorites, Shared with me)
 * - Datasets (immer sichtbar)
 * 
 * Nur sichtbar wenn KEIN Projekt ausgewählt ist
 */
function Sidebar({ activeView, onNavigate }) {
    const [projectsExpanded, setProjectsExpanded] = useState(false);
    const { selectedProject, selectProject, clearProject } = useProject();

    const handleNavigate = (view) => {
        // Wenn zu einer globalen Seite navigiert wird, clear das Projekt
        if (['home', 'search', 'datasets', 'projects-all', 'projects-favorites', 'projects-shared'].includes(view)) {
            clearProject();
        }
        onNavigate(view);
    };

    const toggleProjects = () => {
        setProjectsExpanded(!projectsExpanded);
    };

    // Mock Project - nur eines für Demo
    const mockProject = { id: 'demo-project', name: 'Demo Analysis Project' };

    const handleProjectSelect = (project) => {
        selectProject(project);
        onNavigate('project-prepare'); // Standardmäßig zum Prepare Tab
    };

    return (
        <aside className="sidebar" role="navigation" aria-label="Main navigation">
            <div className="sidebar-content">
                {/* Logo Section */}
                <div className="sidebar-logo">
                    <img 
                        src="/mnemoslogo.png" 
                        alt="Mnemos Logo" 
                        className="sidebar-logo-img"
                    />
                    <span className="sidebar-logo-text">
                        MNEMOS.<span className="sidebar-logo-text-accent">AI</span>
                    </span>
                </div>

                {/* Navigation Items */}
                <nav className="sidebar-nav">
                    {/* Home */}
                    <button
                        className={`sidebar-nav-item ${activeView === 'home' ? 'active' : ''}`}
                        onClick={() => handleNavigate('home')}
                        aria-current={activeView === 'home' ? 'page' : undefined}
                    >
                        <span className="sidebar-nav-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 10L10 3L17 10V17C17 17.2652 16.8946 17.5196 16.7071 17.7071C16.5196 17.8946 16.2652 18 16 18H12V14H8V18H4C3.73478 18 3.48043 17.8946 3.29289 17.7071C3.10536 17.5196 3 17.2652 3 17V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <span className="sidebar-nav-label">Home</span>
                    </button>

                    {/* Search */}
                    <button
                        className={`sidebar-nav-item ${activeView === 'search' ? 'active' : ''}`}
                        onClick={() => handleNavigate('search')}
                        aria-current={activeView === 'search' ? 'page' : undefined}
                    >
                        <span className="sidebar-nav-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <span className="sidebar-nav-label">Search</span>
                    </button>

                    {/* Projects (collapsible) */}
                    <div className="sidebar-nav-group">
                        <button
                            className={`sidebar-nav-item ${projectsExpanded ? 'expanded' : ''}`}
                            onClick={toggleProjects}
                            aria-expanded={projectsExpanded}
                            aria-controls="projects-submenu"
                        >
                            <span className="sidebar-nav-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 16C18 16.5304 17.7893 17.0391 17.4142 17.4142C17.0391 17.7893 16.5304 18 16 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H7L9 5H16C16.5304 5 17.0391 5.21071 17.4142 5.58579C17.7893 5.96086 18 6.46957 18 7V16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </span>
                            <span className="sidebar-nav-label">Projects</span>
                            <span className="sidebar-nav-arrow">
                                {projectsExpanded ? '▼' : '▶'}
                            </span>
                        </button>

                        {/* Projects Submenu */}
                        {projectsExpanded && (
                            <div className="sidebar-nav-submenu" id="projects-submenu">
                                <button
                                    className={`sidebar-nav-subitem ${activeView === 'projects-all' ? 'active' : ''}`}
                                    onClick={() => handleNavigate('projects-all')}
                                    aria-current={activeView === 'projects-all' ? 'page' : undefined}
                                >
                                    All Projects
                                </button>
                                <button
                                    className={`sidebar-nav-subitem ${activeView === 'projects-favorites' ? 'active' : ''}`}
                                    onClick={() => handleNavigate('projects-favorites')}
                                    aria-current={activeView === 'projects-favorites' ? 'page' : undefined}
                                >
                                    Favorites
                                </button>
                                <button
                                    className={`sidebar-nav-subitem ${activeView === 'projects-shared' ? 'active' : ''}`}
                                    onClick={() => handleNavigate('projects-shared')}
                                    aria-current={activeView === 'projects-shared' ? 'page' : undefined}
                                >
                                    Shared with me
                                </button>

                                {/* Demo Project */}
                                <div className="sidebar-nav-projects-list">
                                    <button
                                        className={`sidebar-nav-project-item ${selectedProject?.id === mockProject.id ? 'active' : ''}`}
                                        onClick={() => handleProjectSelect(mockProject)}
                                        aria-current={selectedProject?.id === mockProject.id ? 'page' : undefined}
                                    >
                                        {mockProject.name}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Datasets - immer sichtbar */}
                    <button
                        className={`sidebar-nav-item ${activeView === 'datasets' ? 'active' : ''}`}
                        onClick={() => handleNavigate('datasets')}
                        aria-current={activeView === 'datasets' ? 'page' : undefined}
                    >
                        <span className="sidebar-nav-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 3H17V7H3V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M3 10H17V14H3V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M3 17H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <span className="sidebar-nav-label">Datasets</span>
                    </button>
                </nav>

                {/* User Profile - unten */}
                <div className="sidebar-user-profile">
                    <div className="sidebar-user-avatar">
                        <span>MN</span>
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">MNEMOS</div>
                        <div className="sidebar-user-email">user@mnemos.ai</div>
                    </div>
                    <button className="sidebar-user-menu-button" title="Settings">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
