// history.js - Undo/Redo system using canvas snapshots

class PaintHistory {
    constructor(canvas, maxSteps = 50) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maxSteps = maxSteps;
        this.undoStack = [];
        this.redoStack = [];
        this.onResize = null;
    }

    saveState() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push({
            imageData,
            width: this.canvas.width,
            height: this.canvas.height
        });
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.redoStack.push({
            imageData: currentState,
            width: this.canvas.width,
            height: this.canvas.height
        });

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
        const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push({
            imageData: currentState,
            width: this.canvas.width,
            height: this.canvas.height
        });

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
        this.undoStack = [];
        this.redoStack = [];
    }
}
