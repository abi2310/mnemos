import React, { useState, useEffect, useRef } from 'react';
import GridLayout from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DashboardCanvas.css';

const DEFAULT_STACK_X = 0;
const DEFAULT_STACK_W = 4;

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 1;
const GRID_MARGIN = 10;
const GRID_PADDING = 10;

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

    // Bei Breitenänderung Höhen korrigieren
    useEffect(() => {
        setLayout(prev =>
            prev.map(item => {
                const ratio = aspectRatiosRef.current[item.i];
                if (ratio) {
                    return {
                        ...item,
                        h: getHeightFromRatio(item.w, ratio, containerWidth)
                    };
                }
                return item;
            })
        );
    }, [containerWidth]);

    useEffect(() => {
        const handleAddEvent = (e) => {
            const parsed = e.detail;

            if (parsed?.type === 'artifact_image') {
                const newId = Date.now().toString();

                setWidgets(prev => [...prev, {
                    id: newId,
                    url: parsed.url
                }]);

                setLayout(prev => [
                    ...prev,
                    {
                        i: newId,
                        x: DEFAULT_STACK_X,
                        y: Infinity,
                        w: DEFAULT_STACK_W,
                        h: 20,
                        minW: 3,
                        minH: 5
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

                    setWidgets(prev => [...prev, {
                        id: newId,
                        url: parsed.url
                    }]);

                    setLayout(prev => [
                        ...prev,
                        {
                            i: newId,
                            x: DEFAULT_STACK_X,
                            y: Infinity,
                            w: DEFAULT_STACK_W,
                            h: 20,
                            minW: 3,
                            minH: 5
                        }
                    ]);
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const removeWidget = (id) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
        setLayout(prev => prev.filter(l => l.i !== id));
        delete aspectRatiosRef.current[id];
    };

    const getHeightFromRatio = (w, ratio, containerWidth) => {
        const margin = GRID_MARGIN;
        const cols = GRID_COLS;
        const rowHeight = GRID_ROW_HEIGHT;
        const padding = GRID_PADDING;

        const colWidth =
            (containerWidth - margin * (cols - 1) - padding * 2) / cols;

        const widthPx = w * colWidth + margin * (w - 1);
        const heightPx = widthPx * ratio;

        // heightPx = h * rowHeight + (h - 1) * margin  →  h = (heightPx + margin) / (rowHeight + margin)
        return Math.max(1, Math.round((heightPx + margin) / (rowHeight + margin)));
    };

    const handleImageLoad = (id, width, height) => {
        if (!width || !height) return;

        const ratio = height / width;
        aspectRatiosRef.current[id] = ratio;

        setLayout(prev =>
            prev.map(item =>
                item.i === id
                    ? { ...item, h: getHeightFromRatio(item.w, ratio, containerWidth) }
                    : item
            )
        );
    };

    return (
        <div className="dashboard-canvas">
            <div className="dashboard-content">
                <div
                    ref={containerRef}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    style={{ width: '100%', minHeight: '500px' }}
                >
                    <GridLayout
                        width={containerWidth}
                        cols={GRID_COLS}
                        rowHeight={GRID_ROW_HEIGHT}
                        margin={[GRID_MARGIN, GRID_MARGIN]}
                        containerPadding={[GRID_PADDING, GRID_PADDING]}
                        layout={layout}
                        compactType={null}
                        preventCollision

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

                        onResize={(layout, oldItem, newItem) => {
                            const ratio = aspectRatiosRef.current[newItem.i];
                            if (ratio) {
                                newItem.h = getHeightFromRatio(newItem.w, ratio, containerWidth);
                            }
                        }}
                    >
                        {widgets.map(widget => (
                            <div key={widget.id} className="dashboard-widget">
                                <div className="widget-glass">
                                    <button
                                        className="delete-btn"
                                        onClick={() => removeWidget(widget.id)}
                                    >
                                        ✕
                                    </button>

                                    <img
                                        src={widget.url}
                                        alt=""
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            objectFit: 'contain',
                                            display: 'block'
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
                        ))}
                    </GridLayout>
                </div>
            </div>
        </div>
    );
}

export default DashboardCanvas;
