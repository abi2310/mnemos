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
        {/* Platzhalter für zukünftige Navigation */}
      </nav>
    </aside>
  );
}

export default Sidebar;

