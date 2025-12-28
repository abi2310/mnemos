import React from 'react';
import './TopBar.css';

function TopBar({ activeTab, onTabChange, onSidebarToggle, showAddFilesButton, onAddFilesClick, fileInputRef, onAddFilesInput }) {
  return (
    <header className="topbar">
      <div className="topbar-content">
        <button
          className="topbar-menu-button"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="topbar-logo">
          <img 
            src="/mnemoslogo.png" 
            alt="Mnemos Logo" 
            className="topbar-logo-img"
          />
          <span className="topbar-logo-text">
            MNEMOS.<span className="topbar-logo-text-accent">AI</span>
          </span>
        </div>
        
        <nav className="topbar-nav">
          <button
            className={`topbar-nav-item ${activeTab === 'prepare' ? 'active' : ''}`}
            onClick={() => onTabChange('prepare')}
          >
            <svg className="topbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Prepare
          </button>
          <button
            className={`topbar-nav-item ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => onTabChange('explore')}
          >
            <svg className="topbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Explore
          </button>
          <button
            className={`topbar-nav-item ${activeTab === 'predict' ? 'active' : ''}`}
            onClick={() => onTabChange('predict')}
          >
            <svg className="topbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Predict
          </button>
        </nav>

        {showAddFilesButton && (
          <div className="topbar-add-files">
            <button
              className="topbar-add-files-button"
              onClick={onAddFilesClick}
              type="button"
              aria-label="Add more files"
            >
              + Add Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.json"
              onChange={onAddFilesInput}
              className="file-upload-input"
              aria-label="File Upload"
            />
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;

