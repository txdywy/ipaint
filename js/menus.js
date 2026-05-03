// menus.js - Menu bar handling

class MenuManager {
    constructor(app) {
        this.app = app;
        this.openMenu = null;
        this.setupMenuEvents();
    }

    setupMenuEvents() {
        const menuItems = document.querySelectorAll('.menu-item');

        menuItems.forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                if (item.classList.contains('open')) {
                    this.closeMenu();
                } else {
                    this.openMenuElement(item);
                }
            });

            item.addEventListener('mouseenter', () => {
                if (this.openMenu && this.openMenu !== item) {
                    this.openMenuElement(item);
                }
            });
        });

        // Close menu on click outside
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.menu-item')) {
                this.closeMenu();
            }
        });

        // Menu entry clicks
        document.querySelectorAll('.menu-entry').forEach(entry => {
            entry.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = entry.dataset.action;
                if (action) {
                    this.handleAction(action);
                    this.closeMenu();
                }
            });
        });
    }

    openMenuElement(item) {
        this.closeMenu();
        item.classList.add('open');
        this.openMenu = item;
    }

    closeMenu() {
        if (this.openMenu) {
            this.openMenu.classList.remove('open');
            this.openMenu = null;
        }
    }

    handleAction(action) {
        switch (action) {
            // File menu
            case 'new':
                this.app.newFile();
                break;
            case 'open':
                this.app.openFile();
                break;
            case 'save':
                this.app.saveFile();
                break;
            case 'saveAs':
                this.app.saveFileAs();
                break;

            // Edit menu
            case 'undo':
                this.app.doUndo();
                break;
            case 'redo':
                this.app.doRedo();
                break;
            case 'cut':
                this.app.cutSelection();
                break;
            case 'copy':
                this.app.copySelection();
                break;
            case 'paste':
                this.app.pasteSelection();
                break;
            case 'clearSelection':
                this.app.deleteSelection();
                break;
            case 'selectAll':
                this.app.selectAll();
                break;

            // View menu
            case 'toggleToolBox':
                this.toggleCheck(entry => entry.dataset.action === 'toggleToolBox');
                document.getElementById('toolbox').style.display =
                    document.getElementById('toolbox').style.display === 'none' ? 'flex' : 'none';
                break;
            case 'toggleColorBox':
                this.toggleCheck(entry => entry.dataset.action === 'toggleColorBox');
                document.getElementById('colorPalette').style.display =
                    document.getElementById('colorPalette').style.display === 'none' ? 'flex' : 'none';
                break;
            case 'toggleStatusBar':
                this.toggleCheck(entry => entry.dataset.action === 'toggleStatusBar');
                document.getElementById('statusBar').style.display =
                    document.getElementById('statusBar').style.display === 'none' ? 'flex' : 'none';
                break;
            case 'zoomIn':
                this.app.zoomIn();
                break;
            case 'zoomOut':
                this.app.zoomOut();
                break;
            case 'viewBitmap':
                this.app.viewBitmap();
                break;

            // Image menu
            case 'flipRotate':
                this.app.dialogs.openDialog('flipRotateDialog');
                break;
            case 'stretchSkew':
                this.app.dialogs.openDialog('stretchSkewDialog');
                break;
            case 'invertColors':
                this.app.invertColors();
                break;
            case 'attributes':
                this.app.dialogs.openDialog('attributesDialog');
                break;
            case 'clearImage':
                this.app.clearImage();
                break;

            // Colors menu
            case 'editColors':
                this.app.openColorPicker();
                break;

            // Help menu
            case 'aboutPaint':
                this.app.dialogs.openDialog('aboutDialog');
                break;
        }
    }

    toggleCheck(matchFn) {
        document.querySelectorAll('.menu-entry.has-check').forEach(entry => {
            if (matchFn(entry)) {
                const checked = entry.dataset.checked === 'true';
                entry.dataset.checked = (!checked).toString();
            }
        });
    }
}
