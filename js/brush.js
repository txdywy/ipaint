// brush.js - Drawing tools: pencil, brush, eraser, airbrush (optimized)

class BrushTools {
    constructor(app) {
        this.app = app;
        this.drawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.airbrushRAF = null;
        this.airbrushX = 0;
        this.airbrushY = 0;
        this.airbrushColor = '';
    }

    onMouseDown(x, y, button) {
        const tool = this.app.toolManager.getTool();
        const ctx = this.app.mainCtx;
        const fgColor = button === 2 ? this.app.bgColor : this.app.fgColor;
        const bgColor = button === 2 ? this.app.fgColor : this.app.bgColor;

        this.drawing = true;
        this.lastX = x;
        this.lastY = y;

        switch (tool) {
            case 'pencil':
                this.app.history.saveState();
                ctx.fillStyle = fgColor;
                ctx.fillRect(x | 0, y | 0, 1, 1);
                break;
            case 'brush':
                this.app.history.saveState();
                this._drawBrush(ctx, x, y, fgColor);
                break;
            case 'eraser':
                this.app.history.saveState();
                this._erase(ctx, x, y, bgColor);
                break;
            case 'airbrush':
                this.app.history.saveState();
                this._spray(ctx, x, y, fgColor);
                this._startAirbrush(ctx, x, y, fgColor);
                break;
        }
    }

    onMouseMove(x, y) {
        if (!this.drawing) return;
        const tool = this.app.toolManager.getTool();
        const ctx = this.app.mainCtx;
        const isRmb = this.app.mouseButton === 2;
        const fgColor = isRmb ? this.app.bgColor : this.app.fgColor;
        const bgColor = isRmb ? this.app.fgColor : this.app.bgColor;
        const lx = this.lastX | 0, ly = this.lastY | 0;
        const nx = x | 0, ny = y | 0;

        switch (tool) {
            case 'pencil':
                ctx.fillStyle = fgColor;
                PaintUtils.bresenhamLine(lx, ly, nx, ny, (px, py) => {
                    ctx.fillRect(px, py, 1, 1);
                });
                break;

            case 'brush':
                PaintUtils.bresenhamLine(lx, ly, nx, ny, (px, py) => {
                    this._drawBrush(ctx, px, py, fgColor);
                });
                break;

            case 'eraser':
                PaintUtils.bresenhamLine(lx, ly, nx, ny, (px, py) => {
                    this._erase(ctx, px, py, bgColor);
                });
                break;

            case 'airbrush':
                this._spray(ctx, x, y, fgColor);
                this.airbrushX = x;
                this.airbrushY = y;
                break;
        }

        this.lastX = x;
        this.lastY = y;
    }

    onMouseUp() {
        if (this.drawing) {
            this.app.isDirty = true;
        }
        this.drawing = false;
        this._stopAirbrush();
    }

    _drawBrush(ctx, x, y, color) {
        const brush = this.app.toolManager.brushShape;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        switch (brush.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(x, y, brush.size * 0.5, 0, 6.2832);
                ctx.fill();
                break;
            case 'square': {
                const half = brush.size >> 1;
                ctx.fillRect(x - half, y - half, brush.size, brush.size);
                break;
            }
            case 'fslash': {
                ctx.lineWidth = 2;
                ctx.beginPath();
                const hs = brush.size >> 1;
                ctx.moveTo(x - hs, y + hs);
                ctx.lineTo(x + hs, y - hs);
                ctx.stroke();
                break;
            }
            case 'bslash': {
                ctx.lineWidth = 2;
                ctx.beginPath();
                const hs2 = brush.size >> 1;
                ctx.moveTo(x - hs2, y - hs2);
                ctx.lineTo(x + hs2, y + hs2);
                ctx.stroke();
                break;
            }
        }
    }

    _erase(ctx, x, y, bgColor) {
        const size = this.app.toolManager.eraserSize;
        const half = size >> 1;
        ctx.fillStyle = bgColor;
        ctx.fillRect(x - half, y - half, size, size);
    }

    _spray(ctx, x, y, color) {
        PaintUtils.airbrushSpray(ctx, x, y, 10, 15, color);
    }

    _startAirbrush(ctx, x, y, color) {
        this.airbrushX = x;
        this.airbrushY = y;
        this.airbrushColor = color;
        const tick = () => {
            if (this.drawing) {
                this._spray(ctx, this.airbrushX, this.airbrushY, this.airbrushColor);
                this.airbrushRAF = requestAnimationFrame(tick);
            }
        };
        this.airbrushRAF = requestAnimationFrame(tick);
    }

    _stopAirbrush() {
        if (this.airbrushRAF) {
            cancelAnimationFrame(this.airbrushRAF);
            this.airbrushRAF = null;
        }
    }
}
