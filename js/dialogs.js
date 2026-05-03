// dialogs.js - Dialog handling

class DialogManager {
    constructor(app) {
        this.app = app;
        this.setupDialogEvents();
    }

    setupDialogEvents() {
        // Close buttons
        document.querySelectorAll('.dialog-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeDialog(btn.dataset.dialog);
            });
        });

        // Dialog buttons (OK/Cancel)
        document.querySelectorAll('.dialog-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const dialogId = btn.dataset.dialog;
                this.handleDialogAction(dialogId, action);
            });
        });

        // Click overlay to close
        document.getElementById('dialogOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('dialogOverlay')) {
                this.closeAllDialogs();
            }
        });
    }

    openDialog(dialogId) {
        document.getElementById('dialogOverlay').style.display = 'flex';
        document.getElementById(dialogId).style.display = 'block';

        // Populate values based on dialog
        if (dialogId === 'attributesDialog') {
            document.getElementById('attrWidth').value = this.app.mainCanvas.width;
            document.getElementById('attrHeight').value = this.app.mainCanvas.height;
        }
    }

    closeDialog(dialogId) {
        document.getElementById(dialogId).style.display = 'none';
        document.getElementById('dialogOverlay').style.display = 'none';
    }

    closeAllDialogs() {
        document.querySelectorAll('.dialog').forEach(d => d.style.display = 'none');
        document.getElementById('dialogOverlay').style.display = 'none';
    }

    handleDialogAction(dialogId, action) {
        if (action === 'cancel') {
            this.closeDialog(dialogId);
            return;
        }

        if (action !== 'ok') return;

        switch (dialogId) {
            case 'attributesDialog':
                this.applyAttributes();
                break;
            case 'flipRotateDialog':
                this.applyFlipRotate();
                break;
            case 'stretchSkewDialog':
                this.applyStretchSkew();
                break;
            case 'colorPickerDialog':
                this.app.colorPicker.confirm();
                return; // Color picker handles its own close
        }

        this.closeDialog(dialogId);
    }

    applyAttributes() {
        const w = parseInt(document.getElementById('attrWidth').value) || 640;
        const h = parseInt(document.getElementById('attrHeight').value) || 480;
        this.app.resizeCanvas(w, h);
    }

    applyFlipRotate() {
        const selection = document.querySelector('input[name="flipRotate"]:checked');
        if (!selection) return;

        const value = selection.value;
        this.app.history.saveState();

        if (value === 'flipH') {
            this.app.flipHorizontal();
        } else if (value === 'flipV') {
            this.app.flipVertical();
        } else if (value === 'rotateByAngle') {
            const angle = document.querySelector('input[name="rotateAngle"]:checked');
            if (angle) {
                this.app.rotate(parseInt(angle.value));
            }
        }
    }

    applyStretchSkew() {
        const stretchH = parseInt(document.getElementById('stretchH').value) || 100;
        const stretchV = parseInt(document.getElementById('stretchV').value) || 100;
        const skewH = parseInt(document.getElementById('skewH').value) || 0;
        const skewV = parseInt(document.getElementById('skewV').value) || 0;

        this.app.history.saveState();
        this.app.stretchSkew(stretchH, stretchV, skewH, skewV);
    }
}
