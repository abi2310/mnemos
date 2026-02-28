import React, { useState, useEffect } from 'react';
import './DataTablePreview.css';
import { RapidMinerTypes, inferColumnTypes } from '../Prepare/DataTypeUtils';

function DataTablePreview({ data, onCellChange }) {
    const [localData, setLocalData] = useState([]);
    const [columnTypes, setColumnTypes] = useState([]);
    const [columnRoles, setColumnRoles] = useState([]);

    useEffect(() => {
        setLocalData(data || []);
        if (data && data.length > 0) {
            setColumnTypes(inferColumnTypes(data));
            // Keep existing roles if the number of columns stays exactly the same
            setColumnRoles(prev => prev.length === data[0].length ? prev : new Array(data[0].length).fill('regular'));
        }
    }, [data]);

    if (!localData || localData.length === 0) return null;

    const handleCellChange = (rowIndex, cellIndex, newValue) => {
        setLocalData(prevData => {
            const newData = [...prevData];
            const newRow = [...newData[rowIndex + 1]]; // Offset for header row
            newRow[cellIndex] = newValue;
            newData[rowIndex + 1] = newRow;
            return newData;
        });

        if (onCellChange) {
            onCellChange(rowIndex, cellIndex, newValue);
        }
    };

    const handleTypeChange = (colIndex, newType) => {
        setColumnTypes(prev => {
            const next = [...prev];
            next[colIndex] = newType;
            return next;
        });
    };

    const handleRoleChange = (colIndex, newRole) => {
        setColumnRoles(prev => {
            const next = [...prev];
            next[colIndex] = newRole;
            return next;
        });
    };

    return (
        <div className="data-preview">
            <h4>Data Preview</h4>
            <div
                className="data-preview-table-wrapper"
                data-testid="data-preview-wrapper"
            >
                <table className="data-preview-table">
                    <thead>
                        <tr>
                            {localData[0].map((col, index) => (
                                <th key={`header-${index}`}>
                                    <div className="header-cell-content">
                                        <div className="header-title-wrapper">
                                            {columnRoles[index] !== 'regular' && (
                                                <span className={`role-badge role-${columnRoles[index]}`}>
                                                    {columnRoles[index]}
                                                </span>
                                            )}
                                            <span className="header-title" title={col}>{col}</span>
                                        </div>
                                        <div className="role-dropdown-wrapper" title="Set Role">
                                            <svg className="role-dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            <select
                                                className="role-select"
                                                value={columnRoles[index] || 'regular'}
                                                onChange={(e) => handleRoleChange(index, e.target.value)}
                                            >
                                                <option value="regular">regular</option>
                                                <option value="label">label</option>
                                                <option value="id">id</option>
                                                <option value="weight">weight</option>
                                            </select>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        <tr className="data-preview-table-types">
                            {columnTypes.map((type, index) => (
                                <th key={`type-${index}`} className="type-cell">
                                    <select
                                        className="type-select"
                                        value={type}
                                        onChange={(e) => handleTypeChange(index, e.target.value)}
                                        title="Change data type"
                                    >
                                        {RapidMinerTypes.map(rt => (
                                            <option key={rt} value={rt}>{rt}</option>
                                        ))}
                                    </select>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {localData.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => {
                                    const isEmpty = cell === '?' || cell === '' || cell === null;
                                    return (
                                        <td
                                            key={cellIndex}
                                            className={`editable-cell ${isEmpty ? 'empty-cell' : ''}`}
                                            title={!isEmpty ? String(cell) : undefined}
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellChange(rowIndex, cellIndex, e.target.textContent)}
                                        >
                                            {!isEmpty ? cell : ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DataTablePreview;