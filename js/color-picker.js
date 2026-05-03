// color-picker.js - Color picker dialog

class ColorPickerDialog {
    constructor(app) {
        this.app = app;
        this.targetIsBg = false;
        this.currentHue = 0;
        this.currentSat = 0;
        this.currentLum = 120; // 0-240 range (MS Paint uses 0-240)
        this.currentColor = '#000000';
        this.customColors = new Array(16).fill('#FFFFFF');
        this.customVisible = false;

        this.hueSatCanvas = document.getElementById('cpHueSatCanvas');
        this.lumCanvas = document.getElementById('cpLumCanvas');
        this.hueSatCtx = this.hueSatCanvas.getContext('2d');
        this.lumCtx = this.lumCanvas.getContext('2d');

        this.isDraggingHueSat = false;
        this.isDraggingLum = false;

        this.setupEvents();
        this.buildBasicColors();
    }

    show(targetIsBg) {
        this.targetIsBg = targetIsBg;
        const currentColor = targetIsBg ? this.app.bgColor : this.app.fgColor;
        this.setColorFromHex(currentColor);
        this.drawHueSat();
        this.drawLuminance();
        this.updatePreview();
        this.updateInputs();

        document.getElementById('dialogOverlay').style.display = 'flex';
        document.getElementById('colorPickerDialog').style.display = 'block';
    }

    hide() {
        document.getElementById('dialogOverlay').style.display = 'none';
        document.getElementById('colorPickerDialog').style.display = 'none';
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
        const ctx = this.hueSatCtx;
        const w = this.hueSatCanvas.width;
        const h = this.hueSatCanvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const hue = (x / w) * 360;
                const sat = (y / h) * 240;
                const rgb = PaintUtils.hslToRgb(hue, sat, this.currentLum);
                const idx = (y * w + x) * 4;
                data[idx] = rgb.r;
                data[idx + 1] = rgb.g;
                data[idx + 2] = rgb.b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    drawLuminance() {
        const ctx = this.lumCtx;
        const w = this.lumCanvas.width;
        const h = this.lumCanvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;

        for (let y = 0; y < h; y++) {
            const lum = (y / h) * 240;
            const rgb = PaintUtils.hslToRgb(this.currentHue, this.currentSat, lum);
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
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
        document.getElementById('cpPreviewColor').style.background = this.currentColor;

        // Update cursor positions
        const hsCursor = document.getElementById('cpHueSatCursor');
        const lumCursor = document.getElementById('cpLumCursor');
        hsCursor.style.left = (this.currentHue / 360 * 180) + 'px';
        hsCursor.style.top = (this.currentSat / 240 * 160) + 'px';
        lumCursor.style.top = (this.currentLum / 240 * 160) + 'px';
    }

    updateInputs() {
        const rgb = PaintUtils.hslToRgb(this.currentHue, this.currentSat, this.currentLum);
        document.getElementById('cpH').value = Math.round(this.currentHue);
        document.getElementById('cpS').value = Math.round(this.currentSat);
        document.getElementById('cpL').value = Math.round(this.currentLum);
        document.getElementById('cpR').value = rgb.r;
        document.getElementById('cpG').value = rgb.g;
        document.getElementById('cpB').value = rgb.b;
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

        const grid = document.getElementById('cpBasicGrid');
        grid.innerHTML = '';
        basicColors.forEach(color => {
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
        });
    }

    setupEvents() {
        // Hue/Saturation picker
        this.hueSatCanvas.addEventListener('mousedown', (e) => {
            this.isDraggingHueSat = true;
            this.updateHueSatFromMouse(e);
        });

        // Luminance picker
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

        // HSL/RGB input changes
        ['cpH', 'cpS', 'cpL'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.currentHue = parseInt(document.getElementById('cpH').value) || 0;
                this.currentSat = parseInt(document.getElementById('cpS').value) || 0;
                this.currentLum = parseInt(document.getElementById('cpL').value) || 0;
                this.drawHueSat();
                this.drawLuminance();
                this.updatePreview();
                this.updateInputs();
            });
        });

        ['cpR', 'cpG', 'cpB'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const r = parseInt(document.getElementById('cpR').value) || 0;
                const g = parseInt(document.getElementById('cpG').value) || 0;
                const b = parseInt(document.getElementById('cpB').value) || 0;
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

        // Custom colors toggle
        document.getElementById('cpCustomToggle').addEventListener('click', () => {
            this.customVisible = !this.customVisible;
            document.getElementById('cpCustomToggle').textContent =
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
        this.updatePreview();
        this.updateInputs();
    }

    confirm() {
        if (this.targetIsBg) {
            this.app.bgColor = this.currentColor;
        } else {
            this.app.fgColor = this.currentColor;
        }
        this.app.updateColorDisplay();
        this.hide();
    }

    cancel() {
        this.hide();
    }
}
