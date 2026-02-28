import React, { useState, useEffect } from 'react';
import './DataTablePreview.css';

function DataTablePreview({ data }) {
    const [localData, setLocalData] = useState([]);

    useEffect(() => {
        setLocalData(data || []);
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
                                <th key={index}>{col}</th>
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