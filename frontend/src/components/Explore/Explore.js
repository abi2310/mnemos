import React from 'react';
import DashboardCanvas from '../DashboardCanvas/DashboardCanvas';
import './Explore.css';

/**
 * Explore Component
 *
 * Hauptkomponente für den Explore-Tab.
 * Chat ist in die Haupt-Sidebar integriert.
 * Hier wird nur das DashboardCanvas angezeigt.
 */
function Explore() {
    return (
        <div className="explore-container">
            <DashboardCanvas />
        </div>
    );
}

export default Explore;
