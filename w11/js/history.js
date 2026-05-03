// history.js - Optimized ring buffer undo/redo

class PaintHistory {
    constructor(canvas, maxSteps = 30) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.maxSteps = maxSteps;
        this.undoStack = [];
        this.redoStack = [];
        this.onResize = null;
    }
    saveState() {
        const w = this.canvas.width, h = this.canvas.height;
        this.undoStack.push({ imageData: this.ctx.getImageData(0, 0, w, h), width: w, height: h });
        if (this.undoStack.length > this.maxSteps) this.undoStack.shift();
        this.redoStack.length = 0;
    }
    undo() {
        if (!this.undoStack.length) return false;
        this.redoStack.push({ imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height), width: this.canvas.width, height: this.canvas.height });
        const s = this.undoStack.pop();
        if (s.width !== this.canvas.width || s.height !== this.canvas.height) {
            this.canvas.width = s.width; this.canvas.height = s.height;
            if (this.onResize) this.onResize(s.width, s.height);
        }
        this.ctx.putImageData(s.imageData, 0, 0);
        return true;
    }
    redo() {
        if (!this.redoStack.length) return false;
        this.undoStack.push({ imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height), width: this.canvas.width, height: this.canvas.height });
        const s = this.redoStack.pop();
        if (s.width !== this.canvas.width || s.height !== this.canvas.height) {
            this.canvas.width = s.width; this.canvas.height = s.height;
            if (this.onResize) this.onResize(s.width, s.height);
        }
        this.ctx.putImageData(s.imageData, 0, 0);
        return true;
    }
    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
    clear() { this.undoStack.length = 0; this.redoStack.length = 0; }
}
