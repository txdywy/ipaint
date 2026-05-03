// brush.js - Drawing tools: pencil, brush, eraser, airbrush

class BrushTools {
    constructor(app) {
        this.app = app;
        this.drawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.airbrushInterval = null;
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
                ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
                break;

            case 'brush':
                this.app.history.saveState();
                this.drawBrushStroke(ctx, x, y, fgColor);
                break;

            case 'eraser':
                this.app.history.saveState();
                this.eraseAt(ctx, x, y, bgColor);
                break;

            case 'airbrush':
                this.app.history.saveState();
                this.sprayAt(ctx, x, y, fgColor);
                this.startAirbrush(ctx, x, y, fgColor);
                break;
        }
    }

    onMouseMove(x, y) {
        if (!this.drawing) return;
        const tool = this.app.toolManager.getTool();
        const ctx = this.app.mainCtx;
        const fgColor = this.app.mouseButton === 2 ? this.app.bgColor : this.app.fgColor;
        const bgColor = this.app.mouseButton === 2 ? this.app.fgColor : this.app.bgColor;

        switch (tool) {
            case 'pencil': {
                // Bresenham line for pixel-perfect drawing
                const points = PaintUtils.bresenhamLine(
                    Math.floor(this.lastX), Math.floor(this.lastY),
                    Math.floor(x), Math.floor(y)
                );
                ctx.fillStyle = fgColor;
                for (const p of points) {
                    ctx.fillRect(p.x, p.y, 1, 1);
                }
                break;
            }

            case 'brush': {
                const points = PaintUtils.bresenhamLine(
                    Math.floor(this.lastX), Math.floor(this.lastY),
                    Math.floor(x), Math.floor(y)
                );
                for (const p of points) {
                    this.drawBrushStroke(ctx, p.x, p.y, fgColor);
                }
                break;
            }

            case 'eraser': {
                const points = PaintUtils.bresenhamLine(
                    Math.floor(this.lastX), Math.floor(this.lastY),
                    Math.floor(x), Math.floor(y)
                );
                for (const p of points) {
                    this.eraseAt(ctx, p.x, p.y, bgColor);
                }
                break;
            }

            case 'airbrush':
                this.sprayAt(ctx, x, y, fgColor);
                // Update airbrush position
                if (this.airbrushInterval) {
                    this.stopAirbrush();
                    this.startAirbrush(ctx, x, y, fgColor);
                }
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
        this.stopAirbrush();
    }

    drawBrushStroke(ctx, x, y, color) {
        const brush = this.app.toolManager.brushShape;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        switch (brush.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'square':
                const half = brush.size / 2;
                ctx.fillRect(x - half, y - half, brush.size, brush.size);
                break;
            case 'fslash':
                ctx.lineWidth = 2;
                ctx.beginPath();
                const hs = brush.size / 2;
                ctx.moveTo(x - hs, y + hs);
                ctx.lineTo(x + hs, y - hs);
                ctx.stroke();
                break;
            case 'bslash':
                ctx.lineWidth = 2;
                ctx.beginPath();
                const hs2 = brush.size / 2;
                ctx.moveTo(x - hs2, y - hs2);
                ctx.lineTo(x + hs2, y + hs2);
                ctx.stroke();
                break;
        }
    }

    eraseAt(ctx, x, y, bgColor) {
        const size = this.app.toolManager.eraserSize;
        const half = size / 2;
        ctx.fillStyle = bgColor;
        ctx.fillRect(Math.floor(x - half), Math.floor(y - half), size, size);
    }

    sprayAt(ctx, x, y, color) {
        const radius = 10;
        const density = 15;
        PaintUtils.airbrushSpray(ctx, x, y, radius, density, color);
    }

    startAirbrush(ctx, x, y, color) {
        this.airbrushInterval = setInterval(() => {
            if (this.drawing) {
                this.sprayAt(ctx, x, y, color);
            }
        }, 100);
    }

    stopAirbrush() {
        if (this.airbrushInterval) {
            clearInterval(this.airbrushInterval);
            this.airbrushInterval = null;
        }
    }
}
