// history.js - Undo/Redo system (optimized ring buffer)

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
        const imageData = this.ctx.getImageData(0, 0, w, h);
        this.undoStack.push({ imageData, width: w, height: h });
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
        this.redoStack.length = 0; // faster than = []
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.redoStack.push({ imageData: cur, width: this.canvas.width, height: this.canvas.height });

        const state = this.undoStack.pop();
        if (state.width !== this.canvas.width || state.height !== this.canvas.height) {
            this.canvas.width = state.width;
            this.canvas.height = state.height;
            if (this.onResize) this.onResize(state.width, state.height);
        }
        this.ctx.putImageData(state.imageData, 0, 0);
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        const cur = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push({ imageData: cur, width: this.canvas.width, height: this.canvas.height });

        const state = this.redoStack.pop();
        if (state.width !== this.canvas.width || state.height !== this.canvas.height) {
            this.canvas.width = state.width;
            this.canvas.height = state.height;
            if (this.onResize) this.onResize(state.width, state.height);
        }
        this.ctx.putImageData(state.imageData, 0, 0);
        return true;
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    clear() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    }
}
