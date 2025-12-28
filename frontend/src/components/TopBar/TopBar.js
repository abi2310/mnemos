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
            Prepare
          </button>
          <button
            className={`topbar-nav-item ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => onTabChange('explore')}
          >
            Explore
          </button>
          <button
            className={`topbar-nav-item ${activeTab === 'predict' ? 'active' : ''}`}
            onClick={() => onTabChange('predict')}
          >
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

