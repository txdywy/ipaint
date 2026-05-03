// selection.js - Selection tools

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
        this.selectionType = 'rect'; // 'rect' or 'free'
        this.freeSelectPoints = [];
    }

    onMouseDown(x, y, button) {
        const tool = this.app.toolManager.getTool();

        if (tool === 'rectSelect') {
            // If clicking inside existing selection, start moving
            if (this.hasSelection && this.isInsideSelection(x, y)) {
                this.movingSelection = true;
                this.moveOffsetX = x - this.selectionRect.x;
                this.moveOffsetY = y - this.selectionRect.y;
                return;
            }

            // If we have a selection, commit it first
            if (this.hasSelection) {
                this.commitSelection();
            }

            this.selecting = true;
            this.selectionType = 'rect';
            this.startX = x;
            this.startY = y;
            this.selectionRect = { x, y, w: 0, h: 0 };
        } else if (tool === 'freeSelect') {
            if (this.hasSelection && this.isInsideSelection(x, y)) {
                this.movingSelection = true;
                this.moveOffsetX = x - this.selectionRect.x;
                this.moveOffsetY = y - this.selectionRect.y;
                return;
            }

            if (this.hasSelection) {
                this.commitSelection();
            }

            this.selecting = true;
            this.selectionType = 'free';
            this.freeSelectPoints = [{ x, y }];
            this.startX = x;
            this.startY = y;
        }
    }

    onMouseMove(x, y) {
        if (this.movingSelection) {
            const newX = x - this.moveOffsetX;
            const newY = y - this.moveOffsetY;
            this.selectionRect.x = newX;
            this.selectionRect.y = newY;
            this.updateSelectionVisual();
            return;
        }

        if (!this.selecting) return;

        const overlay = this.app.overlayCtx;
        overlay.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);

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
            overlay.setLineDash([4, 4]);
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
            return;
        }

        if (!this.selecting) return;
        this.selecting = false;

        if (this.selectionType === 'rect') {
            if (this.selectionRect.w < 2 || this.selectionRect.h < 2) {
                this.clearSelection();
                return;
            }
        } else {
            // Free select - calculate bounding rect
            if (this.freeSelectPoints.length < 3) {
                this.clearSelection();
                return;
            }
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of this.freeSelectPoints) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            this.selectionRect = {
                x: Math.floor(minX),
                y: Math.floor(minY),
                w: Math.ceil(maxX - minX),
                h: Math.ceil(maxY - minY)
            };
        }

        // Extract selection data
        this.extractSelection();
        this.hasSelection = true;
        this.updateSelectionVisual();
    }

    extractSelection() {
        const r = this.selectionRect;
        if (r.w <= 0 || r.h <= 0) return;

        const ctx = this.app.mainCtx;
        this.selectionData = ctx.getImageData(r.x, r.y, r.w, r.h);

        // Clear the selected area on main canvas (fill with bg color)
        ctx.fillStyle = this.app.bgColor;
        ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    commitSelection() {
        if (!this.hasSelection || !this.selectionData) return;

        const ctx = this.app.mainCtx;
        const r = this.selectionRect;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.selectionData.width;
        tempCanvas.height = this.selectionData.height;
        tempCanvas.getContext('2d').putImageData(this.selectionData, 0, 0);
        ctx.drawImage(tempCanvas, r.x, r.y);
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
        document.getElementById('selectionBox').style.display = 'none';
        this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
    }

    updateSelectionVisual() {
        if (!this.hasSelection || !this.selectionRect) return;
        const r = this.selectionRect;
        const selectionBox = document.getElementById('selectionBox');
        const container = document.getElementById('canvasContainer');

        selectionBox.style.display = 'block';
        selectionBox.style.left = r.x + 'px';
        selectionBox.style.top = r.y + 'px';
        selectionBox.style.width = r.w + 'px';
        selectionBox.style.height = r.h + 'px';

        // Draw selection on overlay
        const overlay = this.app.overlayCtx;
        overlay.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);

        if (this.selectionData) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.selectionData.width;
            tempCanvas.height = this.selectionData.height;
            tempCanvas.getContext('2d').putImageData(this.selectionData, 0, 0);
            overlay.drawImage(tempCanvas, r.x, r.y);
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
        this.extractSelection();
        this.hasSelection = true;
        this.updateSelectionVisual();
    }

    deleteSelection() {
        if (!this.hasSelection) return;
        this.app.history.saveState();
        const ctx = this.app.mainCtx;
        const r = this.selectionRect;
        ctx.fillStyle = this.app.bgColor;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        this.clearSelection();
    }

    copySelection() {
        if (!this.hasSelection || !this.selectionData) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.selectionData.width;
        tempCanvas.height = this.selectionData.height;
        tempCanvas.getContext('2d').putImageData(this.selectionData, 0, 0);
        return tempCanvas;
    }
}
