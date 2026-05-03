// selection.js - Selection tools (optimized)

class SelectionTools {
    constructor(app) {
        this.app = app;
        this.selecting = false;
        this.hasSelection = false;
        this.selectionRect = null;
        this.selectionData = null;
        this.startX = 0;
        this.startY = 0;
        this.movingSelection = false;
        this.moveOffsetX = 0;
        this.moveOffsetY = 0;
        this.selectionType = 'rect';
        this.freeSelectPoints = [];
        this._tempCanvas = null; // cached for visual updates
    }

    onMouseDown(x, y, button) {
        const tool = this.app.toolManager.getTool();

        if (tool === 'rectSelect' || tool === 'freeSelect') {
            if (this.hasSelection && this.isInsideSelection(x, y)) {
                // Save state before moving so undo restores original position
                this.app.history.saveState();
                this.movingSelection = true;
                this.moveOffsetX = x - this.selectionRect.x;
                this.moveOffsetY = y - this.selectionRect.y;
                return;
            }

            if (this.hasSelection) {
                this.commitSelection();
            }

            this.selecting = true;
            this.selectionType = tool === 'rectSelect' ? 'rect' : 'free';
            this.startX = x;
            this.startY = y;

            if (tool === 'rectSelect') {
                this.selectionRect = { x, y, w: 0, h: 0 };
            } else {
                this.freeSelectPoints = [{ x, y }];
            }
        }
    }

    onMouseMove(x, y) {
        if (this.movingSelection) {
            this.selectionRect.x = x - this.moveOffsetX;
            this.selectionRect.y = y - this.moveOffsetY;
            this._updateVisual();
            return;
        }

        if (!this.selecting) return;

        const overlay = this.app.overlayCtx;
        const ow = this.app.overlayCanvas.width;
        const oh = this.app.overlayCanvas.height;
        overlay.clearRect(0, 0, ow, oh);

        if (this.selectionType === 'rect') {
            const rx = Math.min(this.startX, x);
            const ry = Math.min(this.startY, y);
            const rw = Math.abs(x - this.startX);
            const rh = Math.abs(y - this.startY);
            this.selectionRect = { x: rx, y: ry, w: rw, h: rh };

            overlay.setLineDash([4, 4]);
            overlay.strokeStyle = '#000';
            overlay.lineWidth = 1;
            overlay.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
            overlay.lineDashOffset = 4;
            overlay.strokeStyle = '#fff';
            overlay.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
            overlay.setLineDash([]);
            overlay.lineDashOffset = 0;
        } else {
            this.freeSelectPoints.push({ x, y });
            overlay.setLineDash([4, 4]);
            overlay.strokeStyle = '#000';
            overlay.lineWidth = 1;
            overlay.beginPath();
            overlay.moveTo(this.freeSelectPoints[0].x, this.freeSelectPoints[0].y);
            for (let i = 1; i < this.freeSelectPoints.length; i++) {
                overlay.lineTo(this.freeSelectPoints[i].x, this.freeSelectPoints[i].y);
            }
            overlay.stroke();
            overlay.setLineDash([]);
        }
    }

    onMouseUp(x, y) {
        if (this.movingSelection) {
            this.movingSelection = false;
            this.app.isDirty = true;
            return;
        }

        if (!this.selecting) return;
        this.selecting = false;

        if (this.selectionType === 'rect') {
            if (this.selectionRect.w < 2 || this.selectionRect.h < 2) {
                this.resetSelectionState();
                return;
            }
        } else {
            if (this.freeSelectPoints.length < 3) {
                this.resetSelectionState();
                return;
            }
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of this.freeSelectPoints) {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            }
            this.selectionRect = {
                x: minX | 0, y: minY | 0,
                w: (maxX - minX + 1) | 0, h: (maxY - minY + 1) | 0
            };
        }

        this._extract();
        this.hasSelection = true;
        this._updateVisual();
    }

    _extract() {
        const r = this.selectionRect;
        if (r.w <= 0 || r.h <= 0) return;
        const ctx = this.app.mainCtx;
        this.selectionData = ctx.getImageData(r.x, r.y, r.w, r.h);
        ctx.fillStyle = this.app.bgColor;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        this._tempCanvas = null; // invalidate cache
    }

    commitSelection() {
        if (!this.hasSelection || !this.selectionData) return;
        const ctx = this.app.mainCtx;
        const r = this.selectionRect;
        const tc = this._getTempCanvas();
        ctx.drawImage(tc, r.x, r.y);
        this.resetSelectionState();
    }

    clearSelection() {
        if (this.hasSelection && this.selectionData) {
            this.commitSelection();
            return;
        }
        this.resetSelectionState();
    }

    resetSelectionState() {
        this.hasSelection = false;
        this.selectionData = null;
        this.selectionRect = null;
        this.freeSelectPoints = [];
        this._tempCanvas = null;
        PaintUtils.el('selectionBox').style.display = 'none';
        this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
    }

    _getTempCanvas() {
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
        if (this.selectionData) {
            overlay.drawImage(this._getTempCanvas(), r.x, r.y);
        }
    }

    isInsideSelection(x, y) {
        if (!this.selectionRect) return false;
        const r = this.selectionRect;
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    selectAll() {
        const canvas = this.app.mainCanvas;
        this.selectionRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        this._extract();
        this.hasSelection = true;
        this._updateVisual();
    }

    deleteSelection() {
        if (!this.hasSelection) return;
        this.app.history.saveState();
        const ctx = this.app.mainCtx;
        const r = this.selectionRect;
        ctx.fillStyle = this.app.bgColor;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        this.app.isDirty = true;
        this.resetSelectionState();
    }

    copySelection() {
        if (!this.hasSelection || !this.selectionData) return null;
        return this._getTempCanvas();
    }
}
