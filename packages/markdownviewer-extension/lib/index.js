// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ILayoutRestorer } from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { IRenderMimeRegistry, markdownRendererFactory } from '@jupyterlab/rendermime';
import { MarkdownViewer, MarkdownViewerFactory, IMarkdownViewerTracker } from '@jupyterlab/markdownviewer';
/**
 * The command IDs used by the markdownviewer plugin.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.markdownPreview = 'markdownviewer:open';
})(CommandIDs || (CommandIDs = {}));
/**
 * The name of the factory that creates markdown viewer widgets.
 */
const FACTORY = 'Markdown Preview';
/**
 * The markdown viewer plugin.
 */
const plugin = {
    activate,
    id: '@jupyterlab/markdownviewer-extension:plugin',
    provides: IMarkdownViewerTracker,
    requires: [ILayoutRestorer, IRenderMimeRegistry, ISettingRegistry],
    autoStart: true
};
/**
 * Activate the markdown viewer plugin.
 */
function activate(app, restorer, rendermime, settingRegistry) {
    const { commands, docRegistry } = app;
    // Add the markdown renderer factory.
    rendermime.addFactory(markdownRendererFactory);
    const namespace = 'markdownviewer-widget';
    const tracker = new WidgetTracker({
        namespace
    });
    let config = Object.assign({}, MarkdownViewer.defaultConfig);
    /**
     * Update the settings of a widget.
     */
    function updateWidget(widget) {
        Object.keys(config).forEach((k) => {
            widget.setOption(k, config[k]);
        });
    }
    /**
     * Update the setting values.
     */
    function updateSettings(settings) {
        config = settings.composite;
        tracker.forEach(widget => {
            updateWidget(widget.content);
        });
    }
    // Fetch the initial state of the settings.
    settingRegistry
        .load(plugin.id)
        .then((settings) => {
        settings.changed.connect(() => {
            updateSettings(settings);
        });
        updateSettings(settings);
    })
        .catch((reason) => {
        console.error(reason.message);
    });
    // Register the MarkdownViewer factory.
    const factory = new MarkdownViewerFactory({
        rendermime,
        name: FACTORY,
        primaryFileType: docRegistry.getFileType('markdown'),
        fileTypes: ['markdown'],
        defaultRendered: ['markdown']
    });
    factory.widgetCreated.connect((sender, widget) => {
        // Notify the widget tracker if restore data needs to update.
        widget.context.pathChanged.connect(() => {
            void tracker.save(widget);
        });
        // Handle the settings of new widgets.
        updateWidget(widget.content);
        void tracker.add(widget);
    });
    docRegistry.addWidgetFactory(factory);
    // Handle state restoration.
    void restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({ path: widget.context.path, factory: FACTORY }),
        name: widget => widget.context.path
    });
    commands.addCommand(CommandIDs.markdownPreview, {
        label: 'Markdown Preview',
        execute: args => {
            let path = args['path'];
            if (typeof path !== 'string') {
                return;
            }
            return commands.execute('docmanager:open', {
                path,
                factory: FACTORY,
                options: args['options']
            });
        }
    });
    return tracker;
}
/**
 * Export the plugin as default.
 */
export default plugin;
//# sourceMappingURL=index.js.map