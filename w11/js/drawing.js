// drawing.js - All drawing tools (optimized, zero-allocation Bresenham)

class DrawingEngine {
    constructor(app) {
        this.app = app;
        this.drawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.airbrushRAF = null;

        // Shape state
        this.shapeStart = null;
        this.curveClicks = 0;
        this.curvePoints = [];
        this.endX = 0;
        this.endY = 0;
        this.polygonPoints = [];
        this.polygonStarted = false;
    }

    onMouseDown(x, y, button) {
        const tool = this.app.currentTool;
        const ctx = this.app.mainCtx;
        const fg = button === 2 ? this.app.bgColor : this.app.fgColor;
        const bg = button === 2 ? this.app.fgColor : this.app.bgColor;

        this.drawing = true;
        this.lastX = x;
        this.lastY = y;

        switch (tool) {
            case 'pencil':
                this.app.history.saveState();
                ctx.fillStyle = fg;
                ctx.fillRect(x | 0, y | 0, 1, 1);
                break;
            case 'brush': case 'calligraphy':
                this.app.history.saveState();
                this._brush(ctx, x, y, fg);
                break;
            case 'eraser':
                this.app.history.saveState();
                this._erase(ctx, x, y, bg);
                break;
            case 'airbrush':
                this.app.history.saveState();
                this._spray(ctx, x, y, fg);
                this._startAirbrush(ctx, x, y, fg);
                break;
            case 'fill':
                this._fill(x, y, button);
                this.drawing = false;
                break;
            case 'pickColor':
                this._pickColor(x, y, button);
                this.drawing = false;
                break;
            case 'line':
                this.app.history.saveState();
                this.shapeStart = { x, y };
                break;
            case 'curve':
                if (this.curveClicks === 0) {
                    this.app.history.saveState();
                    this.shapeStart = { x, y };
                    this.curvePoints = [];
                    this.curveClicks = 1;
                } else if (this.curveClicks === 1) {
                    this.curveClicks = 2;
                } else if (this.curveClicks === 2) {
                    this.curvePoints.push({ x, y });
                    this.curveClicks = 3;
                } else if (this.curveClicks === 3) {
                    this.curvePoints.push({ x, y });
                    this._drawFinalCurve(ctx);
                    this.curveClicks = 0;
                    this.drawing = false;
                    this.app.isDirty = true;
                }
                break;
            case 'rectangle': case 'ellipse': case 'roundRect':
                this.app.history.saveState();
                this.shapeStart = { x, y };
                break;
            case 'polygon':
                if (!this.polygonStarted) {
                    this.app.history.saveState();
                    this.polygonStarted = true;
                    this.polygonPoints = [{ x, y }];
                    this.shapeStart = { x, y };
                } else {
                    if (this.polygonPoints.length > 2) {
                        const f = this.polygonPoints[0];
                        if (Math.hypot(x - f.x, y - f.y) < 5) {
                            this._drawFinalPolygon(ctx);
                            this.polygonStarted = false;
                            this.polygonPoints = [];
                            this.drawing = false;
                            this.app.isDirty = true;
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
        const tool = this.app.currentTool;
        const overlay = this.app.overlayCtx;
        const fg = this.app.fgColor;
        const bg = this.app.bgColor;
        const lw = this.app.lineWidth;
        const ow = this.app.overlayCanvas.width;
        const oh = this.app.overlayCanvas.height;
        const sh = this.app.shiftKey;

        const lx = this.lastX | 0, ly = this.lastY | 0;
        const nx = x | 0, ny = y | 0;

        let ax = x, ay = y;
        if (sh && this.shapeStart) {
            const dx = x - this.shapeStart.x, dy = y - this.shapeStart.y;
            const sz = Math.max(Math.abs(dx), Math.abs(dy));
            ax = this.shapeStart.x + sz * Math.sign(dx);
            ay = this.shapeStart.y + sz * Math.sign(dy);
        }

        switch (tool) {
            case 'pencil':
                this.app.mainCtx.fillStyle = fg;
                PaintUtils.bresenhamLine(lx, ly, nx, ny, (px, py) => {
                    this.app.mainCtx.fillRect(px, py, 1, 1);
                });
                break;
            case 'brush': case 'calligraphy':
                PaintUtils.bresenhamLine(lx, ly, nx, ny, (px, py) => {
                    this._brush(this.app.mainCtx, px, py, fg);
                });
                break;
            case 'eraser':
                PaintUtils.bresenhamLine(lx, ly, nx, ny, (px, py) => {
                    this._erase(this.app.mainCtx, px, py, bg);
                });
                break;
            case 'airbrush':
                this._spray(this.app.mainCtx, x, y, fg);
                break;

            case 'line':
                overlay.clearRect(0, 0, ow, oh);
                overlay.strokeStyle = fg;
                overlay.lineWidth = lw;
                overlay.beginPath();
                overlay.moveTo(this.shapeStart.x, this.shapeStart.y);
                if (sh) { const s = this._snap(this.shapeStart.x, this.shapeStart.y, x, y); overlay.lineTo(s.x, s.y); }
                else overlay.lineTo(x, y);
                overlay.stroke();
                break;
            case 'curve':
                if (this.curveClicks === 1) {
                    overlay.clearRect(0, 0, ow, oh);
                    overlay.strokeStyle = fg;
                    overlay.lineWidth = lw;
                    overlay.beginPath();
                    overlay.moveTo(this.shapeStart.x, this.shapeStart.y);
                    overlay.lineTo(x, y);
                    overlay.stroke();
                }
                break;
            case 'rectangle':
                overlay.clearRect(0, 0, ow, oh);
                this._previewRect(overlay, this.shapeStart.x, this.shapeStart.y, ax, ay, fg, bg, lw);
                break;
            case 'ellipse':
                overlay.clearRect(0, 0, ow, oh);
                this._previewEllipse(overlay, this.shapeStart.x, this.shapeStart.y, ax, ay, fg, bg, lw);
                break;
            case 'roundRect':
                overlay.clearRect(0, 0, ow, oh);
                this._previewRoundRect(overlay, this.shapeStart.x, this.shapeStart.y, ax, ay, fg, bg, lw);
                break;
            case 'polygon':
                if (this.polygonPoints.length > 0) {
                    overlay.clearRect(0, 0, ow, oh);
                    overlay.strokeStyle = fg;
                    overlay.lineWidth = lw;
                    overlay.beginPath();
                    overlay.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
                    for (let i = 1; i < this.polygonPoints.length; i++) overlay.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
                    overlay.lineTo(x, y);
                    overlay.stroke();
                }
                break;
        }

        this.lastX = x;
        this.lastY = y;
    }

    onMouseUp(x, y, button) {
        if (!this.drawing) return;
        const tool = this.app.currentTool;
        const ctx = this.app.mainCtx;
        const fg = button === 2 ? this.app.bgColor : this.app.fgColor;
        const bg = button === 2 ? this.app.fgColor : this.app.bgColor;
        const lw = this.app.lineWidth;
        const sh = this.app.shiftKey;

        let ax = x, ay = y;
        if (sh && this.shapeStart) {
            const dx = x - this.shapeStart.x, dy = y - this.shapeStart.y;
            const sz = Math.max(Math.abs(dx), Math.abs(dy));
            ax = this.shapeStart.x + sz * Math.sign(dx);
            ay = this.shapeStart.y + sz * Math.sign(dy);
        }

        this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);

        switch (tool) {
            case 'pencil': case 'brush': case 'calligraphy': case 'eraser':
                this.app.isDirty = true;
                this.drawing = false;
                break;
            case 'airbrush':
                this.app.isDirty = true;
                this.drawing = false;
                this._stopAirbrush();
                break;
            case 'line':
                if (this.shapeStart) {
                    ctx.strokeStyle = fg; ctx.lineWidth = lw;
                    ctx.beginPath(); ctx.moveTo(this.shapeStart.x, this.shapeStart.y);
                    if (sh) { const s = this._snap(this.shapeStart.x, this.shapeStart.y, x, y); ctx.lineTo(s.x, s.y); }
                    else ctx.lineTo(x, y);
                    ctx.stroke();
                    this.shapeStart = null; this.drawing = false; this.app.isDirty = true;
                }
                break;
            case 'curve':
                if (this.curveClicks === 1) {
                    this.endX = x; this.endY = y;
                    this.curveClicks = 2;
                    ctx.strokeStyle = fg; ctx.lineWidth = lw;
                    ctx.beginPath(); ctx.moveTo(this.shapeStart.x, this.shapeStart.y); ctx.lineTo(x, y); ctx.stroke();
                }
                break;
            case 'rectangle':
                this._drawRect(ctx, this.shapeStart.x, this.shapeStart.y, ax, ay, fg, bg, lw);
                this.shapeStart = null; this.drawing = false; this.app.isDirty = true;
                break;
            case 'ellipse':
                this._drawEllipse(ctx, this.shapeStart.x, this.shapeStart.y, ax, ay, fg, bg, lw);
                this.shapeStart = null; this.drawing = false; this.app.isDirty = true;
                break;
            case 'roundRect':
                this._drawRoundRect(ctx, this.shapeStart.x, this.shapeStart.y, ax, ay, fg, bg, lw);
                this.shapeStart = null; this.drawing = false; this.app.isDirty = true;
                break;
        }
    }

    onDoubleClick(x, y) {
        if (this.app.currentTool === 'polygon' && this.polygonStarted && this.polygonPoints.length > 2) {
            this._drawFinalPolygon(this.app.mainCtx);
            this.polygonStarted = false;
            this.polygonPoints = [];
            this.drawing = false;
            this.app.isDirty = true;
            this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
        }
    }

    cancel() {
        if (this.curveClicks >= 2) this.app.history.undo();
        this.drawing = false;
        this.curveClicks = 0;
        this.curvePoints = [];
        this.shapeStart = null;
        this.polygonStarted = false;
        this.polygonPoints = [];
        this.app.overlayCtx.clearRect(0, 0, this.app.overlayCanvas.width, this.app.overlayCanvas.height);
    }

    // ---- Drawing primitives ----
    _brush(ctx, x, y, color) {
        const sz = this.app.brushSize;
        const tool = this.app.currentTool;
        ctx.fillStyle = color;
        if (tool === 'calligraphy') {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 4);
            ctx.fillRect(-sz, -1, sz * 2, 2);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(x, y, sz * 0.5, 0, 6.2832);
            ctx.fill();
        }
    }

    _erase(ctx, x, y, bg) {
        const sz = this.app.eraserSize || 8;
        ctx.fillStyle = bg;
        ctx.fillRect(x - (sz >> 1), y - (sz >> 1), sz, sz);
    }

    _spray(ctx, x, y, color) {
        PaintUtils.airbrushSpray(ctx, x, y, 10, 15, color);
    }

    _startAirbrush(ctx, x, y, color) {
        const tick = () => {
            if (this.drawing) {
                this._spray(ctx, this.lastX, this.lastY, color);
                this.airbrushRAF = requestAnimationFrame(tick);
            }
        };
        this.airbrushRAF = requestAnimationFrame(tick);
    }

    _stopAirbrush() {
        if (this.airbrushRAF) { cancelAnimationFrame(this.airbrushRAF); this.airbrushRAF = null; }
    }

    _fill(x, y, button) {
        const w = this.app.mainCanvas.width, h = this.app.mainCanvas.height;
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        this.app.history.saveState();
        const id = this.app.mainCtx.getImageData(0, 0, w, h);
        PaintUtils.floodFill(id, x, y, button === 2 ? this.app.bgColor : this.app.fgColor, w, h);
        this.app.mainCtx.putImageData(id, 0, 0);
        this.app.isDirty = true;
    }

    _pickColor(x, y, button) {
        const c = PaintUtils.getPixelColor(this.app.mainCtx, x, y);
        if (button === 2) this.app.bgColor = c; else this.app.fgColor = c;
        this.app.updateColors();
    }

    _snap(x0, y0, x1, y1) {
        const dx = x1 - x0, dy = y1 - y0;
        const a = Math.atan2(dy, dx) * 180 / Math.PI;
        const len = Math.hypot(dx, dy);
        const sa = Math.round(a / 45) * 45 * Math.PI / 180;
        return { x: Math.round(x0 + len * Math.cos(sa)), y: Math.round(y0 + len * Math.sin(sa)) };
    }

    // ---- Shape previews & draws ----
    _previewRect(ctx, x1, y1, x2, y2, fg, bg, lw) {
        const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
        const om = this.app.outlineMode, fm = this.app.fillMode;
        if (fm !== 'none') { ctx.fillStyle = fm === 'marker' ? bg + '80' : bg; ctx.fillRect(x, y, w, h); }
        if (om !== 'none') { ctx.strokeStyle = fg; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
    }
    _drawRect(ctx, x1, y1, x2, y2, fg, bg, lw) {
        const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
        if (!w && !h) return;
        const om = this.app.outlineMode, fm = this.app.fillMode;
        if (fm !== 'none') { ctx.fillStyle = fm === 'marker' ? bg + '80' : bg; ctx.fillRect(x, y, w, h); }
        if (om !== 'none') { ctx.strokeStyle = fg; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
    }
    _previewEllipse(ctx, x1, y1, x2, y2, fg, bg, lw) {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
        if (rx < 1 && ry < 1) return;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832);
        const om = this.app.outlineMode, fm = this.app.fillMode;
        if (fm !== 'none') { ctx.fillStyle = fm === 'marker' ? bg + '80' : bg; ctx.fill(); }
        if (om !== 'none') { ctx.strokeStyle = fg; ctx.lineWidth = lw; ctx.stroke(); }
    }
    _drawEllipse(ctx, x1, y1, x2, y2, fg, bg, lw) {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
        if (rx < 1 && ry < 1) return;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832);
        const om = this.app.outlineMode, fm = this.app.fillMode;
        if (fm !== 'none') { ctx.fillStyle = fm === 'marker' ? bg + '80' : bg; ctx.fill(); }
        if (om !== 'none') { ctx.strokeStyle = fg; ctx.lineWidth = lw; ctx.stroke(); }
    }
    _previewRoundRect(ctx, x1, y1, x2, y2, fg, bg, lw) {
        const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1), r = Math.min(8, w / 4, h / 4);
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
        const om = this.app.outlineMode, fm = this.app.fillMode;
        if (fm !== 'none') { ctx.fillStyle = fm === 'marker' ? bg + '80' : bg; ctx.fill(); }
        if (om !== 'none') { ctx.strokeStyle = fg; ctx.lineWidth = lw; ctx.stroke(); }
    }
    _drawRoundRect(ctx, x1, y1, x2, y2, fg, bg, lw) {
        const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1), r = Math.min(8, w / 4, h / 4);
        if (!w && !h) return;
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
        const om = this.app.outlineMode, fm = this.app.fillMode;
        if (fm !== 'none') { ctx.fillStyle = fm === 'marker' ? bg + '80' : bg; ctx.fill(); }
        if (om !== 'none') { ctx.strokeStyle = fg; ctx.lineWidth = lw; ctx.stroke(); }
    }

    _drawFinalCurve(ctx) {
        const fg = this.app.fgColor, lw = this.app.lineWidth;
        ctx.strokeStyle = fg; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(this.shapeStart.x, this.shapeStart.y);
        if (this.curvePoints.length === 2)
            ctx.bezierCurveTo(this.curvePoints[0].x, this.curvePoints[0].y, this.curvePoints[1].x, this.curvePoints[1].y, this.endX, this.endY);
        else if (this.curvePoints.length === 1)
            ctx.quadraticCurveTo(this.curvePoints[0].x, this.curvePoints[0].y, this.endX, this.endY);
        ctx.stroke();
    }

    _drawFinalPolygon(ctx) {
        const fg = this.app.fgColor, bg = this.app.bgColor, lw = this.app.lineWidth;
        if (this.polygonPoints.length < 2) return;
        ctx.beginPath(); ctx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
        for (let i = 1; i < this.polygonPoints.length; i++) ctx.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
        ctx.closePath();
        const om = this.app.outlineMode, fm = this.app.fillMode;
        if (fm !== 'none') { ctx.fillStyle = bg; ctx.fill(); }
        if (om !== 'none') { ctx.strokeStyle = fg; ctx.lineWidth = lw; ctx.stroke(); }
    }
}
