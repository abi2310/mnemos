import React, { useState, useEffect } from 'react';
import UploadSection from './UploadSection';
import FilesSection from './FilesSection';
import { uploadDataset, getDatasets, deleteDataset } from '../../services/DatasetService/datasetService';
import './Prepare.css';

/**
 * Prepare Component - Julius AI Style Layout
 * 
 * Aufbau:
 * 1. Oben: Upload-Bereich (Dropzone + Upload-Button)
 * 2. Unten: Files-Übersicht (Tabelle mit Search, Bulk Actions, Row Actions)
 */
function Prepare() {
    const [datasets, setDatasets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);

    // Datasets vom Backend laden
    useEffect(() => {
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        try {
            setIsLoading(true);
            const data = await getDatasets();
            setDatasets(data);
        } catch (error) {
            console.error('Failed to load datasets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (files) => {
        if (!files || files.length === 0) return;

        try {
            // Upload jeweils erste Datei (Backend akzeptiert einzelne Files)
            for (const file of files) {
                await uploadDataset(file);
            }
            
            // Refresh die Liste nach Upload
            await loadDatasets();
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    };

    const handleDelete = async (datasetIds) => {
        try {
            // Delete alle ausgewählten Datasets
            for (const id of datasetIds) {
                await deleteDataset(id);
            }
            
            // Refresh die Liste
            await loadDatasets();
            
            // Falls Preview-File gelöscht wurde, schließen
            if (selectedPreviewFile && datasetIds.includes(selectedPreviewFile.id)) {
                setSelectedPreviewFile(null);
            }
        } catch (error) {
            console.error('Delete failed:', error);
            throw error;
        }
    };

    const handleOpenPreview = (dataset) => {
        setSelectedPreviewFile(dataset);
    };

    const handleClosePreview = () => {
        setSelectedPreviewFile(null);
    };

    return (
        <div className="prepare-container">
            <div className="prepare-content">
                {/* Upload Section - Oben */}
                <UploadSection onUpload={handleUpload} />

                {/* Files Section - Unten */}
                <FilesSection
                    datasets={datasets}
                    isLoading={isLoading}
                    onDelete={handleDelete}
                    onOpenPreview={handleOpenPreview}
                    selectedPreviewFile={selectedPreviewFile}
                    onClosePreview={handleClosePreview}
                />
            </div>
        </div>
    );
}

export default Prepare;

