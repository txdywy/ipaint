// app.js - Windows 11 Paint main application (optimized)

class W11Paint {
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
        this.fileName = 'Untitled';
        this.isDirty = false;
        this.clipboard = null;
        this.zoomLevel = 100;
        this.currentTool = 'pencil';
        this.lineWidth = 4;
        this.brushSize = 2;
        this.eraserSize = 8;
        this.outlineMode = 'solid';
        this.fillMode = 'none';

        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

        this.history = new PaintHistory(this.mainCanvas);
        this.history.onResize = (w, h) => {
            this.overlayCanvas.width = w;
            this.overlayCanvas.height = h;
            this._updateSizeDisplay(w, h);
        };
        this.drawing = new DrawingEngine(this);
        this.selection = new SelectionEngine(this);
        this.ui = new UIManager(this);

        this._setupCanvasEvents();
        this._setupKeyboard();
        this._setupColorPalette();
        this._setupZoom();
        this._setupFileInput();
        this._updateSizeDisplay(this.mainCanvas.width, this.mainCanvas.height);
        this.updateColors();
        this.setTool('pencil');
    }

    setTool(name) {
        this.currentTool = name;
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === name);
        });
        const area = PaintUtils.el('canvasArea');
        area.className = 'canvas-area';
        const map = {
            pencil: 'cursor-pencil', brush: 'cursor-brush', calligraphy: 'cursor-brush',
            eraser: 'cursor-eraser', fill: 'cursor-fill', pickColor: 'cursor-picker',
            text: 'cursor-text', magnifier: 'cursor-magnifier',
            rectSelect: 'cursor-select', select: 'cursor-select'
        };
        if (map[name]) area.classList.add(map[name]);
    }

    updateColors() {
        PaintUtils.el('colorPrimary').style.background = this.fgColor;
        PaintUtils.el('colorSecondary').style.background = this.bgColor;
    }

    // ---- Canvas Events ----
    _setupCanvasEvents() {
        const container = PaintUtils.el('canvasContainer');

        container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const pos = this._canvasPos(e);
            this.mouseDown = true;
            this.mouseButton = e.button;
            this.shiftKey = e.shiftKey;

            if (this.currentTool === 'rectSelect' || this.currentTool === 'select') {
                this.selection.onMouseDown(pos.x, pos.y, e.button);
            } else if (this.currentTool === 'text') {
                this._startText(pos.x, pos.y);
            } else if (this.currentTool === 'magnifier') {
                if (e.button === 0) this.zoomIn(); else this.zoomOut();
            } else {
                this.drawing.onMouseDown(pos.x, pos.y, e.button);
            }
        });

        container.addEventListener('mousemove', (e) => {
            const pos = this._canvasPos(e);
            this.shiftKey = e.shiftKey;
            this._updateCoords(pos.x, pos.y);

            if (!this.mouseDown) return;

            if (this.currentTool === 'rectSelect' || this.currentTool === 'select') {
                this.selection.onMouseMove(pos.x, pos.y);
            } else {
                this.drawing.onMouseMove(pos.x, pos.y);
            }
        });

        const handleUp = (e) => {
            if (!this.mouseDown) return;
            this.mouseDown = false;
            const pos = this._canvasPos(e);

            if (this.currentTool === 'rectSelect' || this.currentTool === 'select') {
                this.selection.onMouseUp();
            } else {
                this.drawing.onMouseUp(pos.x, pos.y, e.button);
            }
        };

        container.addEventListener('mouseup', handleUp);
        document.addEventListener('mouseup', handleUp);

        container.addEventListener('dblclick', (e) => {
            const pos = this._canvasPos(e);
            this.drawing.onDoubleClick(pos.x, pos.y);
        });

        container.addEventListener('contextmenu', (e) => e.preventDefault());
        container.addEventListener('mouseleave', () => this._updateCoords(-1, -1));
    }

    _canvasPos(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) * this.mainCanvas.width / rect.width) | 0,
            y: ((e.clientY - rect.top) * this.mainCanvas.height / rect.height) | 0
        };
    }

    // ---- Keyboard ----
    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            this.ctrlKey = e.ctrlKey;
            this.shiftKey = e.shiftKey;

            if (e.key === 'Escape') {
                if (this.drawing.drawing) this.drawing.cancel();
                else if (this.selection.hasSelection) this.selection.commit();
                PaintUtils.el('contextMenu').style.display = 'none';
                document.querySelectorAll('.w11-dialog').forEach(d => d.style.display = 'none');
                PaintUtils.el('dialogOverlay').style.display = 'none';
                return;
            }

            if (e.key === 'Delete') { this.selection.deleteSelection(); return; }

            if (e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'z': e.preventDefault(); this.undo(); break;
                    case 'y': e.preventDefault(); this.redo(); break;
                    case 'a': e.preventDefault(); this.selection.selectAll(); break;
                    case 'c': e.preventDefault(); this.copy(); break;
                    case 'v': e.preventDefault(); this.paste(); break;
                    case 'x': e.preventDefault(); this.cut(); break;
                    case 's': e.preventDefault(); this.saveFile(); break;
                    case 'o': e.preventDefault(); PaintUtils.el('fileInput').click(); break;
                    case 'n': e.preventDefault(); this.newFile(); break;
                }
                return;
            }

            // Tool shortcuts
            const toolMap = { p: 'pencil', b: 'brush', e: 'eraser', g: 'fill', t: 'text', i: 'pickColor', m: 'magnifier' };
            if (toolMap[e.key.toLowerCase()] && !e.ctrlKey && !e.altKey) {
                this.setTool(toolMap[e.key.toLowerCase()]);
            }
        });

        document.addEventListener('keyup', (e) => {
            this.ctrlKey = e.ctrlKey;
            this.shiftKey = e.shiftKey;
        });
    }

    // ---- Color Palette ----
    _setupColorPalette() {
        document.querySelectorAll('.color-swatch').forEach(cell => {
            cell.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const c = cell.dataset.color;
                if (e.button === 2) this.bgColor = c; else this.fgColor = c;
                this.updateColors();
            });
        });

        PaintUtils.el('colorPrimary').addEventListener('click', () => {
            this.ui._cpSetHex(this.fgColor);
            this.ui.openDialog('colorDlg');
        });
        PaintUtils.el('colorSecondary').addEventListener('click', () => {
            this.ui._cpSetHex(this.bgColor);
            this.ui.openDialog('colorDlg');
        });
    }

    // ---- Zoom ----
    _setupZoom() {
        const slider = PaintUtils.el('zoomSlider');
        if (slider) slider.addEventListener('input', () => this.setZoom(parseInt(slider.value)));

        document.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'zoomIn') this.zoomIn();
                else this.zoomOut();
            });
        });
    }

    zoomIn() { this.setZoom(Math.min(this.zoomLevel * 2, 800)); }
    zoomOut() { this.setZoom(Math.max(this.zoomLevel / 2, 10)); }

    setZoom(level) {
        this.zoomLevel = level;
        const container = PaintUtils.el('canvasContainer');
        const s = level / 100;
        container.style.transform = s === 1 ? '' : `scale(${s})`;
        container.style.transformOrigin = 'top left';
        this.mainCanvas.style.imageRendering = s > 1 ? 'pixelated' : 'auto';
        this.overlayCanvas.style.imageRendering = s > 1 ? 'pixelated' : 'auto';
        PaintUtils.el('zoomDisplay').textContent = level + '%';
        PaintUtils.el('zoomSlider').value = level;
    }

    // ---- File ----
    _setupFileInput() {
        PaintUtils.el('fileInput').addEventListener('change', (e) => {
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
                    this._updateTitle();
                    this.isDirty = false;
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
    }

    newFile() {
        if (this.isDirty && !confirm('Save changes?')) return;
        this.history.clear();
        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.fileName = 'Untitled';
        this.isDirty = false;
        this._updateTitle();
        this.selection.clearSelection();
    }

    saveFile() {
        const link = document.createElement('a');
        link.download = this.fileName + '.png';
        link.href = this.mainCanvas.toDataURL('image/png');
        link.click();
        this.isDirty = false;
        this._updateTitle();
    }

    // ---- Edit ----
    undo() { this.selection.clearSelection(); this.history.undo(); this._updateSizeDisplay(this.mainCanvas.width, this.mainCanvas.height); }
    redo() { this.history.redo(); this._updateSizeDisplay(this.mainCanvas.width, this.mainCanvas.height); }

    cut() { if (!this.selection.hasSelection) return; this.clipboard = this.selection.copySelection(); this.selection.deleteSelection(); }
    copy() { if (!this.selection.hasSelection) return; this.clipboard = this.selection.copySelection(); }

    async paste() {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const img = new Image();
                        const url = URL.createObjectURL(blob);
                        img.onload = () => { this.history.saveState(); this.selection.clearSelection(); this.mainCtx.drawImage(img, 0, 0); this.isDirty = true; URL.revokeObjectURL(url); };
                        img.src = url;
                        return;
                    }
                }
            }
        } catch (err) {}
        if (this.clipboard) { this.history.saveState(); this.selection.clearSelection(); this.mainCtx.drawImage(this.clipboard, 0, 0); this.isDirty = true; }
    }

    // ---- Image Operations ----
    resizeCanvas(w, h) {
        const id = this.mainCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCanvas.width = w; this.mainCanvas.height = h;
        this.overlayCanvas.width = w; this.overlayCanvas.height = h;
        this.mainCtx.fillStyle = '#FFFFFF';
        this.mainCtx.fillRect(0, 0, w, h);
        this.mainCtx.putImageData(id, 0, 0);
        this._updateSizeDisplay(w, h);
    }

    flipH() {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        const tc = document.createElement('canvas'); tc.width = w; tc.height = h;
        tc.getContext('2d').putImageData(this.mainCtx.getImageData(0, 0, w, h), 0, 0);
        this.mainCtx.clearRect(0, 0, w, h);
        this.mainCtx.save(); this.mainCtx.scale(-1, 1); this.mainCtx.drawImage(tc, -w, 0); this.mainCtx.restore();
        this.isDirty = true;
    }

    flipV() {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        const tc = document.createElement('canvas'); tc.width = w; tc.height = h;
        tc.getContext('2d').putImageData(this.mainCtx.getImageData(0, 0, w, h), 0, 0);
        this.mainCtx.clearRect(0, 0, w, h);
        this.mainCtx.save(); this.mainCtx.scale(1, -1); this.mainCtx.drawImage(tc, 0, -h); this.mainCtx.restore();
        this.isDirty = true;
    }

    rotate(angle) {
        const w = this.mainCanvas.width, h = this.mainCanvas.height;
        const tc = document.createElement('canvas'); tc.width = w; tc.height = h;
        tc.getContext('2d').putImageData(this.mainCtx.getImageData(0, 0, w, h), 0, 0);
        if (angle === 90 || angle === 270) {
            this.mainCanvas.width = h; this.mainCanvas.height = w;
            this.overlayCanvas.width = h; this.overlayCanvas.height = w;
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
        this._updateSizeDisplay(this.mainCanvas.width, this.mainCanvas.height);
    }

    colorPickerConfirm() { this.ui.cpConfirmColor(); }

    // ---- Text Tool ----
    _startText(x, y) {
        this.history.saveState();
        const box = PaintUtils.el('textBox');
        const input = PaintUtils.el('textInput');
        box.style.display = 'block';
        box.style.left = x + 'px';
        box.style.top = y + 'px';
        box.style.width = '200px';
        box.style.height = '60px';
        input.value = '';
        input.style.color = this.fgColor;
        setTimeout(() => input.focus(), 0);

        const commit = () => {
            if (input.value.trim()) {
                const ctx = this.mainCtx;
                ctx.fillStyle = this.fgColor;
                ctx.font = '14px "Segoe UI", sans-serif';
                ctx.textBaseline = 'top';
                input.value.split('\n').forEach((line, i) => {
                    ctx.fillText(line, x + 4, y + 4 + i * 18);
                });
                this.isDirty = true;
            }
            box.style.display = 'none';
            input.removeEventListener('blur', commit);
        };
        input.addEventListener('blur', commit);
    }

    // ---- Status ----
    _updateCoords(x, y) {
        PaintUtils.el('statusCoords').textContent = (x < 0 || y < 0) ? '' : `${x}, ${y}px`;
    }

    _updateSizeDisplay(w, h) {
        PaintUtils.el('statusSize').textContent = `${w} x ${h}px`;
    }

    _updateTitle() {
        PaintUtils.el('titleText').textContent = this.fileName;
        PaintUtils.el('titleSaved').textContent = this.isDirty ? '' : '✓';
        document.title = this.fileName + ' - Paint';
    }
}

window.addEventListener('DOMContentLoaded', () => { window.w11paint = new W11Paint(); });
