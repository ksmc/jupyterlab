// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { CodeEditor, IEditorServices } from '@jupyterlab/codeeditor';
import { IConsoleTracker } from '@jupyterlab/console';
import { ISettingRegistry, MarkdownCodeBlocks, PathExt } from '@jupyterlab/coreutils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { FileEditorFactory, IEditorTracker, TabSpaceStatus } from '@jupyterlab/fileeditor';
import { ILauncher } from '@jupyterlab/launcher';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { IStatusBar } from '@jupyterlab/statusbar';
import { Menu } from '@phosphor/widgets';
/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-MaterialIcon jp-TextEditorIcon';
/**
 * The class name for the text editor icon from the default theme.
 */
const MARKDOWN_ICON_CLASS = 'jp-MaterialIcon jp-MarkdownIcon';
/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';
/**
 * The command IDs used by the fileeditor plugin.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.createNew = 'fileeditor:create-new';
    CommandIDs.createNewMarkdown = 'fileeditor:create-new-markdown-file';
    CommandIDs.changeFontSize = 'fileeditor:change-font-size';
    CommandIDs.lineNumbers = 'fileeditor:toggle-line-numbers';
    CommandIDs.lineWrap = 'fileeditor:toggle-line-wrap';
    CommandIDs.changeTabs = 'fileeditor:change-tabs';
    CommandIDs.matchBrackets = 'fileeditor:toggle-match-brackets';
    CommandIDs.autoClosingBrackets = 'fileeditor:toggle-autoclosing-brackets';
    CommandIDs.createConsole = 'fileeditor:create-console';
    CommandIDs.runCode = 'fileeditor:run-code';
    CommandIDs.runAllCode = 'fileeditor:run-all';
    CommandIDs.markdownPreview = 'fileeditor:markdown-preview';
})(CommandIDs || (CommandIDs = {}));
/**
 * The editor tracker extension.
 */
const plugin = {
    activate,
    id: '@jupyterlab/fileeditor-extension:plugin',
    requires: [
        IConsoleTracker,
        IEditorServices,
        IFileBrowserFactory,
        ISettingRegistry
    ],
    optional: [ICommandPalette, ILauncher, IMainMenu, ILayoutRestorer],
    provides: IEditorTracker,
    autoStart: true
};
/**
 * A plugin that provides a status item allowing the user to
 * switch tabs vs spaces and tab widths for text editors.
 */
export const tabSpaceStatus = {
    id: '@jupyterlab/fileeditor-extension:tab-space-status',
    autoStart: true,
    requires: [IStatusBar, IEditorTracker, ISettingRegistry],
    activate: (app, statusBar, editorTracker, settingRegistry) => {
        // Create a menu for switching tabs vs spaces.
        const menu = new Menu({ commands: app.commands });
        const command = 'fileeditor:change-tabs';
        const { shell } = app;
        const args = {
            insertSpaces: false,
            size: 4,
            name: 'Indent with Tab'
        };
        menu.addItem({ command, args });
        for (let size of [1, 2, 4, 8]) {
            let args = {
                insertSpaces: true,
                size,
                name: `Spaces: ${size} `
            };
            menu.addItem({ command, args });
        }
        // Create the status item.
        const item = new TabSpaceStatus({ menu });
        // Keep a reference to the code editor config from the settings system.
        const updateSettings = (settings) => {
            item.model.config = Object.assign({}, CodeEditor.defaultConfig, settings.get('editorConfig').composite);
        };
        void Promise.all([
            settingRegistry.load('@jupyterlab/fileeditor-extension:plugin'),
            app.restored
        ]).then(([settings]) => {
            updateSettings(settings);
            settings.changed.connect(updateSettings);
        });
        // Add the status item.
        statusBar.registerStatusItem('@jupyterlab/fileeditor-extension:tab-space-status', {
            item,
            align: 'right',
            rank: 1,
            isActive: () => {
                return shell.currentWidget && editorTracker.has(shell.currentWidget);
            }
        });
    }
};
/**
 * Export the plugins as default.
 */
const plugins = [plugin, tabSpaceStatus];
export default plugins;
/**
 * Activate the editor tracker plugin.
 */
function activate(app, consoleTracker, editorServices, browserFactory, settingRegistry, palette, launcher, menu, restorer) {
    const id = plugin.id;
    const namespace = 'editor';
    const factory = new FileEditorFactory({
        editorServices,
        factoryOptions: {
            name: FACTORY,
            fileTypes: ['markdown', '*'],
            defaultFor: ['markdown', '*'] // it outranks the defaultRendered viewer.
        }
    });
    const { commands, restored, shell } = app;
    const tracker = new WidgetTracker({
        namespace
    });
    const isEnabled = () => tracker.currentWidget !== null &&
        tracker.currentWidget === shell.currentWidget;
    let config = Object.assign({}, CodeEditor.defaultConfig);
    // Handle state restoration.
    if (restorer) {
        void restorer.restore(tracker, {
            command: 'docmanager:open',
            args: widget => ({ path: widget.context.path, factory: FACTORY }),
            name: widget => widget.context.path
        });
    }
    /**
     * Update the setting values.
     */
    function updateSettings(settings) {
        config = Object.assign({}, CodeEditor.defaultConfig, settings.get('editorConfig').composite);
        // Trigger a refresh of the rendered commands
        app.commands.notifyCommandChanged();
    }
    /**
     * Update the settings of the current tracker instances.
     */
    function updateTracker() {
        tracker.forEach(widget => {
            updateWidget(widget.content);
        });
    }
    /**
     * Update the settings of a widget.
     */
    function updateWidget(widget) {
        const editor = widget.editor;
        Object.keys(config).forEach((key) => {
            editor.setOption(key, config[key]);
        });
    }
    // Add a console creator to the File menu
    // Fetch the initial state of the settings.
    Promise.all([settingRegistry.load(id), restored])
        .then(([settings]) => {
        updateSettings(settings);
        updateTracker();
        settings.changed.connect(() => {
            updateSettings(settings);
            updateTracker();
        });
    })
        .catch((reason) => {
        console.error(reason.message);
        updateTracker();
    });
    factory.widgetCreated.connect((sender, widget) => {
        widget.title.icon = EDITOR_ICON_CLASS;
        // Notify the widget tracker if restore data needs to update.
        widget.context.pathChanged.connect(() => {
            void tracker.save(widget);
        });
        void tracker.add(widget);
        updateWidget(widget.content);
    });
    app.docRegistry.addWidgetFactory(factory);
    // Handle the settings of new widgets.
    tracker.widgetAdded.connect((sender, widget) => {
        updateWidget(widget.content);
    });
    // Add a command to change font size.
    commands.addCommand(CommandIDs.changeFontSize, {
        execute: args => {
            const delta = Number(args['delta']);
            if (Number.isNaN(delta)) {
                console.error(`${CommandIDs.changeFontSize}: delta arg must be a number`);
                return;
            }
            const style = window.getComputedStyle(document.documentElement);
            const cssSize = parseInt(style.getPropertyValue('--jp-code-font-size'), 10);
            const currentSize = config.fontSize || cssSize;
            config.fontSize = currentSize + delta;
            return settingRegistry
                .set(id, 'editorConfig', config)
                .catch((reason) => {
                console.error(`Failed to set ${id}: ${reason.message}`);
            });
        },
        label: args => args['name']
    });
    commands.addCommand(CommandIDs.lineNumbers, {
        execute: () => {
            config.lineNumbers = !config.lineNumbers;
            return settingRegistry
                .set(id, 'editorConfig', config)
                .catch((reason) => {
                console.error(`Failed to set ${id}: ${reason.message}`);
            });
        },
        isEnabled,
        isToggled: () => config.lineNumbers,
        label: 'Line Numbers'
    });
    commands.addCommand(CommandIDs.lineWrap, {
        execute: args => {
            const lineWrap = args['mode'] || 'off';
            config.lineWrap = lineWrap;
            return settingRegistry
                .set(id, 'editorConfig', config)
                .catch((reason) => {
                console.error(`Failed to set ${id}: ${reason.message}`);
            });
        },
        isEnabled,
        isToggled: args => {
            const lineWrap = args['mode'] || 'off';
            return config.lineWrap === lineWrap;
        },
        label: 'Word Wrap'
    });
    commands.addCommand(CommandIDs.changeTabs, {
        label: args => args['name'],
        execute: args => {
            config.tabSize = args['size'] || 4;
            config.insertSpaces = !!args['insertSpaces'];
            return settingRegistry
                .set(id, 'editorConfig', config)
                .catch((reason) => {
                console.error(`Failed to set ${id}: ${reason.message}`);
            });
        },
        isToggled: args => {
            const insertSpaces = !!args['insertSpaces'];
            const size = args['size'] || 4;
            return config.insertSpaces === insertSpaces && config.tabSize === size;
        }
    });
    commands.addCommand(CommandIDs.matchBrackets, {
        execute: () => {
            config.matchBrackets = !config.matchBrackets;
            return settingRegistry
                .set(id, 'editorConfig', config)
                .catch((reason) => {
                console.error(`Failed to set ${id}: ${reason.message}`);
            });
        },
        label: 'Match Brackets',
        isEnabled,
        isToggled: () => config.matchBrackets
    });
    commands.addCommand(CommandIDs.autoClosingBrackets, {
        execute: () => {
            config.autoClosingBrackets = !config.autoClosingBrackets;
            return settingRegistry
                .set(id, 'editorConfig', config)
                .catch((reason) => {
                console.error(`Failed to set ${id}: ${reason.message}`);
            });
        },
        label: 'Auto Close Brackets for Text Editor',
        isToggled: () => config.autoClosingBrackets
    });
    async function createConsole(widget, args) {
        const options = args || {};
        const console = await commands.execute('console:create', {
            activate: options['activate'],
            name: widget.context.contentsModel.name,
            path: widget.context.path,
            preferredLanguage: widget.context.model.defaultKernelLanguage,
            ref: widget.id,
            insertMode: 'split-bottom'
        });
        widget.context.pathChanged.connect((sender, value) => {
            console.session.setPath(value);
            console.session.setName(widget.context.contentsModel.name);
        });
    }
    commands.addCommand(CommandIDs.createConsole, {
        execute: args => {
            const widget = tracker.currentWidget;
            if (!widget) {
                return;
            }
            return createConsole(widget, args);
        },
        isEnabled,
        label: 'Create Console for Editor'
    });
    commands.addCommand(CommandIDs.runCode, {
        execute: () => {
            // Run the appropriate code, taking into account a ```fenced``` code block.
            const widget = tracker.currentWidget.content;
            if (!widget) {
                return;
            }
            let code = '';
            const editor = widget.editor;
            const path = widget.context.path;
            const extension = PathExt.extname(path);
            const selection = editor.getSelection();
            const { start, end } = selection;
            let selected = start.column !== end.column || start.line !== end.line;
            if (selected) {
                // Get the selected code from the editor.
                const start = editor.getOffsetAt(selection.start);
                const end = editor.getOffsetAt(selection.end);
                code = editor.model.value.text.substring(start, end);
            }
            else if (MarkdownCodeBlocks.isMarkdown(extension)) {
                const { text } = editor.model.value;
                const blocks = MarkdownCodeBlocks.findMarkdownCodeBlocks(text);
                for (let block of blocks) {
                    if (block.startLine <= start.line && start.line <= block.endLine) {
                        code = block.code;
                        selected = true;
                        break;
                    }
                }
            }
            if (!selected) {
                // no selection, submit whole line and advance
                code = editor.getLine(selection.start.line);
                const cursor = editor.getCursorPosition();
                if (cursor.line + 1 === editor.lineCount) {
                    let text = editor.model.value.text;
                    editor.model.value.text = text + '\n';
                }
                editor.setCursorPosition({
                    line: cursor.line + 1,
                    column: cursor.column
                });
            }
            const activate = false;
            if (code) {
                return commands.execute('console:inject', { activate, code, path });
            }
            else {
                return Promise.resolve(void 0);
            }
        },
        isEnabled,
        label: 'Run Code'
    });
    commands.addCommand(CommandIDs.runAllCode, {
        execute: () => {
            let widget = tracker.currentWidget.content;
            if (!widget) {
                return;
            }
            let code = '';
            let editor = widget.editor;
            let text = editor.model.value.text;
            let path = widget.context.path;
            let extension = PathExt.extname(path);
            if (MarkdownCodeBlocks.isMarkdown(extension)) {
                // For Markdown files, run only code blocks.
                const blocks = MarkdownCodeBlocks.findMarkdownCodeBlocks(text);
                for (let block of blocks) {
                    code += block.code;
                }
            }
            else {
                code = text;
            }
            const activate = false;
            if (code) {
                return commands.execute('console:inject', { activate, code, path });
            }
            else {
                return Promise.resolve(void 0);
            }
        },
        isEnabled,
        label: 'Run All Code'
    });
    commands.addCommand(CommandIDs.markdownPreview, {
        execute: () => {
            let widget = tracker.currentWidget;
            if (!widget) {
                return;
            }
            let path = widget.context.path;
            return commands.execute('markdownviewer:open', {
                path,
                options: {
                    mode: 'split-right'
                }
            });
        },
        isVisible: () => {
            let widget = tracker.currentWidget;
            return ((widget && PathExt.extname(widget.context.path) === '.md') || false);
        },
        label: 'Show Markdown Preview'
    });
    // Function to create a new untitled text file, given
    // the current working directory.
    const createNew = (cwd, ext = 'txt') => {
        return commands
            .execute('docmanager:new-untitled', {
            path: cwd,
            type: 'file',
            ext
        })
            .then(model => {
            return commands.execute('docmanager:open', {
                path: model.path,
                factory: FACTORY
            });
        });
    };
    // Add a command for creating a new text file.
    commands.addCommand(CommandIDs.createNew, {
        label: args => (args['isPalette'] ? 'New Text File' : 'Text File'),
        caption: 'Create a new text file',
        iconClass: args => (args['isPalette'] ? '' : EDITOR_ICON_CLASS),
        execute: args => {
            let cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
            return createNew(cwd);
        }
    });
    // Add a command for creating a new Markdown file.
    commands.addCommand(CommandIDs.createNewMarkdown, {
        label: args => (args['isPalette'] ? 'New Markdown File' : 'Markdown File'),
        caption: 'Create a new markdown file',
        iconClass: args => (args['isPalette'] ? '' : MARKDOWN_ICON_CLASS),
        execute: args => {
            let cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
            return createNew(cwd, 'md');
        }
    });
    // Add a launcher item if the launcher is available.
    if (launcher) {
        launcher.add({
            command: CommandIDs.createNew,
            category: 'Other',
            rank: 1
        });
        launcher.add({
            command: CommandIDs.createNewMarkdown,
            category: 'Other',
            rank: 2
        });
    }
    if (palette) {
        const category = 'Text Editor';
        let args = {
            insertSpaces: false,
            size: 4,
            name: 'Indent with Tab'
        };
        let command = 'fileeditor:change-tabs';
        palette.addItem({ command, args, category });
        for (let size of [1, 2, 4, 8]) {
            let args = {
                insertSpaces: true,
                size,
                name: `Spaces: ${size} `
            };
            palette.addItem({ command, args, category });
        }
        args = { isPalette: true };
        command = CommandIDs.createNew;
        palette.addItem({ command, args, category });
        args = { isPalette: true };
        command = CommandIDs.createNewMarkdown;
        palette.addItem({ command, args, category });
        args = { name: 'Increase Font Size', delta: 1 };
        command = CommandIDs.changeFontSize;
        palette.addItem({ command, args, category });
        args = { name: 'Decrease Font Size', delta: -1 };
        command = CommandIDs.changeFontSize;
        palette.addItem({ command, args, category });
    }
    if (menu) {
        // Add the editing commands to the settings menu.
        const tabMenu = new Menu({ commands });
        tabMenu.title.label = 'Text Editor Indentation';
        let args = {
            insertSpaces: false,
            size: 4,
            name: 'Indent with Tab'
        };
        let command = 'fileeditor:change-tabs';
        tabMenu.addItem({ command, args });
        for (let size of [1, 2, 4, 8]) {
            let args = {
                insertSpaces: true,
                size,
                name: `Spaces: ${size} `
            };
            tabMenu.addItem({ command, args });
        }
        menu.settingsMenu.addGroup([
            {
                command: CommandIDs.changeFontSize,
                args: { name: 'Increase Text Editor Font Size', delta: +1 }
            },
            {
                command: CommandIDs.changeFontSize,
                args: { name: 'Decrease Text Editor Font Size', delta: -1 }
            },
            { type: 'submenu', submenu: tabMenu },
            { command: CommandIDs.autoClosingBrackets }
        ], 30);
        // Add new text file creation to the file menu.
        menu.fileMenu.newMenu.addGroup([{ command: CommandIDs.createNew }], 30);
        // Add new markdown file creation to the file menu.
        menu.fileMenu.newMenu.addGroup([{ command: CommandIDs.createNewMarkdown }], 30);
        // Add undo/redo hooks to the edit menu.
        menu.editMenu.undoers.add({
            tracker,
            undo: widget => {
                widget.content.editor.undo();
            },
            redo: widget => {
                widget.content.editor.redo();
            }
        });
        // Add editor view options.
        menu.viewMenu.editorViewers.add({
            tracker,
            toggleLineNumbers: widget => {
                const lineNumbers = !widget.content.editor.getOption('lineNumbers');
                widget.content.editor.setOption('lineNumbers', lineNumbers);
            },
            toggleWordWrap: widget => {
                const oldValue = widget.content.editor.getOption('lineWrap');
                const newValue = oldValue === 'off' ? 'on' : 'off';
                widget.content.editor.setOption('lineWrap', newValue);
            },
            toggleMatchBrackets: widget => {
                const matchBrackets = !widget.content.editor.getOption('matchBrackets');
                widget.content.editor.setOption('matchBrackets', matchBrackets);
            },
            lineNumbersToggled: widget => widget.content.editor.getOption('lineNumbers'),
            wordWrapToggled: widget => widget.content.editor.getOption('lineWrap') !== 'off',
            matchBracketsToggled: widget => widget.content.editor.getOption('matchBrackets')
        });
        // Add a console creator the the Kernel menu.
        menu.fileMenu.consoleCreators.add({
            tracker,
            name: 'Editor',
            createConsole
        });
        // Add a code runner to the Run menu.
        menu.runMenu.codeRunners.add({
            tracker,
            noun: 'Code',
            isEnabled: current => !!consoleTracker.find(c => c.session.path === current.context.path),
            run: () => commands.execute(CommandIDs.runCode),
            runAll: () => commands.execute(CommandIDs.runAllCode),
            restartAndRunAll: current => {
                const console = consoleTracker.find(console => console.session.path === current.context.path);
                if (console) {
                    return console.session.restart().then(restarted => {
                        if (restarted) {
                            void commands.execute(CommandIDs.runAllCode);
                        }
                        return restarted;
                    });
                }
            }
        });
    }
    app.contextMenu.addItem({
        command: CommandIDs.createConsole,
        selector: '.jp-FileEditor'
    });
    app.contextMenu.addItem({
        command: CommandIDs.markdownPreview,
        selector: '.jp-FileEditor'
    });
    return tracker;
}
//# sourceMappingURL=index.js.map