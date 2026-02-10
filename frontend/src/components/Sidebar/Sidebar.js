import React from 'react';
import './Sidebar.css';

function Sidebar({ isOpen, onToggle }) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
      >
        <span className="sidebar-toggle-icon">
          {isOpen ? '◀' : '▶'}
        </span>
      </button>

      <nav className="sidebar-nav">
        <span className="sidebar-nav-item">Home</span>
        <span className="sidebar-nav-item">Projects</span>
        <span className="sidebar-nav-item">Datasets</span>
      </nav>
    </aside>
  );
}

export default Sidebar;

