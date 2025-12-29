import React, { createContext, useContext, useState } from 'react';

/**
 * ProjectContext - Globaler Context für Projekt-State
 * 
 * Verwaltet:
 * - selectedProject: Das aktuell ausgewählte Projekt
 * - Funktionen zum Setzen/Clearen des Projekts
 */
const ProjectContext = createContext();

export function ProjectProvider({ children }) {
    const [selectedProject, setSelectedProject] = useState(null);

    const selectProject = (project) => {
        setSelectedProject(project);
    };

    const clearProject = () => {
        setSelectedProject(null);
    };

    return (
        <ProjectContext.Provider value={{ selectedProject, selectProject, clearProject }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}

