// tools.js - Tool state management

class ToolManager {
    constructor() {
        this.currentTool = 'pencil';
        this.previousTool = 'pencil';
        this.lineWidth = 1;
        this.brushShape = { type: 'circle', size: 4 };
        this.eraserSize = 4;
        this.fillMode = 'outline'; // outline, outlineFill, fillOnly

        this.toolCallbacks = {};
    }

    setTool(toolName) {
        if (toolName === this.currentTool) return;
        this.previousTool = this.currentTool;
        this.currentTool = toolName;
        this.updateToolUI();
        this.updateOptionsUI();
        this.emit('toolChanged', { tool: toolName, previous: this.previousTool });
    }

    getTool() {
        return this.currentTool;
    }

    on(event, callback) {
        if (!this.toolCallbacks[event]) this.toolCallbacks[event] = [];
        this.toolCallbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.toolCallbacks[event]) {
            this.toolCallbacks[event].forEach(cb => cb(data));
        }
    }

    updateToolUI() {
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });
        // Update cursor
        this.updateCursor();
    }

    updateCursor() {
        const canvasArea = document.getElementById('canvasArea');
        canvasArea.className = 'canvas-area';
        switch (this.currentTool) {
            case 'pencil': case 'line': case 'curve':
            case 'airbrush': case 'pickColor': case 'fill':
                canvasArea.classList.add('cursor-pencil');
                break;
            case 'brush':
                canvasArea.classList.add('cursor-brush');
                break;
            case 'eraser':
                canvasArea.classList.add('cursor-eraser');
                break;
            case 'text':
                canvasArea.classList.add('cursor-text');
                break;
            case 'magnifier':
                canvasArea.classList.add('cursor-magnifier');
                break;
            case 'freeSelect': case 'rectSelect':
                canvasArea.classList.add('cursor-select');
                break;
            case 'rectangle': case 'ellipse': case 'roundRect':
            case 'polygon':
                canvasArea.classList.add('cursor-pencil');
                break;
            default:
                canvasArea.classList.add('cursor-pencil');
        }
    }

    updateOptionsUI() {
        const lineWidthOpts = document.getElementById('lineWidthOptions');
        const brushOpts = document.getElementById('brushShapeOptions');
        const eraserOpts = document.getElementById('eraserSizeOptions');
        const magnifierOpts = document.getElementById('magnifierOptions');
        const fillModeOpts = document.getElementById('fillModeOptions');

        lineWidthOpts.style.display = 'none';
        brushOpts.style.display = 'none';
        eraserOpts.style.display = 'none';
        magnifierOpts.style.display = 'none';
        fillModeOpts.style.display = 'none';

        switch (this.currentTool) {
            case 'line': case 'curve':
                lineWidthOpts.style.display = 'flex';
                break;
            case 'brush':
                brushOpts.style.display = 'grid';
                break;
            case 'eraser':
                eraserOpts.style.display = 'grid';
                break;
            case 'magnifier':
                magnifierOpts.style.display = 'grid';
                break;
            case 'rectangle': case 'ellipse': case 'roundRect': case 'polygon':
                lineWidthOpts.style.display = 'flex';
                fillModeOpts.style.display = 'grid';
                break;
        }
    }

    // Setup tool options click handlers
    setupOptions() {
        // Line width
        document.querySelectorAll('.lw-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.lw-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.lineWidth = parseInt(opt.dataset.width);
            });
        });

        // Brush shapes
        document.querySelectorAll('.brush-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.brush-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.brushShape = {
                    type: opt.dataset.shape,
                    size: parseInt(opt.dataset.size)
                };
            });
        });

        // Eraser sizes
        document.querySelectorAll('.eraser-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.eraser-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.eraserSize = parseInt(opt.dataset.size);
            });
        });

        // Magnifier zoom
        document.querySelectorAll('.mag-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.mag-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.zoomLevel = parseInt(opt.dataset.zoom);
            });
        });

        // Fill mode
        document.querySelectorAll('.fill-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.fill-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.fillMode = opt.dataset.mode;
            });
        });

        // Tool buttons
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.dataset.tool);
            });
        });
    }
}
