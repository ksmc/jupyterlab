/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { ISettingRegistry, IStateDB } from '@jupyterlab/coreutils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingEditorTracker, SettingEditor } from '@jupyterlab/settingeditor';
/**
 * The command IDs used by the setting editor.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.open = 'settingeditor:open';
    CommandIDs.revert = 'settingeditor:revert';
    CommandIDs.save = 'settingeditor:save';
})(CommandIDs || (CommandIDs = {}));
/**
 * The default setting editor extension.
 */
const plugin = {
    id: '@jupyterlab/settingeditor-extension:plugin',
    requires: [
        ILayoutRestorer,
        ISettingRegistry,
        IEditorServices,
        IStateDB,
        IRenderMimeRegistry,
        ICommandPalette
    ],
    autoStart: true,
    provides: ISettingEditorTracker,
    activate
};
/**
 * Activate the setting editor extension.
 */
function activate(app, restorer, registry, editorServices, state, rendermime, palette) {
    const { commands, shell } = app;
    const namespace = 'setting-editor';
    const factoryService = editorServices.factoryService;
    const editorFactory = factoryService.newInlineEditor;
    const tracker = new WidgetTracker({
        namespace
    });
    let editor;
    // Handle state restoration.
    void restorer.restore(tracker, {
        command: CommandIDs.open,
        args: widget => ({}),
        name: widget => namespace
    });
    commands.addCommand(CommandIDs.open, {
        execute: () => {
            if (tracker.currentWidget) {
                shell.activateById(tracker.currentWidget.id);
                return;
            }
            const key = plugin.id;
            const when = app.restored;
            editor = new SettingEditor({
                commands: {
                    registry: commands,
                    revert: CommandIDs.revert,
                    save: CommandIDs.save
                },
                editorFactory,
                key,
                registry,
                rendermime,
                state,
                when
            });
            // Notify the command registry when the visibility status of the setting
            // editor's commands change. The setting editor toolbar listens for this
            // signal from the command registry.
            editor.commandsChanged.connect((sender, args) => {
                args.forEach(id => {
                    commands.notifyCommandChanged(id);
                });
            });
            editor.id = namespace;
            editor.title.label = 'Settings';
            editor.title.iconClass = 'jp-SettingsIcon';
            let main = new MainAreaWidget({ content: editor });
            void tracker.add(main);
            shell.add(main);
        },
        label: 'Advanced Settings Editor'
    });
    palette.addItem({ category: 'Settings', command: CommandIDs.open });
    commands.addCommand(CommandIDs.revert, {
        execute: () => {
            tracker.currentWidget.content.revert();
        },
        iconClass: 'jp-MaterialIcon jp-UndoIcon',
        label: 'Revert User Settings',
        isEnabled: () => tracker.currentWidget.content.canRevertRaw
    });
    commands.addCommand(CommandIDs.save, {
        execute: () => tracker.currentWidget.content.save(),
        iconClass: 'jp-MaterialIcon jp-SaveIcon',
        label: 'Save User Settings',
        isEnabled: () => tracker.currentWidget.content.canSaveRaw
    });
    return tracker;
}
export default plugin;
//# sourceMappingURL=index.js.map