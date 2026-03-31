import React, { useState, useEffect, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DashboardCanvas.css';

function DashboardCanvas() {
    const [widgets, setWidgets] = useState([]);
    const [layout, setLayout] = useState([]);
    const aspectRatiosRef = useRef({});
    const [containerWidth, setContainerWidth] = useState(1200);
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            const observer = new ResizeObserver(entries => {
                if (entries[0]?.contentRect) {
                    setContainerWidth(entries[0].contentRect.width || 1200);
                }
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, []);

    // 🔥 Bei Breitenänderung alle Höhen neu berechnen, damit das Seitenverhältnis erhalten bleibt
    useEffect(() => {
        setLayout(prev => {
            let changed = false;
            const newLayout = prev.map(item => {
                const ratio = aspectRatiosRef.current[item.i];
                if (ratio) {
                    const newH = getHeightFromRatio(item.w, ratio, containerWidth);
                    if (item.h !== newH) {
                        changed = true;
                        return { ...item, h: newH };
                    }
                }
                return item;
            });
            return changed ? newLayout : prev;
        });
    }, [containerWidth]);

    useEffect(() => {
        const handleAddEvent = (e) => {
            const parsed = e.detail;
            if (parsed?.type === 'artifact_image') {
                const newId = Date.now().toString();

                const newWidget = {
                    id: newId,
                    type: 'image',
                    title: parsed.description || 'Visualisierung',
                    url: parsed.url
                };

                setWidgets(prev => [...prev, newWidget]);

                setLayout(prev => [
                    ...prev,
                    {
                        i: newId,
                        x: (prev.length * 4) % 12,
                        y: Infinity,
                        w: 4,
                        h: 29,
                        minW: 3,
                        minH: 10
                    }
                ]);
            }
        };

        window.addEventListener('add-to-dashboard', handleAddEvent);
        return () => window.removeEventListener('add-to-dashboard', handleAddEvent);
    }, []);

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (e) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');

        if (data) {
            try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'artifact_image') {
                    const newId = Date.now().toString();

                    const newWidget = {
                        id: newId,
                        type: 'image',
                        title: parsed.description || 'Visualisierung',
                        url: parsed.url
                    };

                    setWidgets(prev => [...prev, newWidget]);

                    setLayout(prev => [
                        ...prev,
                        {
                            i: newId,
                            x: (prev.length * 4) % 12,
                            y: Infinity,
                            w: 4,
                            h: 29,
                            minW: 3,
                            minH: 10
                        }
                    ]);
                }
            } catch (err) {
                console.error("Drop Fehler:", err);
            }
        }
    };

    const removeWidget = (id) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
        setLayout(prev => prev.filter(l => l.i !== id));

        delete aspectRatiosRef.current[id];
    };

    // 🔥 Zentrale Höhenberechnung
    const getHeightFromRatio = (w, ratio, containerWidth) => {
        const marginX = 10;
        const cols = 12;
        const rowHeight = 1; // Hochauflösendes Grid für pixelperfektes Wrapping

        const paddingX = 10; // containerPadding ist [10, 10]
        const colWidth = (containerWidth - marginX * (cols - 1) - paddingX * 2) / cols;
        const widthPx = w * colWidth + marginX * (w - 1);
        const heightPx = widthPx * ratio;

        return Math.max(1, Math.ceil((heightPx + marginX) / (rowHeight + marginX)));
    };

    const handleImageLoad = (id, width, height) => {
        if (!width || !height) return;

        const ratio = height / width;
        aspectRatiosRef.current[id] = ratio;

        setLayout(prev =>
            prev.map(item => {
                if (item.i === id) {
                    return {
                        ...item,
                        h: getHeightFromRatio(item.w, ratio, containerWidth)
                    };
                }
                return item;
            })
        );
    };

    return (
        <div className="dashboard-canvas">
            <div className="dashboard-header">
                <h2>Dashboard</h2>
            </div>

            <div className="dashboard-content">
                <div
                    ref={containerRef}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    style={{ width: '100%', minHeight: '500px' }}
                >
                    {widgets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <h3>Noch keine Visualisierungen</h3>
                        </div>
                    ) : (
                        <GridLayout
                            width={containerWidth}
                            cols={12}
                            rowHeight={1} // Pixelperfektes Aspect-Ratio-Wrapping
                            layout={layout}
                            margin={[10, 10]}
                            containerPadding={[10, 10]}

                            // 🔥 Layout IMMER korrigieren durch synchronen Ref, keine State-Verzögerung!
                            onLayoutChange={(newLayout) => {
                                const corrected = newLayout.map(item => {
                                    const ratio = aspectRatiosRef.current[item.i];
                                    if (ratio) {
                                        return {
                                            ...item,
                                            h: getHeightFromRatio(item.w, ratio, containerWidth)
                                        };
                                    }
                                    return item;
                                });
                                setLayout(corrected);
                            }}

                            // 🔥 Resize → Höhe sofort fixen
                            onResize={(layout, oldItem, newItem) => {
                                const ratio = aspectRatiosRef.current[newItem.i];
                                if (ratio) {
                                    newItem.h = getHeightFromRatio(newItem.w, ratio, containerWidth);
                                }
                            }}
                        >
                            {widgets.map(widget => {
                                return (
                                    <div key={widget.id} className="dashboard-widget">
                                        {/* Neu: Passgenauer Glas-Wrapper umschließt NUR das Bild */}
                                        <div className="widget-glass">
                                            <button
                                                className="delete-btn"
                                                onClick={() => removeWidget(widget.id)}
                                            >
                                                ✕
                                            </button>
                                            <img
                                                src={widget.url}
                                                alt={widget.title}
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                    borderRadius: '8px'
                                                }}
                                                onLoad={(e) =>
                                                    handleImageLoad(
                                                        widget.id,
                                                        e.target.naturalWidth,
                                                        e.target.naturalHeight
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </GridLayout>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DashboardCanvas;