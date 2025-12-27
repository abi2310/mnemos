import React, { useState, useRef } from 'react';
import './FileUpload.css';

function FileUpload({ onFilesSelected, onUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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
    // Filter für unterstützte Dateitypen (CSV, Excel, etc.)
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

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      if (onFilesSelected) {
        onFilesSelected(validFiles);
      }
    } else {
      alert('Please select a supported file format (CSV, Excel, JSON)');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    if (onFilesSelected) {
      onFilesSelected(newFiles);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      if (onUpload) {
        await onUpload(selectedFiles);
      }
      // Optional: Liste nach erfolgreichem Upload leeren
      // setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      // Error wird von onUpload behandelt
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="file-upload-content">
          <svg className="file-upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill="currentColor"/>
          </svg>
          <h3 className="file-upload-title">
            Drop files here or
          </h3>
          <button
            className="file-upload-button"
            onClick={handleButtonClick}
            type="button"
          >
            Upload Data
          </button>
          <p className="file-upload-hint">
            Supported formats: CSV, Excel (.xlsx, .xls), JSON
          </p>
        </div>

        <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileInput}
            className="file-upload-input"
            aria-label="File Upload"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="file-upload-list">
          <h4 className="file-upload-list-title">Selected files:</h4>
          <ul className="file-upload-files">
            {selectedFiles.map((file, index) => (
              <li key={index} className="file-upload-item">
                <span className="file-upload-item-name">{file.name}</span>
                <span className="file-upload-item-size">
                  {(file.size / 1024).toFixed(2)} KB
                </span>
                <button
                  className="file-upload-remove"
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
            className="file-upload-submit-button"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            type="button"
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUpload;

