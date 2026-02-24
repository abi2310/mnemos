import React from 'react';
import './TopBar.css';

function TopBar({ activeTab, onTabChange, showNav, onSidebarToggle, sidebarPinned, onSidebarHoverEnter, onSidebarHoverLeave }) {
  return (
    <header className={`topbar ${showNav ? 'topbar--with-nav' : ''}`}>
      <div className="topbar-content">
        <button
          className="topbar-sidebar-toggle"
          onClick={onSidebarToggle}
          onMouseEnter={onSidebarHoverEnter}
          onMouseLeave={onSidebarHoverLeave}
          aria-label={sidebarPinned ? 'Sidebar loslösen' : 'Sidebar fixieren'}
        >
          {sidebarPinned ? '✕' : '☰'}
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
      </div>
    </header>
  );
}

export default TopBar;
