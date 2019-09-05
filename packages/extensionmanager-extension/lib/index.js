// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ILabShell, ILayoutRestorer } from '@jupyterlab/application';
import { Dialog, showDialog, ICommandPalette } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ExtensionView } from '@jupyterlab/extensionmanager';
/**
 * IDs of the commands added by this extension.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.toggle = 'extensionmanager:toggle';
})(CommandIDs || (CommandIDs = {}));
/**
 * The extension manager plugin.
 */
const plugin = {
    id: '@jupyterlab/extensionmanager-extension:plugin',
    autoStart: true,
    requires: [ISettingRegistry],
    optional: [ILabShell, ILayoutRestorer, IMainMenu, ICommandPalette],
    activate: async (app, registry, labShell, restorer, mainMenu, palette) => {
        const settings = await registry.load(plugin.id);
        let enabled = settings.composite['enabled'] === true;
        const { commands, serviceManager, shell } = app;
        let view;
        const createView = () => {
            const v = new ExtensionView(serviceManager);
            v.id = 'extensionmanager.main-view';
            v.title.iconClass = 'jp-ExtensionIcon jp-SideBar-tabIcon';
            v.title.caption = 'Extension Manager';
            if (restorer) {
                restorer.add(v, v.id);
            }
            return v;
        };
        if (enabled) {
            view = createView();
            shell.add(view, 'left', { rank: 1000 });
        }
        // If the extension is enabled or disabled,
        // add or remove it from the left area.
        void app.restored.then(() => {
            settings.changed.connect(async () => {
                enabled = settings.composite['enabled'] === true;
                if (enabled && (!view || (view && !view.isAttached))) {
                    const accepted = await Private.showWarning();
                    if (!accepted) {
                        void settings.set('enabled', false);
                        return;
                    }
                    view = view || createView();
                    shell.add(view, 'left');
                }
                else if (!enabled && view && view.isAttached) {
                    view.close();
                }
            });
        });
        commands.addCommand(CommandIDs.toggle, {
            label: 'Enable Extension Manager (experimental)',
            execute: () => {
                if (registry) {
                    void registry.set(plugin.id, 'enabled', !enabled);
                }
            },
            isToggled: () => enabled,
            isEnabled: () => serviceManager.builder.isAvailable
        });
        const category = 'Extension Manager';
        const command = CommandIDs.toggle;
        if (palette) {
            palette.addItem({ command, category });
        }
        if (mainMenu) {
            mainMenu.settingsMenu.addGroup([{ command }], 100);
        }
    }
};
/**
 * Export the plugin as the default.
 */
export default plugin;
/**
 * A namespace for module-private functions.
 */
var Private;
(function (Private) {
    /**
     * Show a warning dialog about extension security.
     *
     * @returns whether the user accepted the dialog.
     */
    async function showWarning() {
        return showDialog({
            title: 'Enable Extension Manager?',
            body: "Thanks for trying out JupyterLab's extension manager. " +
                'The JupyterLab development team is excited to have a robust ' +
                'third-party extension community. ' +
                'However, we cannot vouch for every extension, ' +
                'and some may introduce security risks. ' +
                'Do you want to continue?',
            buttons: [
                Dialog.cancelButton({ label: 'Disable' }),
                Dialog.warnButton({ label: 'Enable' })
            ]
        }).then(result => {
            if (result.button.accept) {
                return true;
            }
            else {
                return false;
            }
        });
    }
    Private.showWarning = showWarning;
})(Private || (Private = {}));
//# sourceMappingURL=index.js.map