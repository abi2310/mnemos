import React, { useState, useEffect } from 'react';
import './DataTablePreview.css';
import { inferColumnTypes } from '../Prepare/DataTypeUtils';

function DataTablePreview({ data, onCellChange, datasetId }) {
    const [localData, setLocalData] = useState([]);
    const [columnTypes, setColumnTypes] = useState([]);
    const [columnRoles, setColumnRoles] = useState([]);

    useEffect(() => {
        setLocalData(data || []);
        if (data && data.length > 0) {
            let loadedTypes = null;
            let loadedRoles = null;

            if (datasetId) {
                const savedMeta = localStorage.getItem(`dataset_meta_${datasetId}`);
                if (savedMeta) {
                    try {
                        const parsed = JSON.parse(savedMeta);
                        if (parsed.types && parsed.types.length === data[0].length) {
                            loadedTypes = parsed.types;
                        }
                        if (parsed.roles && parsed.roles.length === data[0].length) {
                            loadedRoles = parsed.roles;
                        }
                    } catch (e) {
                        console.error('Failed to parse saved dataset metadata');
                    }
                }
            }

            setColumnTypes(loadedTypes || inferColumnTypes(data));
            setColumnRoles(loadedRoles || new Array(data[0].length).fill('regular'));
        }
    }, [data, datasetId]);



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
            if (datasetId) {
                localStorage.setItem(`dataset_meta_${datasetId}`, JSON.stringify({
                    types: next,
                    roles: columnRoles
                }));
            }
            return next;
        });
    };

    const handleRoleChange = (colIndex, newRole) => {
        setColumnRoles(prev => {
            const next = [...prev];
            next[colIndex] = newRole;
            if (datasetId) {
                localStorage.setItem(`dataset_meta_${datasetId}`, JSON.stringify({
                    types: columnTypes,
                    roles: next
                }));
            }
            return next;
        });
    };

    const getTypeClass = (type) => {
        switch (type) {
            case 'polynominal':
            case 'binominal':
                return 'type-category';
            case 'real':
            case 'integer':
            case 'numeric':
                return 'type-number';
            case 'date_time':
            case 'date':
            case 'time':
                return 'type-date';
            default:
                return 'type-default';
        }
    };
    const renderVisualization = (colIndex, type) => {
        const typeClass = getTypeClass(type);
        const colData = localData.slice(1).map(row => row[colIndex]).filter(val => val !== null && val !== '' && val !== '?');

        if (typeClass === 'type-number') {
            const nums = colData.map(Number).filter(n => !isNaN(n));
            if (nums.length === 0) return <div className="viz-empty">No numerical data</div>;

            const min = Math.min(...nums);
            const max = Math.max(...nums);
            const binCount = 10;
            const bins = new Array(binCount).fill(0);

            if (max === min) {
                bins[0] = nums.length;
            } else {
                nums.forEach(n => {
                    const binIndex = Math.min(Math.floor(((n - min) / (max - min)) * binCount), binCount - 1);
                    bins[binIndex]++;
                });
            }

            const maxBin = Math.max(...bins) || 1;

            return (
                <div className="viz-bars-container">
                    <div className="viz-bars">
                        {bins.map((val, idx) => (
                            <div key={idx} className="viz-bar-wrapper" title={`Count: ${val}`}>
                                <div className="viz-bar" style={{ height: `${(val / maxBin) * 100}%` }}></div>
                            </div>
                        ))}
                    </div>
                    <div className="viz-bars-labels">
                        <span>{Math.round(min)}</span>
                        <span>{Math.round(max)}</span>
                    </div>
                </div>
            );
        } else {
            const counts = {};
            colData.forEach(val => { counts[val] = (counts[val] || 0) + 1; });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const total = colData.length || 1;
            const top3 = sorted.slice(0, 3);

            if (top3.length === 0) return <div className="viz-empty">No categorical data</div>;

            return (
                <div className="viz-cat-container">
                    {top3.map(([val, count], idx) => {
                        const percent = ((count / total) * 100).toFixed(1);
                        return (
                            <div key={idx} className="viz-cat-row">
                                <div className="viz-cat-label-row">
                                    <span className="viz-cat-label" title={String(val)}>{String(val)}</span>
                                    <span className="viz-cat-percent">{percent}%</span>
                                </div>
                                <div className="viz-cat-progress-bg">
                                    <div className="viz-cat-progress-fill" style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
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
                        <tr className="header-title-row">
                            {localData[0].map((col, index) => (
                                <th key={`header-${index}`}>
                                    <div className="header-cell-content">
                                        <div className="header-title-wrapper">
                                            <span className="header-title" title={col}>{col}</span>
                                        </div>
                                        <div className="role-dropdown-wrapper" title="Set Role">
                                            {columnRoles[index] !== 'regular' && (
                                                <span className={`role-badge role-${columnRoles[index]}`}>
                                                    {columnRoles[index]}
                                                </span>
                                            )}
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
                                    <div className={`type-select-wrapper ${getTypeClass(type)}`}>
                                        <select
                                            className="type-select-visible"
                                            value={type}
                                            onChange={(e) => handleTypeChange(index, e.target.value)}
                                            title="Change data type"
                                        >
                                            <option value="polynominal">Category</option>
                                            <option value="binominal">Category (Binary)</option>
                                            <option value="integer">Number (Integer)</option>
                                            <option value="real">Number (Real)</option>
                                            <option value="date_time">Date & Time</option>
                                            <option value="date">Date</option>
                                            <option value="time">Time</option>
                                        </select>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '8px', opacity: 0.6, pointerEvents: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        <tr className="data-preview-table-viz">
                            {columnTypes.map((type, index) => (
                                <th key={`viz-${index}`}>
                                    {renderVisualization(index, type)}
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