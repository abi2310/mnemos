import React, { useState, useRef } from 'react';
import './UploadSection.css';

/**
 * UploadSection - Upload-Bereich oben
 * 
 * Features:
 * - Große Dropzone mit gestrichelter Umrandung
 * - Drag & Drop Support
 * - Upload Button
 * - DragOver State (visuelles Highlight)
 */
function UploadSection({ onUpload }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Nur wenn wir die Dropzone komplett verlassen
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    };

    const handleFiles = (files) => {
        // Filter für unterstützte Dateitypen
        const supportedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json'
        ];

        const validFiles = files.filter(file => {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            return ['csv', 'xlsx', 'xls', 'json'].includes(fileExtension) ||
                   supportedTypes.includes(file.type);
        });

        if (validFiles.length === 0) {
            alert('Please select a supported file format (CSV, Excel, JSON)');
            return;
        }

        if (validFiles.length !== files.length) {
            alert(`${files.length - validFiles.length} file(s) skipped (unsupported format)`);
        }

        // Dateien in State speichern (noch nicht hochladen!)
        setSelectedFiles(validFiles);
    };

    const removeFile = (index) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        try {
            setIsUploading(true);
            await onUpload(selectedFiles);
            // Nach erfolgreichem Upload: Liste leeren
            setSelectedFiles([]);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <section className="upload-section">
            <div
                className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="upload-dropzone-content">
                    {/* Upload Icon */}
                    <svg 
                        className="upload-icon" 
                        width="48" 
                        height="48" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path 
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>

                    <p className="upload-dropzone-text">
                        Drag files to upload or
                    </p>
                    <button
                        className="upload-button"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleButtonClick();
                        }}
                        disabled={isUploading}
                    >
                        Select files
                    </button>
                    <p className="upload-hint">
                        Supported formats: CSV, Excel (.xlsx, .xls), JSON
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={handleFileInput}
                    className="upload-input"
                    aria-label="File Upload Input"
                />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="upload-files-list">
                    <h4 className="upload-files-title">Selected files:</h4>
                    <ul className="upload-files">
                        {selectedFiles.map((file, index) => (
                            <li key={index} className="upload-file-item">
                                <span className="upload-file-name">{file.name}</span>
                                <span className="upload-file-size">
                                    {(file.size / 1024).toFixed(2)} KB
                                </span>
                                <button
                                    className="upload-file-remove"
                                    onClick={() => removeFile(index)}
                                    type="button"
                                    aria-label="Remove file"
                                    disabled={isUploading}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button
                        className="upload-submit-button"
                        onClick={handleUpload}
                        disabled={isUploading || selectedFiles.length === 0}
                        type="button"
                    >
                        {isUploading ? 'Uploading...' : 'Upload Files'}
                    </button>
                </div>
            )}
        </section>
    );
}

export default UploadSection;

