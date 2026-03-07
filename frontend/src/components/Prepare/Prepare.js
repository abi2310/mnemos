import React, { useState, useEffect } from 'react';
import UploadSection from './UploadSection';
import FilesSection from './FilesSection';
import { uploadDataset, getDatasets, deleteDataset } from '../../services/DatasetService/datasetService';
import DataWrangler from './DataWrangler';
import { parseFile } from '../../utils/fileParser/fileParser';
import './Prepare.css';

/**
 * Prepare Component - Julius AI Style Layout
 * 
 * Aufbau:
 * 1. Oben: Upload-Bereich (Dropzone + Upload-Button), sofern nicht versteckt
 * 2. Unten: Files-Übersicht (Tabelle mit Search, Bulk Actions, Row Actions)
 */
function Prepare({ hideUpload }) {
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
                // 1. Datei mit FileParser parsen (z.B. Excel, JSON, CSV) zu einem 2D-Array
                const parsedData = await parseFile(file);

                // 2. 2D-Array in einen CSV-String umwandeln
                const csvString = parsedData.map(row =>
                    row.map(cell => {
                        const cellStr = cell === null || cell === undefined ? '' : String(cell);
                        // Escape quotes and wrap in quotes if it contains comma, newline, or quote
                        if (/[,"\n\r]/.test(cellStr)) {
                            return `"${cellStr.replace(/"/g, '""')}"`;
                        }
                        return cellStr;
                    }).join(',')
                ).join('\n');

                // 3. Name anpassen (Erweiterung in .csv ändern)
                const originalName = file.name;
                const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
                const newFileName = `${baseName}.csv`;

                // 4. Neues File-Objekt erstellen
                const normalizedFile = new File([csvString], newFileName, { type: 'text/csv' });

                await uploadDataset(normalizedFile);
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
            if (selectedPreviewFile && datasetIds.includes(selectedPreviewFile.dataset_id)) {
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
            {hideUpload ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                    <DataWrangler
                        datasets={datasets}
                        onRemoveDataset={(id) => handleDelete([id])}
                        onAddDataset={handleUpload}
                    />
                </div>
            ) : (
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
            )}
        </div>
    );
}

export default Prepare;

