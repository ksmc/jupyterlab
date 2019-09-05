// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { ImageViewerFactory, IImageTracker } from '@jupyterlab/imageviewer';
/**
 * The command IDs used by the image widget plugin.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.resetImage = 'imageviewer:reset-image';
    CommandIDs.zoomIn = 'imageviewer:zoom-in';
    CommandIDs.zoomOut = 'imageviewer:zoom-out';
    CommandIDs.flipHorizontal = 'imageviewer:flip-horizontal';
    CommandIDs.flipVertical = 'imageviewer:flip-vertical';
    CommandIDs.rotateClockwise = 'imageviewer:rotate-clockwise';
    CommandIDs.rotateCounterclockwise = 'imageviewer:rotate-counterclockwise';
    CommandIDs.invertColors = 'imageviewer:invert-colors';
})(CommandIDs || (CommandIDs = {}));
/**
 * The list of file types for images.
 */
const FILE_TYPES = ['png', 'gif', 'jpeg', 'svg', 'bmp', 'ico', 'xbm', 'tiff'];
/**
 * The name of the factory that creates image widgets.
 */
const FACTORY = 'Image';
/**
 * The image file handler extension.
 */
const plugin = {
    activate,
    id: '@jupyterlab/imageviewer-extension:plugin',
    provides: IImageTracker,
    optional: [ICommandPalette, ILayoutRestorer],
    autoStart: true
};
/**
 * Export the plugin as default.
 */
export default plugin;
/**
 * Activate the image widget extension.
 */
function activate(app, palette, restorer) {
    const namespace = 'image-widget';
    const factory = new ImageViewerFactory({
        name: FACTORY,
        modelName: 'base64',
        fileTypes: FILE_TYPES,
        defaultFor: FILE_TYPES,
        readOnly: true
    });
    const tracker = new WidgetTracker({
        namespace
    });
    if (restorer) {
        // Handle state restoration.
        void restorer.restore(tracker, {
            command: 'docmanager:open',
            args: widget => ({ path: widget.context.path, factory: FACTORY }),
            name: widget => widget.context.path
        });
    }
    app.docRegistry.addWidgetFactory(factory);
    factory.widgetCreated.connect((sender, widget) => {
        // Notify the widget tracker if restore data needs to update.
        widget.context.pathChanged.connect(() => {
            void tracker.save(widget);
        });
        void tracker.add(widget);
        const types = app.docRegistry.getFileTypesForPath(widget.context.path);
        if (types.length > 0) {
            widget.title.iconClass = types[0].iconClass;
            widget.title.iconLabel = types[0].iconLabel;
        }
    });
    addCommands(app, tracker);
    if (palette) {
        const category = 'Image Viewer';
        [
            CommandIDs.zoomIn,
            CommandIDs.zoomOut,
            CommandIDs.resetImage,
            CommandIDs.rotateClockwise,
            CommandIDs.rotateCounterclockwise,
            CommandIDs.flipHorizontal,
            CommandIDs.flipVertical,
            CommandIDs.invertColors
        ].forEach(command => {
            palette.addItem({ command, category });
        });
    }
    return tracker;
}
/**
 * Add the commands for the image widget.
 */
export function addCommands(app, tracker) {
    const { commands, shell } = app;
    /**
     * Whether there is an active image viewer.
     */
    function isEnabled() {
        return (tracker.currentWidget !== null &&
            tracker.currentWidget === shell.currentWidget);
    }
    commands.addCommand('imageviewer:zoom-in', {
        execute: zoomIn,
        label: 'Zoom In',
        isEnabled
    });
    commands.addCommand('imageviewer:zoom-out', {
        execute: zoomOut,
        label: 'Zoom Out',
        isEnabled
    });
    commands.addCommand('imageviewer:reset-image', {
        execute: resetImage,
        label: 'Reset Image',
        isEnabled
    });
    commands.addCommand('imageviewer:rotate-clockwise', {
        execute: rotateClockwise,
        label: 'Rotate Clockwise',
        isEnabled
    });
    commands.addCommand('imageviewer:rotate-counterclockwise', {
        execute: rotateCounterclockwise,
        label: 'Rotate Counterclockwise',
        isEnabled
    });
    commands.addCommand('imageviewer:flip-horizontal', {
        execute: flipHorizontal,
        label: 'Flip image horizontally',
        isEnabled
    });
    commands.addCommand('imageviewer:flip-vertical', {
        execute: flipVertical,
        label: 'Flip image vertically',
        isEnabled
    });
    commands.addCommand('imageviewer:invert-colors', {
        execute: invertColors,
        label: 'Invert Colors',
        isEnabled
    });
    function zoomIn() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.scale = widget.scale > 1 ? widget.scale + 0.5 : widget.scale * 2;
        }
    }
    function zoomOut() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.scale = widget.scale > 1 ? widget.scale - 0.5 : widget.scale / 2;
        }
    }
    function resetImage() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.scale = 1;
            widget.colorinversion = 0;
            widget.resetRotationFlip();
        }
    }
    function rotateClockwise() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.rotateClockwise();
        }
    }
    function rotateCounterclockwise() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.rotateCounterclockwise();
        }
    }
    function flipHorizontal() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.flipHorizontal();
        }
    }
    function flipVertical() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.flipVertical();
        }
    }
    function invertColors() {
        const widget = tracker.currentWidget.content;
        if (widget) {
            widget.colorinversion += 1;
            widget.colorinversion %= 2;
        }
    }
}
//# sourceMappingURL=index.js.map