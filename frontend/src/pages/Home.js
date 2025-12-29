import React from 'react';
import './Page.css';

/**
 * Home Page
 */
function Home() {
    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Welcome to MNEMOS.AI</h1>
                <p className="page-subtitle">
                    Your intelligent data analysis platform
                </p>
            </div>

            <div className="page-content">
                <div className="placeholder-message">
                    <p>Select a project or upload datasets to get started</p>
                </div>
            </div>
        </div>
    );
}

export default Home;

