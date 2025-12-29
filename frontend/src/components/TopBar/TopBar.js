import React from 'react';
import { useProject } from '../../context/ProjectContext';
import './TopBar.css';

/**
 * TopBar Component
 * 
 * Zeigt Projekt-Tabs nur wenn ein Projekt ausgewählt ist:
 * - Prepare: Datasets/Tabelle für das Projekt
 * - Explore: Chat + Dashboard
 * - Predict: Placeholder (disabled)
 * 
 * Mit Zurück-Button um Projekt zu verlassen
 */
function TopBar({ activeProjectTab, onProjectTabChange }) {
  const { selectedProject, clearProject } = useProject();

  const handleBackToHome = () => {
    clearProject();
  };

  // Wenn kein Projekt ausgewählt ist, zeige nur den Header ohne Tabs
  if (!selectedProject) {
    return (
      <header className="topbar topbar--no-project">
        <div className="topbar-content">
          <div className="topbar-placeholder">
            {/* Optional: Platz für globale Actions/User Menu */}
          </div>
        </div>
      </header>
    );
  }

  // Mit Projekt: Zeige Zurück-Button + Projekt-Info + Tabs
  return (
    <header className="topbar topbar--with-project">
      <div className="topbar-content">
        <button 
          className="topbar-back-button"
          onClick={handleBackToHome}
          title="Back to home"
          aria-label="Back to home"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="topbar-project-info">
          <span className="topbar-project-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 16C18 16.5304 17.7893 17.0391 17.4142 17.4142C17.0391 17.7893 16.5304 18 16 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H7L9 5H16C16.5304 5 17.0391 5.21071 17.4142 5.58579C17.7893 5.96086 18 6.46957 18 7V16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="topbar-project-details">
            <span className="topbar-project-label">Project</span>
            <span className="topbar-project-name">{selectedProject.name}</span>
          </div>
        </div>
        
        <nav className="topbar-nav" role="navigation" aria-label="Project tabs">
          <button
            className={`topbar-nav-item ${activeProjectTab === 'prepare' ? 'active' : ''}`}
            onClick={() => onProjectTabChange('prepare')}
            aria-current={activeProjectTab === 'prepare' ? 'page' : undefined}
          >
            Prepare
          </button>
          <button
            className={`topbar-nav-item ${activeProjectTab === 'explore' ? 'active' : ''}`}
            onClick={() => onProjectTabChange('explore')}
            aria-current={activeProjectTab === 'explore' ? 'page' : undefined}
          >
            Explore
          </button>
          <button
            className={`topbar-nav-item ${activeProjectTab === 'predict' ? 'active' : ''}`}
            onClick={() => onProjectTabChange('predict')}
            disabled
            aria-disabled="true"
            title="Coming soon"
          >
            Predict
          </button>
        </nav>
      </div>
    </header>
  );
}

export default TopBar;

