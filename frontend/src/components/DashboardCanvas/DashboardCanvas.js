import React, { useState } from 'react';
import './DashboardCanvas.css';

/**
 * DashboardCanvas Component
 *
 * Rechter Bereich für das interaktive Dashboard im Explore-Tab.
 * Hier werden Visualisierungen, Diagramme und Kennzahlen angezeigt.
 */
function DashboardCanvas() {
    const [widgets, _setWidgets] = useState([]);

    // TODO: Widgets werden später vom Backend/Chat dynamisch hinzugefügt
    // Beispiel-Widget-Struktur:
    // {
    //   id: 1,
    //   type: 'chart', // 'chart', 'metric', 'table'
    //   title: 'Umsatz nach Monat',
    //   data: {...},
    //   position: { x: 0, y: 0 },
    //   size: { width: 400, height: 300 }
    // }

    return (
        <div className="dashboard-canvas">
            <div className="dashboard-header">
                <h2 className="dashboard-title">Dashboard</h2>
                <div className="dashboard-actions">
                    <button className="dashboard-action-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        <span className="action-label">Teilen</span>
                    </button>
                    <button className="dashboard-action-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span className="action-label">Download</span>
                    </button>
                    <button className="dashboard-action-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        <span className="action-label">Export</span>
                    </button>
                    <button className="dashboard-action-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span className="action-label">Settings</span>
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="dashboard-canvas-container">
                    {widgets.length === 0 ? (
                        <div className="dashboard-empty-state">
                            <div className="empty-state-icon">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M3 9h18" />
                                    <path d="M9 3v18" />
                                </svg>
                            </div>
                            <h3 className="empty-state-title">Noch keine Visualisierungen</h3>
                            <p className="empty-state-text">
                                Stelle eine Frage im Chat, und deine Visualisierungen erscheinen hier automatisch.
                            </p>
                            <div className="empty-state-suggestions">
                                <p className="suggestions-title">Beispielfragen:</p>
                                <ul className="suggestions-list">
                                    <li>"Zeige mir die Umsatzentwicklung über die letzten 12 Monate"</li>
                                    <li>"Welche Produkte haben den höchsten Gewinn?"</li>
                                    <li>"Erstelle eine Übersicht der wichtigsten KPIs"</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-grid">
                            {widgets.map((widget) => (
                                <div
                                    key={widget.id}
                                    className="dashboard-widget"
                                    style={{
                                        gridColumn: `span ${widget.size?.columns || 2}`,
                                        gridRow: `span ${widget.size?.rows || 2}`
                                    }}
                                >
                                    <div className="widget-header">
                                        <h3 className="widget-title">{widget.title}</h3>
                                        <button className="widget-action" title="Entfernen">×</button>
                                    </div>
                                    <div className="widget-content">
                                        {/* Widget-Inhalt wird hier gerendert */}
                                        <p>Widget: {widget.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DashboardCanvas;
