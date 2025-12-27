import React from 'react';
import './DataTablePreview.css';

function DataTablePreview({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div className="data-preview">
            <h4>Data Preview</h4>
            <div className="data-preview-table-wrapper">
                <table className="data-preview-table">
                    <thead>
                        <tr>
                            {data[0].map((col, index) => (
                                <th key={index}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DataTablePreview;