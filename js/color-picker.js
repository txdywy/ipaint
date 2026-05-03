// color-picker.js - Color picker dialog (optimized - cached gradients)

class ColorPickerDialog {
    constructor(app) {
        this.app = app;
        this.targetIsBg = false;
        this.currentHue = 0;
        this.currentSat = 0;
        this.currentLum = 120;
        this.currentColor = '#000000';
        this.customColors = new Array(16).fill('#FFFFFF');
        this.customVisible = false;

        this.hueSatCanvas = PaintUtils.el('cpHueSatCanvas');
        this.lumCanvas = PaintUtils.el('cpLumCanvas');
        this.hueSatCtx = this.hueSatCanvas.getContext('2d');
        this.lumCtx = this.lumCanvas.getContext('2d');

        // Cached gradient: only redraw when luminance changes
        this._lastLum = -1;
        this._hsImageData = null;

        this.isDraggingHueSat = false;
        this.isDraggingLum = false;

        this.setupEvents();
        this.buildBasicColors();
    }

    show(targetIsBg) {
        this.targetIsBg = targetIsBg;
        this.setColorFromHex(targetIsBg ? this.app.bgColor : this.app.fgColor);
        this._lastLum = -1; // force full redraw
        this.drawHueSat();
        this.drawLuminance();
        this.updatePreview();
        this.updateInputs();

        PaintUtils.el('dialogOverlay').style.display = 'flex';
        PaintUtils.el('colorPickerDialog').style.display = 'block';
    }

    hide() {
        PaintUtils.el('dialogOverlay').style.display = 'none';
        PaintUtils.el('colorPickerDialog').style.display = 'none';
    }

    setColorFromHex(hex) {
        const rgb = PaintUtils.hexToRgba(hex);
        const hsl = PaintUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
        this.currentHue = hsl.h;
        this.currentSat = hsl.s;
        this.currentLum = hsl.l;
        this.currentColor = hex;
    }

    drawHueSat() {
        // Only redraw if luminance changed
        if (this._lastLum === this.currentLum && this._hsImageData) {
            this.hueSatCtx.putImageData(this._hsImageData, 0, 0);
            return;
        }
        this._lastLum = this.currentLum;

        const ctx = this.hueSatCtx;
        const w = this.hueSatCanvas.width;
        const h = this.hueSatCanvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;

        // Pre-compute hue row offsets for speed
        const lum = this.currentLum;
        for (let y = 0; y < h; y++) {
            const sat = (y / h) * 240;
            const rowOff = y * w * 4;
            for (let x = 0; x < w; x++) {
                const hue = (x / w) * 360;
                const rgb = PaintUtils.hslToRgb(hue, sat, lum);
                const idx = rowOff + x * 4;
                data[idx] = rgb.r;
                data[idx + 1] = rgb.g;
                data[idx + 2] = rgb.b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        this._hsImageData = imageData;
    }

    drawLuminance() {
        const ctx = this.lumCtx;
        const w = this.lumCanvas.width;
        const h = this.lumCanvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        const hue = this.currentHue;
        const sat = this.currentSat;

        for (let y = 0; y < h; y++) {
            const lum = (y / h) * 240;
            const rgb = PaintUtils.hslToRgb(hue, sat, lum);
            const rowOff = y * w * 4;
            for (let x = 0; x < w; x++) {
                const idx = rowOff + x * 4;
                data[idx] = rgb.r;
                data[idx + 1] = rgb.g;
                data[idx + 2] = rgb.b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    updatePreview() {
        const rgb = PaintUtils.hslToRgb(this.currentHue, this.currentSat, this.currentLum);
        this.currentColor = PaintUtils.rgbaToHex(rgb.r, rgb.g, rgb.b);
        PaintUtils.el('cpPreviewColor').style.background = this.currentColor;

        PaintUtils.el('cpHueSatCursor').style.left = (this.currentHue / 360 * 180) + 'px';
        PaintUtils.el('cpHueSatCursor').style.top = (this.currentSat / 240 * 160) + 'px';
        PaintUtils.el('cpLumCursor').style.top = (this.currentLum / 240 * 160) + 'px';
    }

    updateInputs() {
        const rgb = PaintUtils.hslToRgb(this.currentHue, this.currentSat, this.currentLum);
        PaintUtils.el('cpH').value = Math.round(this.currentHue);
        PaintUtils.el('cpS').value = Math.round(this.currentSat);
        PaintUtils.el('cpL').value = Math.round(this.currentLum);
        PaintUtils.el('cpR').value = rgb.r;
        PaintUtils.el('cpG').value = rgb.g;
        PaintUtils.el('cpB').value = rgb.b;
    }

    buildBasicColors() {
        const basicColors = [
            '#FFFFFF', '#C0C0C0', '#808080', '#000000',
            '#FF0000', '#800000', '#FFFF00', '#808000',
            '#00FF00', '#008000', '#00FFFF', '#008080',
            '#0000FF', '#000080', '#FF00FF', '#800080',
            '#FF8080', '#804000', '#FFFF80', '#00FF80',
            '#80FF80', '#00FF40', '#80FFFF', '#0080FF',
            '#8080FF', '#FF0080', '#FF80FF', '#FF8000',
            '#004080', '#8040FF', '#FF8040', '#40FF80'
        ];

        const grid = PaintUtils.el('cpBasicGrid');
        grid.innerHTML = '';
        for (let i = 0; i < basicColors.length; i++) {
            const color = basicColors[i];
            const cell = document.createElement('div');
            cell.className = 'cp-basic-cell';
            cell.style.background = color;
            cell.dataset.color = color;
            cell.addEventListener('click', () => {
                this.setColorFromHex(color);
                this.drawHueSat();
                this.drawLuminance();
                this.updatePreview();
                this.updateInputs();
            });
            grid.appendChild(cell);
        }
    }

    setupEvents() {
        this.hueSatCanvas.addEventListener('mousedown', (e) => {
            this.isDraggingHueSat = true;
            this.updateHueSatFromMouse(e);
        });

        this.lumCanvas.addEventListener('mousedown', (e) => {
            this.isDraggingLum = true;
            this.updateLumFromMouse(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingHueSat) this.updateHueSatFromMouse(e);
            if (this.isDraggingLum) this.updateLumFromMouse(e);
        });

        document.addEventListener('mouseup', () => {
            this.isDraggingHueSat = false;
            this.isDraggingLum = false;
        });

        ['cpH', 'cpS', 'cpL'].forEach(id => {
            PaintUtils.el(id).addEventListener('change', () => {
                this.currentHue = parseInt(PaintUtils.el('cpH').value) || 0;
                this.currentSat = parseInt(PaintUtils.el('cpS').value) || 0;
                this.currentLum = parseInt(PaintUtils.el('cpL').value) || 0;
                this.drawHueSat();
                this.drawLuminance();
                this.updatePreview();
                this.updateInputs();
            });
        });

        ['cpR', 'cpG', 'cpB'].forEach(id => {
            PaintUtils.el(id).addEventListener('change', () => {
                const r = parseInt(PaintUtils.el('cpR').value) || 0;
                const g = parseInt(PaintUtils.el('cpG').value) || 0;
                const b = parseInt(PaintUtils.el('cpB').value) || 0;
                const hsl = PaintUtils.rgbToHsl(r, g, b);
                this.currentHue = hsl.h;
                this.currentSat = hsl.s;
                this.currentLum = hsl.l;
                this.drawHueSat();
                this.drawLuminance();
                this.updatePreview();
                this.updateInputs();
            });
        });

        PaintUtils.el('cpCustomToggle').addEventListener('click', () => {
            this.customVisible = !this.customVisible;
            PaintUtils.el('cpCustomToggle').textContent =
                this.customVisible ? '<< Define Custom Colors' : 'Define Custom Colors >>';
        });
    }

    updateHueSatFromMouse(e) {
        const rect = this.hueSatCanvas.getBoundingClientRect();
        const x = PaintUtils.clamp(e.clientX - rect.left, 0, rect.width - 1);
        const y = PaintUtils.clamp(e.clientY - rect.top, 0, rect.height - 1);
        this.currentHue = (x / rect.width) * 360;
        this.currentSat = (y / rect.height) * 240;
        this.drawLuminance();
        this.updatePreview();
        this.updateInputs();
    }

    updateLumFromMouse(e) {
        const rect = this.lumCanvas.getBoundingClientRect();
        const y = PaintUtils.clamp(e.clientY - rect.top, 0, rect.height - 1);
        this.currentLum = (y / rect.height) * 240;
        this.drawLuminance();
        this.updatePreview();
        this.updateInputs();
    }

    confirm() {
        if (this.targetIsBg) this.app.bgColor = this.currentColor;
        else this.app.fgColor = this.currentColor;
        this.app.updateColorDisplay();
        this.hide();
    }

    cancel() {
        this.hide();
    }
}
