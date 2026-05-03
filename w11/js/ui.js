// ui.js - Windows 11 Paint UI management (tabs, menus, dialogs, color picker)

class UIManager {
    constructor(app) {
        this.app = app;
        this.openMenu = null;
        this._setupTabs();
        this._setupContextMenu();
        this._setupDialogs();
        this._setupColorPicker();
        this._setupToolbar();
        this._setupSizeControls();
    }

    _setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.ribbon-tab').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                PaintUtils.el('tab-' + btn.dataset.tab).classList.add('active');
            });
        });
    }

    _setupToolbar() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.app.setTool(btn.dataset.tool);
            });
        });

        // Ribbon action buttons
        document.querySelectorAll('.ribbon-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this._handleAction(btn.dataset.action));
        });

        // Brush size dots
        document.querySelectorAll('.size-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                document.querySelectorAll('.size-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                this.app.brushSize = parseInt(dot.dataset.size);
            });
        });
    }

    _setupSizeControls() {
        const sizeSelect = PaintUtils.el('sizeSelect');
        const outlineSelect = PaintUtils.el('outlineSelect');
        const fillSelect = PaintUtils.el('fillSelect');

        if (sizeSelect) sizeSelect.addEventListener('change', () => {
            this.app.lineWidth = parseInt(sizeSelect.value);
            this.app.brushSize = parseInt(sizeSelect.value);
        });

        if (outlineSelect) outlineSelect.addEventListener('change', () => {
            this.app.outlineMode = outlineSelect.value;
        });

        if (fillSelect) fillSelect.addEventListener('change', () => {
            this.app.fillMode = fillSelect.value;
        });
    }

    _setupContextMenu() {
        const menu = PaintUtils.el('contextMenu');
        const container = PaintUtils.el('canvasContainer');

        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
        });

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.context-menu')) menu.style.display = 'none';
        });

        menu.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('click', () => {
                this._handleAction(item.dataset.action);
                menu.style.display = 'none';
            });
        });
    }

    _setupDialogs() {
        // Dialog close/cancel
        document.querySelectorAll('.dlg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const dialogId = btn.dataset.dialog;
                if (action === 'ok') this._dialogOk(dialogId);
                this._closeDialog(dialogId);
            });
        });

        PaintUtils.el('dialogOverlay').addEventListener('click', (e) => {
            if (e.target === PaintUtils.el('dialogOverlay')) {
                document.querySelectorAll('.w11-dialog').forEach(d => d.style.display = 'none');
                PaintUtils.el('dialogOverlay').style.display = 'none';
            }
        });

        // Resize aspect ratio
        const rw = PaintUtils.el('resizeW');
        const rh = PaintUtils.el('resizeH');
        const ra = PaintUtils.el('resizeAspect');
        if (rw && rh && ra) {
            const ratio = 800 / 600;
            rw.addEventListener('input', () => { if (ra.checked) rh.value = Math.round(rw.value / ratio); });
            rh.addEventListener('input', () => { if (ra.checked) rw.value = Math.round(rh.value * ratio); });
        }
    }

    _dialogOk(dialogId) {
        switch (dialogId) {
            case 'resizeDialog': {
                const w = parseInt(PaintUtils.el('resizeW').value) || 800;
                const h = parseInt(PaintUtils.el('resizeH').value) || 600;
                this.app.resizeCanvas(w, h);
                break;
            }
            case 'rotateDialog': {
                const val = document.querySelector('input[name="rotateDir"]:checked');
                if (!val) break;
                const v = val.value;
                this.app.history.saveState();
                if (v === 'flipH') this.app.flipH();
                else if (v === 'flipV') this.app.flipV();
                else this.app.rotate(parseInt(v));
                break;
            }
            case 'colorDlg':
                this.app.colorPickerConfirm();
                break;
        }
    }

    openDialog(id) {
        PaintUtils.el('dialogOverlay').style.display = 'flex';
        PaintUtils.el(id).style.display = 'block';
        if (id === 'resizeDialog') {
            PaintUtils.el('resizeW').value = this.app.mainCanvas.width;
            PaintUtils.el('resizeH').value = this.app.mainCanvas.height;
        }
    }

    _closeDialog(id) {
        if (id) PaintUtils.el(id).style.display = 'none';
        PaintUtils.el('dialogOverlay').style.display = 'none';
    }

    _handleAction(action) {
        switch (action) {
            case 'undo': this.app.undo(); break;
            case 'redo': this.app.redo(); break;
            case 'cut': this.app.cut(); break;
            case 'copy': this.app.copy(); break;
            case 'paste': this.app.paste(); break;
            case 'selectAll': this.app.selection.selectAll(); break;
            case 'clearSelection': this.app.selection.deleteSelection(); break;
            case 'zoomIn': this.app.zoomIn(); break;
            case 'zoomOut': this.app.zoomOut(); break;
            case 'zoomReset': this.app.setZoom(100); break;
            case 'resize': this.openDialog('resizeDialog'); break;
            case 'rotate': this.openDialog('rotateDialog'); break;
            case 'select': this.app.setTool('rectSelect'); break;
        }
    }

    // ---- Color Picker ----
    _setupColorPicker() {
        this.cpHue = 0; this.cpSat = 0; this.cpLum = 120;
        this.cpDraggingHS = false; this.cpDraggingLum = false;
        this._cpLastLum = -1;
        this._cpHsData = null;

        const hsCanvas = PaintUtils.el('hueSatCanvas');
        const lumCanvas = PaintUtils.el('lumCanvas');

        if (hsCanvas) {
            hsCanvas.addEventListener('mousedown', (e) => { this.cpDraggingHS = true; this._cpUpdateHS(e); });
        }
        if (lumCanvas) {
            lumCanvas.addEventListener('mousedown', (e) => { this.cpDraggingLum = true; this._cpUpdateLum(e); });
        }

        document.addEventListener('mousemove', (e) => {
            if (this.cpDraggingHS) this._cpUpdateHS(e);
            if (this.cpDraggingLum) this._cpUpdateLum(e);
        });

        document.addEventListener('mouseup', () => { this.cpDraggingHS = false; this.cpDraggingLum = false; });

        // Basic color grid
        const basicGrid = PaintUtils.el('cdlBasic');
        if (basicGrid) {
            const colors = [
                '#FFFFFF','#C0C0C0','#808080','#000000','#FF0000','#800000','#FFFF00','#808000',
                '#00FF00','#008000','#00FFFF','#008080','#0000FF','#000080','#FF00FF','#800080',
                '#FF8080','#804000','#FFFF80','#00FF80','#80FF80','#00FF40','#80FFFF','#0080FF',
                '#8080FF','#FF0080','#FF80FF','#FF8000','#004080','#8040FF','#FF8040','#40FF80'
            ];
            basicGrid.innerHTML = '';
            colors.forEach(c => {
                const cell = document.createElement('div');
                cell.className = 'cb-cell';
                cell.style.background = c;
                cell.addEventListener('click', () => { this._cpSetHex(c); });
                basicGrid.appendChild(cell);
            });
        }

        // HSL/RGB inputs
        ['cH','cS','cL'].forEach(id => {
            const el = PaintUtils.el(id);
            if (el) el.addEventListener('change', () => {
                this.cpHue = parseInt(PaintUtils.el('cH').value) || 0;
                this.cpSat = parseInt(PaintUtils.el('cS').value) || 0;
                this.cpLum = parseInt(PaintUtils.el('cL').value) || 0;
                this._cpRedrawLum();
                this._cpUpdatePreview();
            });
        });

        ['cR','cG','cB'].forEach(id => {
            const el = PaintUtils.el(id);
            if (el) el.addEventListener('change', () => {
                const r = parseInt(PaintUtils.el('cR').value) || 0;
                const g = parseInt(PaintUtils.el('cG').value) || 0;
                const b = parseInt(PaintUtils.el('cB').value) || 0;
                const hsl = PaintUtils.rgbToHsl(r, g, b);
                this.cpHue = hsl.h; this.cpSat = hsl.s; this.cpLum = hsl.l;
                this._cpRedrawLum();
                this._cpUpdatePreview();
            });
        });

        // Edit color button
        const editBtn = PaintUtils.el('colorEditBtn');
        if (editBtn) editBtn.addEventListener('click', () => {
            this._cpSetHex(this.app.fgColor);
            this.openDialog('colorDlg');
        });
    }

    _cpSetHex(hex) {
        const rgb = PaintUtils.hexToRgba(hex);
        const hsl = PaintUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
        this.cpHue = hsl.h; this.cpSat = hsl.s; this.cpLum = hsl.l;
        this._cpLastLum = -1;
        this._cpRedrawHS();
        this._cpRedrawLum();
        this._cpUpdatePreview();
    }

    _cpRedrawHS() {
        const canvas = PaintUtils.el('hueSatCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;

        if (this._cpLastLum === this.cpLum && this._cpHsData) {
            ctx.putImageData(this._cpHsData, 0, 0);
            return;
        }
        this._cpLastLum = this.cpLum;

        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        for (let y = 0; y < h; y++) {
            const sat = (y / h) * 240;
            const rowOff = y * w * 4;
            for (let x = 0; x < w; x++) {
                const hue = (x / w) * 360;
                const rgb = PaintUtils.hslToRgb(hue, sat, this.cpLum);
                const idx = rowOff + x * 4;
                data[idx] = rgb.r; data[idx + 1] = rgb.g; data[idx + 2] = rgb.b; data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        this._cpHsData = imageData;
    }

    _cpRedrawLum() {
        const canvas = PaintUtils.el('lumCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        for (let y = 0; y < h; y++) {
            const lum = (y / h) * 240;
            const rgb = PaintUtils.hslToRgb(this.cpHue, this.cpSat, lum);
            const rowOff = y * w * 4;
            for (let x = 0; x < w; x++) {
                const idx = rowOff + x * 4;
                data[idx] = rgb.r; data[idx + 1] = rgb.g; data[idx + 2] = rgb.b; data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    _cpUpdateHS(e) {
        const canvas = PaintUtils.el('hueSatCanvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        this.cpHue = PaintUtils.clamp(e.clientX - rect.left, 0, rect.width - 1) / rect.width * 360;
        this.cpSat = PaintUtils.clamp(e.clientY - rect.top, 0, rect.height - 1) / rect.height * 240;
        this._cpRedrawLum();
        this._cpUpdatePreview();
        const cursor = PaintUtils.el('hsCursor');
        if (cursor) {
            cursor.style.left = (this.cpHue / 360 * 200) + 'px';
            cursor.style.top = (this.cpSat / 240 * 200) + 'px';
        }
    }

    _cpUpdateLum(e) {
        const canvas = PaintUtils.el('lumCanvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        this.cpLum = PaintUtils.clamp(e.clientY - rect.top, 0, rect.height - 1) / rect.height * 240;
        this._cpRedrawLum();
        this._cpUpdatePreview();
        const cursor = PaintUtils.el('lumCursor');
        if (cursor) cursor.style.top = (this.cpLum / 240 * 200) + 'px';
    }

    _cpUpdatePreview() {
        const rgb = PaintUtils.hslToRgb(this.cpHue, this.cpSat, this.cpLum);
        const hex = PaintUtils.rgbaToHex(rgb.r, rgb.g, rgb.b);
        const preview = PaintUtils.el('cdlPreview');
        if (preview) preview.style.background = hex;

        const hsCursor = PaintUtils.el('hsCursor');
        const lumCursor = PaintUtils.el('lumCursor');
        if (hsCursor) {
            hsCursor.style.left = (this.cpHue / 360 * 200) + 'px';
            hsCursor.style.top = (this.cpSat / 240 * 200) + 'px';
        }
        if (lumCursor) lumCursor.style.top = (this.cpLum / 240 * 200) + 'px';

        PaintUtils.el('cH').value = Math.round(this.cpHue);
        PaintUtils.el('cS').value = Math.round(this.cpSat);
        PaintUtils.el('cL').value = Math.round(this.cpLum);
        PaintUtils.el('cR').value = rgb.r;
        PaintUtils.el('cG').value = rgb.g;
        PaintUtils.el('cB').value = rgb.b;
    }

    cpConfirmColor() {
        const rgb = PaintUtils.hslToRgb(this.cpHue, this.cpSat, this.cpLum);
        this.app.fgColor = PaintUtils.rgbaToHex(rgb.r, rgb.g, rgb.b);
        this.app.updateColors();
    }
}
