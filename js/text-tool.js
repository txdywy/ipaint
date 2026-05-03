// text-tool.js - Text input tool

class TextTool {
    constructor(app) {
        this.app = app;
        this.isEditing = false;
        this.startX = 0;
        this.startY = 0;
        this.textInputBox = document.getElementById('textInputBox');
        this.textInput = document.getElementById('textInput');
    }

    onMouseDown(x, y) {
        if (this.isEditing) {
            this.commitText();
        }

        this.isEditing = true;
        this.startX = x;
        this.startY = y;

        this.textInputBox.style.display = 'block';
        this.textInputBox.style.left = x + 'px';
        this.textInputBox.style.top = y + 'px';
        this.textInputBox.style.width = '200px';
        this.textInputBox.style.height = '60px';
        this.textInput.value = '';
        this.textInput.style.color = this.app.fgColor;
        this.textInput.style.fontSize = '14px';
        this.textInput.style.fontFamily = 'Arial, sans-serif';

        setTimeout(() => this.textInput.focus(), 0);
    }

    onMouseMove(x, y) {
        if (this.isEditing && this.app.mouseDown) {
            const w = Math.max(20, x - this.startX);
            const h = Math.max(20, y - this.startY);
            this.textInputBox.style.width = w + 'px';
            this.textInputBox.style.height = h + 'px';
        }
    }

    onMouseUp() {
        // Nothing special needed
    }

    commitText() {
        if (!this.isEditing) return;

        const text = this.textInput.value;
        if (text.trim()) {
            this.app.history.saveState();
            const ctx = this.app.mainCtx;
            const rect = this.textInputBox.getBoundingClientRect();
            const canvasRect = this.app.mainCanvas.getBoundingClientRect();

            const x = this.startX;
            const y = this.startY;
            const fontSize = parseInt(this.textInput.style.fontSize) || 14;
            const fontFamily = this.textInput.style.fontFamily || 'Arial, sans-serif';

            ctx.fillStyle = this.app.fgColor;
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textBaseline = 'top';

            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], x + 2, y + 2 + i * (fontSize + 2));
            }
        }

        this.hideInput();
    }

    hideInput() {
        this.isEditing = false;
        this.textInputBox.style.display = 'none';
        this.textInput.value = '';
    }

    cancelText() {
        this.hideInput();
    }

    isActive() {
        return this.isEditing;
    }
}
