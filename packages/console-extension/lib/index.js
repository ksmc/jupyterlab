// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ILabStatus, ILayoutRestorer } from '@jupyterlab/application';
import { Dialog, ICommandPalette, showDialog, WidgetTracker } from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';
import { ISettingRegistry, PageConfig, URLExt } from '@jupyterlab/coreutils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ILauncher } from '@jupyterlab/launcher';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { find } from '@phosphor/algorithm';
import { DisposableSet } from '@phosphor/disposable';
import { Menu } from '@phosphor/widgets';
import foreign from './foreign';
/**
 * The command IDs used by the console plugin.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.create = 'console:create';
    CommandIDs.clear = 'console:clear';
    CommandIDs.runUnforced = 'console:run-unforced';
    CommandIDs.runForced = 'console:run-forced';
    CommandIDs.linebreak = 'console:linebreak';
    CommandIDs.interrupt = 'console:interrupt-kernel';
    CommandIDs.restart = 'console:restart-kernel';
    CommandIDs.closeAndShutdown = 'console:close-and-shutdown';
    CommandIDs.open = 'console:open';
    CommandIDs.inject = 'console:inject';
    CommandIDs.changeKernel = 'console:change-kernel';
    CommandIDs.enterToExecute = 'console:enter-to-execute';
    CommandIDs.shiftEnterToExecute = 'console:shift-enter-to-execute';
    CommandIDs.interactionMode = 'console:interaction-mode';
})(CommandIDs || (CommandIDs = {}));
/**
 * The console widget tracker provider.
 */
const tracker = {
    id: '@jupyterlab/console-extension:tracker',
    provides: IConsoleTracker,
    requires: [
        IMainMenu,
        ICommandPalette,
        ConsolePanel.IContentFactory,
        IEditorServices,
        ILayoutRestorer,
        IFileBrowserFactory,
        IRenderMimeRegistry,
        ISettingRegistry
    ],
    optional: [ILauncher, ILabStatus],
    activate: activateConsole,
    autoStart: true
};
/**
 * The console widget content factory.
 */
const factory = {
    id: '@jupyterlab/console-extension:factory',
    provides: ConsolePanel.IContentFactory,
    requires: [IEditorServices],
    autoStart: true,
    activate: (app, editorServices) => {
        const editorFactory = editorServices.factoryService.newInlineEditor;
        return new ConsolePanel.ContentFactory({ editorFactory });
    }
};
/**
 * Export the plugins as the default.
 */
const plugins = [factory, tracker, foreign];
export default plugins;
/**
 * Activate the console extension.
 */
async function activateConsole(app, mainMenu, palette, contentFactory, editorServices, restorer, browserFactory, rendermime, settingRegistry, launcher, status) {
    const manager = app.serviceManager;
    const { commands, shell } = app;
    const category = 'Console';
    // Create a widget tracker for all console panels.
    const tracker = new WidgetTracker({ namespace: 'console' });
    // Handle state restoration.
    void restorer.restore(tracker, {
        command: CommandIDs.create,
        args: panel => ({
            path: panel.console.session.path,
            name: panel.console.session.name,
            kernelPreference: {
                name: panel.console.session.kernelPreference.name,
                language: panel.console.session.kernelPreference.language
            }
        }),
        name: panel => panel.console.session.path,
        when: manager.ready
    });
    // Add a launcher item if the launcher is available.
    if (launcher) {
        void manager.ready.then(() => {
            let disposables = null;
            const onSpecsChanged = () => {
                if (disposables) {
                    disposables.dispose();
                    disposables = null;
                }
                const specs = manager.specs;
                if (!specs) {
                    return;
                }
                disposables = new DisposableSet();
                let baseUrl = PageConfig.getBaseUrl();
                for (let name in specs.kernelspecs) {
                    let rank = name === specs.default ? 0 : Infinity;
                    let kernelIconUrl = specs.kernelspecs[name].resources['logo-64x64'];
                    if (kernelIconUrl) {
                        let index = kernelIconUrl.indexOf('kernelspecs');
                        kernelIconUrl = URLExt.join(baseUrl, kernelIconUrl.slice(index));
                    }
                    disposables.add(launcher.add({
                        command: CommandIDs.create,
                        args: { isLauncher: true, kernelPreference: { name } },
                        category: 'Console',
                        rank,
                        kernelIconUrl
                    }));
                }
            };
            onSpecsChanged();
            manager.specsChanged.connect(onSpecsChanged);
        });
    }
    /**
     * Create a console for a given path.
     */
    async function createConsole(options) {
        await manager.ready;
        const panel = new ConsolePanel(Object.assign({ manager,
            contentFactory, mimeTypeService: editorServices.mimeTypeService, rendermime, setBusy: status && (() => status.setBusy()) }, options));
        const interactionMode = (await settingRegistry.get('@jupyterlab/console-extension:tracker', 'interactionMode')).composite;
        panel.console.node.dataset.jpInteractionMode = interactionMode;
        // Add the console panel to the tracker. We want the panel to show up before
        // any kernel selection dialog, so we do not await panel.session.ready;
        await tracker.add(panel);
        panel.session.propertyChanged.connect(() => tracker.save(panel));
        shell.add(panel, 'main', {
            ref: options.ref,
            mode: options.insertMode,
            activate: options.activate
        });
        return panel;
    }
    const pluginId = '@jupyterlab/console-extension:tracker';
    let interactionMode;
    async function updateSettings() {
        interactionMode = (await settingRegistry.get(pluginId, 'interactionMode'))
            .composite;
        tracker.forEach(panel => {
            panel.console.node.dataset.jpInteractionMode = interactionMode;
        });
    }
    settingRegistry.pluginChanged.connect((sender, plugin) => {
        if (plugin === pluginId) {
            void updateSettings();
        }
    });
    await updateSettings();
    /**
     * Whether there is an active console.
     */
    function isEnabled() {
        return (tracker.currentWidget !== null &&
            tracker.currentWidget === shell.currentWidget);
    }
    let command = CommandIDs.open;
    commands.addCommand(command, {
        execute: (args) => {
            let path = args['path'];
            let widget = tracker.find(value => {
                return value.console.session.path === path;
            });
            if (widget) {
                if (args['activate'] !== false) {
                    shell.activateById(widget.id);
                }
                return widget;
            }
            else {
                return manager.ready.then(() => {
                    let model = find(manager.sessions.running(), item => {
                        return item.path === path;
                    });
                    if (model) {
                        return createConsole(args);
                    }
                    return Promise.reject(`No running kernel session for path: ${path}`);
                });
            }
        }
    });
    command = CommandIDs.create;
    commands.addCommand(command, {
        label: args => {
            if (args['isPalette']) {
                return 'New Console';
            }
            else if (args['isLauncher'] && args['kernelPreference']) {
                const kernelPreference = args['kernelPreference'];
                return manager.specs.kernelspecs[kernelPreference.name].display_name;
            }
            return 'Console';
        },
        iconClass: args => (args['isPalette'] ? '' : 'jp-CodeConsoleIcon'),
        execute: args => {
            let basePath = args['basePath'] ||
                args['cwd'] ||
                browserFactory.defaultBrowser.model.path;
            return createConsole(Object.assign({ basePath }, args));
        }
    });
    // Get the current widget and activate unless the args specify otherwise.
    function getCurrent(args) {
        let widget = tracker.currentWidget;
        let activate = args['activate'] !== false;
        if (activate && widget) {
            shell.activateById(widget.id);
        }
        return widget;
    }
    commands.addCommand(CommandIDs.clear, {
        label: 'Clear Console Cells',
        execute: args => {
            let current = getCurrent(args);
            if (!current) {
                return;
            }
            current.console.clear();
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.runUnforced, {
        label: 'Run Cell (unforced)',
        execute: args => {
            let current = getCurrent(args);
            if (!current) {
                return;
            }
            return current.console.execute();
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.runForced, {
        label: 'Run Cell (forced)',
        execute: args => {
            let current = getCurrent(args);
            if (!current) {
                return;
            }
            return current.console.execute(true);
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.linebreak, {
        label: 'Insert Line Break',
        execute: args => {
            let current = getCurrent(args);
            if (!current) {
                return;
            }
            current.console.insertLinebreak();
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.interrupt, {
        label: 'Interrupt Kernel',
        execute: args => {
            let current = getCurrent(args);
            if (!current) {
                return;
            }
            let kernel = current.console.session.kernel;
            if (kernel) {
                return kernel.interrupt();
            }
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.restart, {
        label: 'Restart Kernel…',
        execute: args => {
            let current = getCurrent(args);
            if (!current) {
                return;
            }
            return current.console.session.restart();
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.closeAndShutdown, {
        label: 'Close and Shut Down…',
        execute: args => {
            const current = getCurrent(args);
            if (!current) {
                return;
            }
            return showDialog({
                title: 'Shut down the console?',
                body: `Are you sure you want to close "${current.title.label}"?`,
                buttons: [Dialog.cancelButton(), Dialog.warnButton()]
            }).then(result => {
                if (result.button.accept) {
                    return current.console.session.shutdown().then(() => {
                        current.dispose();
                        return true;
                    });
                }
                else {
                    return false;
                }
            });
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.inject, {
        execute: args => {
            let path = args['path'];
            tracker.find(widget => {
                if (widget.console.session.path === path) {
                    if (args['activate'] !== false) {
                        shell.activateById(widget.id);
                    }
                    void widget.console.inject(args['code'], args['metadata']);
                    return true;
                }
                return false;
            });
        },
        isEnabled
    });
    commands.addCommand(CommandIDs.changeKernel, {
        label: 'Change Kernel…',
        execute: args => {
            let current = getCurrent(args);
            if (!current) {
                return;
            }
            return current.console.session.selectKernel();
        },
        isEnabled
    });
    // Add command palette items
    [
        CommandIDs.create,
        CommandIDs.linebreak,
        CommandIDs.clear,
        CommandIDs.runUnforced,
        CommandIDs.runForced,
        CommandIDs.restart,
        CommandIDs.interrupt,
        CommandIDs.changeKernel,
        CommandIDs.closeAndShutdown
    ].forEach(command => {
        palette.addItem({ command, category, args: { isPalette: true } });
    });
    // Add a console creator to the File menu
    mainMenu.fileMenu.newMenu.addGroup([{ command: CommandIDs.create }], 0);
    // Add a close and shutdown command to the file menu.
    mainMenu.fileMenu.closeAndCleaners.add({
        tracker,
        action: 'Shutdown',
        name: 'Console',
        closeAndCleanup: (current) => {
            return showDialog({
                title: 'Shut down the console?',
                body: `Are you sure you want to close "${current.title.label}"?`,
                buttons: [Dialog.cancelButton(), Dialog.warnButton()]
            }).then(result => {
                if (result.button.accept) {
                    return current.console.session.shutdown().then(() => {
                        current.dispose();
                    });
                }
                else {
                    return void 0;
                }
            });
        }
    });
    // Add a kernel user to the Kernel menu
    mainMenu.kernelMenu.kernelUsers.add({
        tracker,
        interruptKernel: current => {
            let kernel = current.console.session.kernel;
            if (kernel) {
                return kernel.interrupt();
            }
            return Promise.resolve(void 0);
        },
        noun: 'Console',
        restartKernel: current => current.console.session.restart(),
        restartKernelAndClear: current => {
            return current.console.session.restart().then(restarted => {
                if (restarted) {
                    current.console.clear();
                }
                return restarted;
            });
        },
        changeKernel: current => current.console.session.selectKernel(),
        shutdownKernel: current => current.console.session.shutdown()
    });
    // Add a code runner to the Run menu.
    mainMenu.runMenu.codeRunners.add({
        tracker,
        noun: 'Cell',
        pluralNoun: 'Cells',
        run: current => current.console.execute(true)
    });
    // Add a clearer to the edit menu
    mainMenu.editMenu.clearers.add({
        tracker,
        noun: 'Console Cells',
        clearCurrent: (current) => {
            return current.console.clear();
        }
    });
    // For backwards compatibility and clarity, we explicitly label the run
    // keystroke with the actual effected change, rather than the generic
    // "notebook" or "terminal" interaction mode. When this interaction mode
    // affects more than just the run keystroke, we can make this menu title more
    // generic.
    const runShortcutTitles = {
        notebook: 'Execute with Shift+Enter',
        terminal: 'Execute with Enter'
    };
    // Add the execute keystroke setting submenu.
    commands.addCommand(CommandIDs.interactionMode, {
        label: args => runShortcutTitles[args['interactionMode']] || '',
        execute: async (args) => {
            const key = 'keyMap';
            try {
                await settingRegistry.set(pluginId, 'interactionMode', args['interactionMode']);
            }
            catch (reason) {
                console.error(`Failed to set ${pluginId}:${key} - ${reason.message}`);
            }
        },
        isToggled: args => args['interactionMode'] === interactionMode
    });
    const executeMenu = new Menu({ commands });
    executeMenu.title.label = 'Console Run Keystroke';
    ['terminal', 'notebook'].forEach(name => executeMenu.addItem({
        command: CommandIDs.interactionMode,
        args: { interactionMode: name }
    }));
    mainMenu.settingsMenu.addGroup([
        {
            type: 'submenu',
            submenu: executeMenu
        }
    ], 10);
    // Add kernel information to the application help menu.
    mainMenu.helpMenu.kernelUsers.add({
        tracker,
        getKernel: current => current.session.kernel
    });
    app.contextMenu.addItem({
        command: CommandIDs.clear,
        selector: '.jp-CodeConsole-content'
    });
    app.contextMenu.addItem({
        command: CommandIDs.restart,
        selector: '.jp-CodeConsole'
    });
    return tracker;
}
//# sourceMappingURL=index.js.map