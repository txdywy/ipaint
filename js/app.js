// app.js - Main application (optimized)

class PaintApp {
    constructor() {
        this.mainCanvas = PaintUtils.el('mainCanvas');
        this.overlayCanvas = PaintUtils.el('overlayCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: true });
        this.overlayCtx = this.overlayCanvas.getContext('2d');

        this.fgColor = '#000000';
        this.bgColor = '#FFFFFF';
        this.mouseDown = false;
        this.mouseButton = 0;
        this.shiftKey = false;
        this.ctrlKey = false;
        this.fileName = 'untitled';
        this.isDirty = false;
        this.clipboard = null;
        this.zoomLevel = 1;
        this.viewingBitmap = false;

        // Initialize with white background
        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

        // Initialize modules
        this.toolManager = new ToolManager();
        this.history = new PaintHistory(this.mainCanvas);
        this.history.onResize = (w, h) => {
            this.overlayCanvas.width = w;
            this.overlayCanvas.height = h;
            this.updateStatusSize(w, h);
        };
        this.brushTools = new BrushTools(this);
        this.shapeTools = new ShapeTools(this);
        this.selectionTools = new SelectionTools(this);
        this.textTool = new TextTool(this);
        this.colorPicker = new ColorPickerDialog(this);
        this.dialogs = new DialogManager(this);
        this.menus = new MenuManager(this);

        this.toolManager.setupOptions();
        this.setupCanvasEvents();
        this.setupColorPalette();
        this.setupKeyboardShortcuts();
        this.updateColorDisplay();
        this.updateTitle();

        PaintUtils.el('fileInput').addEventListener('change', (e) => this.handleFileOpen(e));
    }

    // ---- Canvas Events ----
    setupCanvasEvents() {
        const container = PaintUtils.el('canvasContainer');

        container.addEventListener('mousedown', (e) => {
            if (this.viewingBitmap) return;
            e.preventDefault();

            const pos = this.getCanvasPos(e);
            this.mouseDown = true;
            this.mouseButton = e.button;
            this.shiftKey = e.shiftKey;
            this.ctrlKey = e.ctrlKey;

            const tool = this.toolManager.getTool();

            switch (tool) {
                case 'pencil': case 'brush': case 'eraser': case 'airbrush':
                    this.brushTools.onMouseDown(pos.x, pos.y, e.button);
                    break;
                case 'line': case 'curve': case 'rectangle': case 'ellipse':
                case 'roundRect': case 'polygon':
                    this.shapeTools.onMouseDown(pos.x, pos.y, e.button);
                    break;
                case 'freeSelect': case 'rectSelect':
                    this.selectionTools.onMouseDown(pos.x, pos.y, e.button);
                    break;
                case 'text':
                    this.textTool.onMouseDown(pos.x, pos.y, e.button);
                    break;
                case 'fill':
                    this.doFill(pos.x, pos.y, e.button);
                    break;
                case 'pickColor':
                    this.pickColor(pos.x, pos.y, e.button);
                    break;
                case 'magnifier':
                    this.handleMagnifier(e);
                    break;
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (this.viewingBitmap) return;
            const pos = this.getCanvasPos(e);
            this.shiftKey = e.shiftKey;
            this.updateStatusPos(pos.x, pos.y);

            if (!this.mouseDown) return;

            const tool = this.toolManager.getTool();
            switch (tool) {
                case 'pencil': case 'brush': case 'eraser': case 'airbrush':
                    this.brushTools.onMouseMove(pos.x, pos.y);
                    break;
                case 'line': case 'curve': case 'rectangle': case 'ellipse':
                case 'roundRect': case 'polygon':
                    this.shapeTools.onMouseMove(pos.x, pos.y);
                    break;
                case 'freeSelect': case 'rectSelect':
                    this.selectionTools.onMouseMove(pos.x, pos.y);
                    break;
                case 'text':
                    this.textTool.onMouseMove(pos.x, pos.y);
                    break;
            }
        });

        const handleMouseUp = (e) => {
            if (!this.mouseDown) return;
            const pos = this.getCanvasPos(e);
            this.mouseDown = false;

            const tool = this.toolManager.getTool();
            switch (tool) {
                case 'pencil': case 'brush': case 'eraser': case 'airbrush':
                    this.brushTools.onMouseUp();
                    break;
                case 'line': case 'curve': case 'rectangle': case 'ellipse':
                case 'roundRect': case 'polygon':
                    this.shapeTools.onMouseUp(pos.x, pos.y, e.button);
                    break;
                case 'freeSelect': case 'rectSelect':
                    this.selectionTools.onMouseUp(pos.x, pos.y);
                    break;
                case 'text':
                    this.textTool.onMouseUp();
                    break;
            }
        };

        container.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseup', handleMouseUp);

        container.addEventListener('dblclick', (e) => {
            const pos = this.getCanvasPos(e);
            this.shapeTools.onDoubleClick(pos.x, pos.y);
        });

        container.addEventListener('contextmenu', (e) => e.preventDefault());

        container.addEventListener('mouseleave', () => {
            this.updateStatusPos(-1, -1);
        });
    }

    getCanvasPos(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const scaleX = this.mainCanvas.width / rect.width;
        const scaleY = this.mainCanvas.height / rect.height;
        return {
            x: ((e.clientX - rect.left) * scaleX) | 0,
            y: ((e.clientY - rect.top) * scaleY) | 0
        };
    }

    // ---- Color Palette ----
    setupColorPalette() {
        document.querySelectorAll('.color-cell').forEach(cell => {
            cell.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const color = cell.dataset.color;
                if (e.button === 2) {
                    this.bgColor = color;
                } else {
                    this.fgColor = color;
                }
                this.updateColorDisplay();
            });
            // contextmenu handler NOT needed - mousedown with button===2 already handles it
        });

        // Single click opens color picker
        PaintUtils.el('fgColorDisplay').addEventListener('click', () => {
            this.colorPicker.show(false);
        });
        PaintUtils.el('bgColorDisplay').addEventListener('click', () => {
            this.colorPicker.show(true);
        });
    }

    updateColorDisplay() {
        PaintUtils.el('fgColorDisplay').style.background = this.fgColor;
        PaintUtils.el('bgColorDisplay').style.background = this.bgColor;
    }

    // ---- Keyboard Shortcuts ----
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            this.ctrlKey = e.ctrlKey;
            this.shiftKey = e.shiftKey;

            if (e.key === 'Escape') {
                if (this.textTool.isActive()) {
                    this.textTool.cancelText();
                } else if (this.viewingBitmap) {
                    this.exitViewBitmap();
                } else if (this.shapeTools.drawing) {
                    this.shapeTools.cancelCurrentShape();
                } else if (this.selectionTools.hasSelection) {
                    this.selectionTools.commitSelection();
                }
                this.dialogs.closeAllDialogs();
                return;
            }

            if (e.key === 'Enter' && !e.shiftKey && this.textTool.isActive()) {
                this.textTool.commitText();
                e.preventDefault();
                return;
            }

            if (e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'n': e.preventDefault(); this.newFile(); break;
                    case 'o': e.preventDefault(); this.openFile(); break;
                    case 's': e.preventDefault(); this.saveFile(); break;
                    case 'z': e.preventDefault(); this.doUndo(); break;
                    case 'y': e.preventDefault(); this.doRedo(); break;
                    case 'a': e.preventDefault(); this.selectAll(); break;
                    case 'c': e.preventDefault(); this.copySelection(); break;
                    case 'v': e.preventDefault(); this.pasteSelection(); break;
                    case 'x': e.preventDefault(); this.cutSelection(); break;
                    case 'i': e.preventDefault(); this.invertColors(); break;
                    case 'e': e.preventDefault(); this.dialogs.openDialog('attributesDialog'); break;
                    case 'r': e.preventDefault(); this.dialogs.openDialog('flipRotateDialog'); break;
                    case 'w': e.preventDefault(); this.dialogs.openDialog('stretchSkewDialog'); break;
                    case 'f': e.preventDefault(); this.viewBitmap(); break;
                }
                return;
            }

            if (e.key === 'Delete') {
                this.deleteSelection();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.ctrlKey = e.ctrlKey;
            this.shiftKey = e.shiftKey;
        });
    }

    // ---- Status Bar ----
    updateStatusPos(x, y) {
        const el = PaintUtils.el('statusPos');
        el.textContent = (x < 0 || y < 0) ? '' : `${x}, ${y}px`;
    }

    updateStatusSize(w, h) {
        PaintUtils.el('statusSize').textContent = `${w}x${h}px`;
    }

    // ---- Title Bar ----
    updateTitle() {
        document.querySelector('.title-bar-text').textContent = `${this.fileName} - Paint`;
        document.title = `${this.fileName} - Paint`;
    }

    // ---- File Operations ----
    newFile() {
        if (this.isDirty) {
            if (!confirm('Save changes to ' + this.fileName + '?')) return;
            this.saveFile();
        }
        this.history.clear();
        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.fileName = 'untitled';
        this.isDirty = false;
        this.updateTitle();
        this.selectionTools.clearSelection();
    }

    openFile() {
        PaintUtils.el('fileInput').click();
    }

    handleFileOpen(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                this.history.saveState();
                this.resizeCanvas(img.width, img.height);
                this.mainCtx.fillStyle = '#FFFFFF';
                this.mainCtx.fillRect(0, 0, img.width, img.height);
                this.mainCtx.drawImage(img, 0, 0);
                this.fileName = file.name.replace(/\.[^.]+$/, '');
                this.isDirty = false;
                this.updateTitle();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    saveFile() {
        this.saveFileAs();
    }

    saveFileAs() {
        const link = document.createElement('a');
        link.download = this.fileName + '.png';
        link.href = this.mainCanvas.toDataURL('image/png');
        link.click();
        this.isDirty = false;
    }

    // ---- Edit Operations ----
    doUndo() {
        if (this.textTool.isActive()) this.textTool.commitText();
        this.selectionTools.clearSelection();
        this.history.undo();
        this.updateStatusSize(this.mainCanvas.width, this.mainCanvas.height);
    }

    doRedo() {
        this.history.redo();
        this.updateStatusSize(this.mainCanvas.width, this.mainCanvas.height);
    }

    cutSelection() {
        if (!this.selectionTools.hasSelection) return;
        this.clipboard = this.selectionTools.copySelection();
        this.selectionTools.deleteSelection();
    }

    copySelection() {
        if (!this.selectionTools.hasSelection) return;
        this.clipboard = this.selectionTools.copySelection();
    }

    async pasteSelection() {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const img = new Image();
                        const blobUrl = URL.createObjectURL(blob);
                        img.onload = () => {
                            this.history.saveState();
                            this.selectionTools.clearSelection();
                            this.mainCtx.drawImage(img, 0, 0);
                            this.isDirty = true;
                            URL.revokeObjectURL(blobUrl);
                        };
                        img.src = blobUrl;
                        return;
                    }
                }
            }
        } catch (err) { /* fallback */ }

        if (this.clipboard) {
            this.history.saveState();
            this.selectionTools.clearSelection();
            this.mainCtx.drawImage(this.clipboard, 0, 0);
            this.isDirty = true;
        }
    }

    deleteSelection() { this.selectionTools.deleteSelection(); }
    selectAll() { this.selectionTools.selectAll(); }

    // ---- Drawing Operations ----
    doFill(x, y, button) {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        this.history.saveState();
        const imageData = this.mainCtx.getImageData(0, 0, w, h);
        PaintUtils.floodFill(imageData, x, y, button === 2 ? this.bgColor : this.fgColor, w, h);
        this.mainCtx.putImageData(imageData, 0, 0);
        this.isDirty = true;
    }

    pickColor(x, y, button) {
        const color = PaintUtils.getPixelColor(this.mainCtx, x, y);
        if (button === 2) this.bgColor = color;
        else this.fgColor = color;
        this.updateColorDisplay();
    }

    // ---- View Operations ----
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 2, 8);
        this.applyZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 2, 1);
        this.applyZoom();
    }

    applyZoom() {
        const container = PaintUtils.el('canvasContainer');
        if (this.zoomLevel === 1) {
            container.style.transform = '';
            this.mainCanvas.style.imageRendering = 'auto';
            this.overlayCanvas.style.imageRendering = 'auto';
        } else {
            container.style.transform = `scale(${this.zoomLevel})`;
            container.style.transformOrigin = 'top left';
            this.mainCanvas.style.imageRendering = 'pixelated';
            this.overlayCanvas.style.imageRendering = 'pixelated';
        }
        this.updateStatusSize(this.mainCanvas.width, this.mainCanvas.height);
    }

    handleMagnifier(e) {
        if (e.button === 0) this.zoomIn();
        else if (e.button === 2) this.zoomOut();
    }

    viewBitmap() {
        this.viewingBitmap = true;
        this.selectionTools.clearSelection();

        const overlay = PaintUtils.el('viewBitmapOverlay');
        overlay.style.display = 'flex';

        const vc = document.createElement('canvas');
        vc.width = this.mainCanvas.width;
        vc.height = this.mainCanvas.height;
        vc.getContext('2d').drawImage(this.mainCanvas, 0, 0);
        vc.style.maxWidth = '100%';
        vc.style.maxHeight = '100%';
        vc.style.objectFit = 'contain';
        overlay.innerHTML = '';
        overlay.appendChild(vc);

        const exitHandler = () => {
            this.exitViewBitmap();
            overlay.removeEventListener('click', exitHandler);
        };
        overlay.addEventListener('click', exitHandler);
    }

    exitViewBitmap() {
        this.viewingBitmap = false;
        PaintUtils.el('viewBitmapOverlay').style.display = 'none';
    }

    // ---- Image Operations ----
    resizeCanvas(newWidth, newHeight) {
        const imageData = this.mainCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCanvas.width = newWidth;
        this.mainCanvas.height = newHeight;
        this.overlayCanvas.width = newWidth;
        this.overlayCanvas.height = newHeight;
        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.fillRect(0, 0, newWidth, newHeight);
        this.mainCtx.putImageData(imageData, 0, 0);
        this.updateStatusSize(newWidth, newHeight);
    }

    flipHorizontal() {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        const tc = document.createElement('canvas');
        tc.width = w; tc.height = h;
        tc.getContext('2d').putImageData(this.mainCtx.getImageData(0, 0, w, h), 0, 0);
        this.mainCtx.clearRect(0, 0, w, h);
        this.mainCtx.save();
        this.mainCtx.scale(-1, 1);
        this.mainCtx.drawImage(tc, -w, 0);
        this.mainCtx.restore();
        this.isDirty = true;
    }

    flipVertical() {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        const tc = document.createElement('canvas');
        tc.width = w; tc.height = h;
        tc.getContext('2d').putImageData(this.mainCtx.getImageData(0, 0, w, h), 0, 0);
        this.mainCtx.clearRect(0, 0, w, h);
        this.mainCtx.save();
        this.mainCtx.scale(1, -1);
        this.mainCtx.drawImage(tc, 0, -h);
        this.mainCtx.restore();
        this.isDirty = true;
    }

    rotate(angle) {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        const tc = document.createElement('canvas');
        tc.width = w; tc.height = h;
        tc.getContext('2d').putImageData(this.mainCtx.getImageData(0, 0, w, h), 0, 0);

        if (angle === 90 || angle === 270) {
            this.mainCanvas.width = h;
            this.mainCanvas.height = w;
            this.overlayCanvas.width = h;
            this.overlayCanvas.height = w;
        }

        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCtx.save();
        if (angle === 90) this.mainCtx.translate(h, 0);
        else if (angle === 180) this.mainCtx.translate(w, h);
        else if (angle === 270) this.mainCtx.translate(0, w);
        this.mainCtx.rotate(angle * Math.PI / 180);
        this.mainCtx.drawImage(tc, 0, 0);
        this.mainCtx.restore();
        this.isDirty = true;
        this.updateStatusSize(this.mainCanvas.width, this.mainCanvas.height);
    }

    stretchSkew(stretchH, stretchV, skewH, skewV) {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        const tc = document.createElement('canvas');
        tc.width = w; tc.height = h;
        tc.getContext('2d').putImageData(this.mainCtx.getImageData(0, 0, w, h), 0, 0);

        const newW = Math.round(w * stretchH / 100);
        const newH = Math.round(h * stretchV / 100);

        this.mainCanvas.width = newW;
        this.mainCanvas.height = newH;
        this.overlayCanvas.width = newW;
        this.overlayCanvas.height = newH;

        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.fillRect(0, 0, newW, newH);
        this.mainCtx.save();
        if (skewH || skewV) {
            this.mainCtx.setTransform(
                1, Math.tan(skewV * Math.PI / 180),
                Math.tan(skewH * Math.PI / 180), 1, 0, 0
            );
        }
        this.mainCtx.drawImage(tc, 0, 0, newW, newH);
        this.mainCtx.restore();
        this.isDirty = true;
        this.updateStatusSize(newW, newH);
    }

    invertColors() {
        this.history.saveState();
        const d = this.mainCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        const p = d.data;
        for (let i = 0, len = p.length; i < len; i += 4) {
            p[i] = 255 - p[i];
            p[i+1] = 255 - p[i+1];
            p[i+2] = 255 - p[i+2];
        }
        this.mainCtx.putImageData(d, 0, 0);
        this.isDirty = true;
    }

    clearImage() {
        this.history.saveState();
        this.mainCtx.fillStyle = this.bgColor;
        this.mainCtx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.isDirty = true;
    }

    openColorPicker() {
        this.colorPicker.show(false);
    }
}

// ---- Initialize ----
window.addEventListener('DOMContentLoaded', () => {
    window.paintApp = new PaintApp();
});
