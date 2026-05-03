// shapes.js - Shape tools: line, curve, rectangle, ellipse, polygon, round rect

class ShapeTools {
    constructor(app) {
        this.app = app;
        this.drawing = false;
        this.startX = 0;
        this.startY = 0;
        this.curvePoints = [];
        this.curveClicks = 0;
        this.polygonPoints = [];
        this.polygonStarted = false;
        this.shiftHeld = false;
    }

    onMouseDown(x, y, button) {
        const tool = this.app.toolManager.getTool();
        const fgColor = button === 2 ? this.app.bgColor : this.app.fgColor;
        const bgColor = button === 2 ? this.app.fgColor : this.app.bgColor;
        this.shiftHeld = this.app.shiftKey;

        switch (tool) {
            case 'line':
                if (!this.drawing) {
                    this.app.history.saveState();
                    this.drawing = true;
                    this.startX = x;
                    this.startY = y;
                }
                break;

            case 'curve':
                if (this.curveClicks === 0) {
                    this.app.history.saveState();
                    this.drawing = true;
                    this.startX = x;
                    this.startY = y;
                    this.curvePoints = [];
                    this.curveClicks = 1;
                } else if (this.curveClicks === 1) {
                    // End point of curve line
                    this.curveClicks = 2;
                } else if (this.curveClicks === 2) {
                    // First control point
                    this.curvePoints.push({ x, y });
                    this.curveClicks = 3;
                } else if (this.curveClicks === 3) {
                    // Second control point - draw final curve
                    this.curvePoints.push({ x, y });
                    this.drawFinalCurve();
                    this.curveClicks = 0;
                    this.drawing = false;
                }
                break;

            case 'rectangle': case 'ellipse': case 'roundRect':
                if (!this.drawing) {
                    this.app.history.saveState();
                    this.drawing = true;
                    this.startX = x;
                    this.startY = y;
                }
                break;

            case 'polygon':
                if (!this.polygonStarted) {
                    this.app.history.saveState();
                    this.polygonStarted = true;
                    this.polygonPoints = [{ x, y }];
                    this.drawing = true;
                    this.startX = x;
                    this.startY = y;
                } else {
                    // Check if double-click to close polygon
                    if (this.polygonPoints.length > 2) {
                        const first = this.polygonPoints[0];
                        const dist = Math.sqrt((x - first.x) ** 2 + (y - first.y) ** 2);
                        if (dist < 5) {
                            this.drawFinalPolygon();
                            this.polygonStarted = false;
                            this.polygonPoints = [];
                            this.drawing = false;
                            return;
                        }
                    }
                    this.polygonPoints.push({ x, y });
                }
                break;
        }
    }

    onMouseMove(x, y) {
        if (!this.drawing) return;
        const tool = this.app.toolManager.getTool();
        const overlay = this.app.overlayCtx;
        const fgColor = this.app.fgColor;
        const bgColor = this.app.bgColor;
        const lineWidth = this.app.toolManager.lineWidth;
        const fillMode = this.app.toolManager.fillMode;

        // Clear overlay
        overlay.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);

        let adjustedX = x, adjustedY = y;
        if (this.shiftHeld) {
            const dx = x - this.startX;
            const dy = y - this.startY;
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            adjustedX = this.startX + size * Math.sign(dx);
            adjustedY = this.startY + size * Math.sign(dy);
        }

        switch (tool) {
            case 'line':
                overlay.strokeStyle = fgColor;
                overlay.lineWidth = lineWidth;
                overlay.beginPath();
                overlay.moveTo(this.startX, this.startY);
                if (this.shiftHeld) {
                    const snapped = this.snapLine(this.startX, this.startY, x, y);
                    overlay.lineTo(snapped.x, snapped.y);
                } else {
                    overlay.lineTo(x, y);
                }
                overlay.stroke();
                break;

            case 'curve':
                if (this.curveClicks === 1) {
                    // Drawing the base line
                    overlay.strokeStyle = fgColor;
                    overlay.lineWidth = lineWidth;
                    overlay.beginPath();
                    overlay.moveTo(this.startX, this.startY);
                    overlay.lineTo(x, y);
                    overlay.stroke();
                }
                break;

            case 'rectangle':
                this.previewRect(overlay, this.startX, this.startY, adjustedX, adjustedY, fgColor, bgColor, lineWidth, fillMode);
                break;

            case 'ellipse':
                this.previewEllipse(overlay, this.startX, this.startY, adjustedX, adjustedY, fgColor, bgColor, lineWidth, fillMode);
                break;

            case 'roundRect':
                this.previewRoundRect(overlay, this.startX, this.startY, adjustedX, adjustedY, fgColor, bgColor, lineWidth, fillMode);
                break;

            case 'polygon':
                if (this.polygonPoints.length > 0) {
                    overlay.strokeStyle = fgColor;
                    overlay.lineWidth = lineWidth;
                    overlay.beginPath();
                    overlay.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
                    for (let i = 1; i < this.polygonPoints.length; i++) {
                        overlay.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
                    }
                    overlay.lineTo(x, y);
                    overlay.stroke();
                }
                break;
        }
    }

    onMouseUp(x, y, button) {
        const tool = this.app.toolManager.getTool();
        const ctx = this.app.mainCtx;
        const fgColor = button === 2 ? this.app.bgColor : this.app.fgColor;
        const bgColor = button === 2 ? this.app.fgColor : this.app.bgColor;
        const lineWidth = this.app.toolManager.lineWidth;
        const fillMode = this.app.toolManager.fillMode;

        let adjustedX = x, adjustedY = y;
        if (this.shiftHeld) {
            const dx = x - this.startX;
            const dy = y - this.startY;
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            adjustedX = this.startX + size * Math.sign(dx);
            adjustedY = this.startY + size * Math.sign(dy);
        }

        // Clear overlay
        this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);

        switch (tool) {
            case 'line':
                if (this.drawing) {
                    ctx.strokeStyle = fgColor;
                    ctx.lineWidth = lineWidth;
                    ctx.beginPath();
                    ctx.moveTo(this.startX, this.startY);
                    if (this.shiftHeld) {
                        const snapped = this.snapLine(this.startX, this.startY, x, y);
                        ctx.lineTo(snapped.x, snapped.y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    this.drawing = false;
                    this.app.isDirty = true;
                }
                break;

            case 'curve':
                if (this.curveClicks === 1) {
                    // Set end point
                    this.endX = x;
                    this.endY = y;
                    this.curveClicks = 2;
                    // Draw the base line permanently
                    ctx.strokeStyle = fgColor;
                    ctx.lineWidth = lineWidth;
                    ctx.beginPath();
                    ctx.moveTo(this.startX, this.startY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    this.drawing = true; // Still in drawing mode for control points
                }
                break;

            case 'rectangle':
                if (this.drawing) {
                    this.drawRect(ctx, this.startX, this.startY, adjustedX, adjustedY, fgColor, bgColor, lineWidth, fillMode);
                    this.drawing = false;
                    this.app.isDirty = true;
                }
                break;

            case 'ellipse':
                if (this.drawing) {
                    this.drawEllipse(ctx, this.startX, this.startY, adjustedX, adjustedY, fgColor, bgColor, lineWidth, fillMode);
                    this.drawing = false;
                    this.app.isDirty = true;
                }
                break;

            case 'roundRect':
                if (this.drawing) {
                    this.drawRoundRect(ctx, this.startX, this.startY, adjustedX, adjustedY, fgColor, bgColor, lineWidth, fillMode);
                    this.drawing = false;
                    this.app.isDirty = true;
                }
                break;

            case 'polygon':
                // Polygon continues drawing until closed
                break;
        }
    }

    onDoubleClick(x, y) {
        const tool = this.app.toolManager.getTool();
        if (tool === 'polygon' && this.polygonStarted && this.polygonPoints.length > 2) {
            this.drawFinalPolygon();
            this.polygonStarted = false;
            this.polygonPoints = [];
            this.drawing = false;
            this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
        }
    }

    snapLine(x0, y0, x1, y1) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Snap to 0, 45, 90, 135, 180, 225, 270, 315 degrees
        const snapped = Math.round(angle / 45) * 45;
        const rad = snapped * Math.PI / 180;
        return {
            x: Math.round(x0 + len * Math.cos(rad)),
            y: Math.round(y0 + len * Math.sin(rad))
        };
    }

    previewRect(ctx, x1, y1, x2, y2, fgColor, bgColor, lineWidth, fillMode) {
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);

        if (fillMode === 'fillOnly') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, w, h);
        } else if (fillMode === 'outlineFill') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, w, h);
        } else {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, w, h);
        }
    }

    drawRect(ctx, x1, y1, x2, y2, fgColor, bgColor, lineWidth, fillMode) {
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);

        if (w === 0 && h === 0) return;

        if (fillMode === 'fillOnly') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, w, h);
        } else if (fillMode === 'outlineFill') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, w, h);
        } else {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, w, h);
        }
    }

    previewEllipse(ctx, x1, y1, x2, y2, fgColor, bgColor, lineWidth, fillMode) {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;

        if (rx < 1 && ry < 1) return;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

        if (fillMode === 'fillOnly') {
            ctx.fillStyle = bgColor;
            ctx.fill();
        } else if (fillMode === 'outlineFill') {
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    drawEllipse(ctx, x1, y1, x2, y2, fgColor, bgColor, lineWidth, fillMode) {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;

        if (rx < 1 && ry < 1) return;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

        if (fillMode === 'fillOnly') {
            ctx.fillStyle = bgColor;
            ctx.fill();
        } else if (fillMode === 'outlineFill') {
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    previewRoundRect(ctx, x1, y1, x2, y2, fgColor, bgColor, lineWidth, fillMode) {
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        const radius = Math.min(8, w / 4, h / 4);

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.arcTo(x + w, y, x + w, y + radius, radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        ctx.lineTo(x + radius, y + h);
        ctx.arcTo(x, y + h, x, y + h - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();

        if (fillMode === 'fillOnly') {
            ctx.fillStyle = bgColor;
            ctx.fill();
        } else if (fillMode === 'outlineFill') {
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    drawRoundRect(ctx, x1, y1, x2, y2, fgColor, bgColor, lineWidth, fillMode) {
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        const radius = Math.min(8, w / 4, h / 4);

        if (w === 0 && h === 0) return;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.arcTo(x + w, y, x + w, y + radius, radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        ctx.lineTo(x + radius, y + h);
        ctx.arcTo(x, y + h, x, y + h - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();

        if (fillMode === 'fillOnly') {
            ctx.fillStyle = bgColor;
            ctx.fill();
        } else if (fillMode === 'outlineFill') {
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    drawFinalCurve() {
        const ctx = this.app.mainCtx;
        const fgColor = this.app.fgColor;
        const lineWidth = this.app.toolManager.lineWidth;

        // Clear and redraw with cubic bezier
        ctx.strokeStyle = fgColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);

        if (this.curvePoints.length === 2) {
            ctx.bezierCurveTo(
                this.curvePoints[0].x, this.curvePoints[0].y,
                this.curvePoints[1].x, this.curvePoints[1].y,
                this.endX, this.endY
            );
        } else if (this.curvePoints.length === 1) {
            ctx.quadraticCurveTo(
                this.curvePoints[0].x, this.curvePoints[0].y,
                this.endX, this.endY
            );
        }
        ctx.stroke();
    }

    drawFinalPolygon() {
        const ctx = this.app.mainCtx;
        const fgColor = this.app.fgColor;
        const bgColor = this.app.bgColor;
        const lineWidth = this.app.toolManager.lineWidth;
        const fillMode = this.app.toolManager.fillMode;

        if (this.polygonPoints.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
        for (let i = 1; i < this.polygonPoints.length; i++) {
            ctx.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
        }
        ctx.closePath();

        if (fillMode === 'fillOnly') {
            ctx.fillStyle = bgColor;
            ctx.fill();
        } else if (fillMode === 'outlineFill') {
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    cancelCurrentShape() {
        // If curve base line was drawn, undo to revert it
        if (this.curveClicks >= 2) {
            this.app.history.undo();
        }
        this.drawing = false;
        this.curveClicks = 0;
        this.curvePoints = [];
        this.polygonStarted = false;
        this.polygonPoints = [];
        this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
    }
}
