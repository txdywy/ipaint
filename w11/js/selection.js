// selection.js - Selection tools (W11, optimized)

class SelectionEngine {
    constructor(app) {
        this.app = app;
        this.selecting = false;
        this.hasSelection = false;
        this.selectionRect = null;
        this.selectionData = null;
        this.startX = 0;
        this.startY = 0;
        this.moving = false;
        this.moveOX = 0;
        this.moveOY = 0;
        this._tempCanvas = null;
    }

    onMouseDown(x, y, button) {
        const tool = this.app.currentTool;
        if (tool !== 'rectSelect' && tool !== 'select') return;

        if (this.hasSelection && this._inside(x, y)) {
            this.app.history.saveState();
            this.moving = true;
            this.moveOX = x - this.selectionRect.x;
            this.moveOY = y - this.selectionRect.y;
            return;
        }

        if (this.hasSelection) this.commit();
        this.selecting = true;
        this.startX = x;
        this.startY = y;
        this.selectionRect = { x, y, w: 0, h: 0 };
    }

    onMouseMove(x, y) {
        if (this.moving) {
            this.selectionRect.x = x - this.moveOX;
            this.selectionRect.y = y - this.moveOY;
            this._updateVisual();
            return;
        }
        if (!this.selecting) return;

        const overlay = this.app.overlayCtx;
        const ow = this.app.overlayCanvas.width;
        const oh = this.app.overlayCanvas.height;
        overlay.clearRect(0, 0, ow, oh);

        const rx = Math.min(this.startX, x), ry = Math.min(this.startY, y);
        const rw = Math.abs(x - this.startX), rh = Math.abs(y - this.startY);
        this.selectionRect = { x: rx, y: ry, w: rw, h: rh };

        overlay.setLineDash([4, 4]);
        overlay.strokeStyle = '#005fb8';
        overlay.lineWidth = 1;
        overlay.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
        overlay.lineDashOffset = 4;
        overlay.strokeStyle = '#fff';
        overlay.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
        overlay.setLineDash([]);
        overlay.lineDashOffset = 0;
    }

    onMouseUp() {
        if (this.moving) {
            this.moving = false;
            this.app.isDirty = true;
            return;
        }
        if (!this.selecting) return;
        this.selecting = false;

        const r = this.selectionRect;
        if (r.w < 2 || r.h < 2) { this.resetState(); return; }

        this._extract();
        this.hasSelection = true;
        this._updateVisual();
    }

    _extract() {
        const r = this.selectionRect;
        if (r.w <= 0 || r.h <= 0) return;
        this.selectionData = this.app.mainCtx.getImageData(r.x, r.y, r.w, r.h);
        this.app.mainCtx.fillStyle = this.app.bgColor;
        this.app.mainCtx.fillRect(r.x, r.y, r.w, r.h);
        this._tempCanvas = null;
    }

    commit() {
        if (!this.hasSelection || !this.selectionData) return;
        this.app.mainCtx.drawImage(this._getTemp(), this.selectionRect.x, this.selectionRect.y);
        this.resetState();
    }

    clearSelection() {
        if (this.hasSelection && this.selectionData) { this.commit(); return; }
        this.resetState();
    }

    resetState() {
        this.hasSelection = false;
        this.selectionData = null;
        this.selectionRect = null;
        this._tempCanvas = null;
        PaintUtils.el('selectionBox').style.display = 'none';
        this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
    }

    _getTemp() {
        if (this._tempCanvas) return this._tempCanvas;
        const tc = document.createElement('canvas');
        tc.width = this.selectionData.width;
        tc.height = this.selectionData.height;
        tc.getContext('2d').putImageData(this.selectionData, 0, 0);
        this._tempCanvas = tc;
        return tc;
    }

    _updateVisual() {
        if (!this.hasSelection || !this.selectionRect) return;
        const r = this.selectionRect;
        const box = PaintUtils.el('selectionBox');
        box.style.display = 'block';
        box.style.left = r.x + 'px';
        box.style.top = r.y + 'px';
        box.style.width = r.w + 'px';
        box.style.height = r.h + 'px';

        const overlay = this.app.overlayCtx;
        overlay.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
        if (this.selectionData) overlay.drawImage(this._getTemp(), r.x, r.y);
    }

    _inside(x, y) {
        if (!this.selectionRect) return false;
        const r = this.selectionRect;
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    selectAll() {
        const c = this.app.mainCanvas;
        this.selectionRect = { x: 0, y: 0, w: c.width, h: c.height };
        this._extract();
        this.hasSelection = true;
        this._updateVisual();
    }

    deleteSelection() {
        if (!this.hasSelection) return;
        this.app.history.saveState();
        const r = this.selectionRect;
        this.app.mainCtx.fillStyle = this.app.bgColor;
        this.app.mainCtx.fillRect(r.x, r.y, r.w, r.h);
        this.app.isDirty = true;
        this.resetState();
    }

    copySelection() {
        if (!this.hasSelection || !this.selectionData) return null;
        return this._getTemp();
    }
}
