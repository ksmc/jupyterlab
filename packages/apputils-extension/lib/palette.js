/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { find } from '@phosphor/algorithm';
import { CommandRegistry } from '@phosphor/commands';
import { DisposableDelegate } from '@phosphor/disposable';
import { CommandPalette } from '@phosphor/widgets';
/**
 * The command IDs used by the apputils extension.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.activate = 'apputils:activate-command-palette';
})(CommandIDs || (CommandIDs = {}));
/**
 * A thin wrapper around the `CommandPalette` class to conform with the
 * JupyterLab interface for the application-wide command palette.
 */
export class Palette {
    /**
     * Create a palette instance.
     */
    constructor(palette) {
        this._palette = palette;
        this._palette.title.iconClass = 'jp-PaletteIcon jp-SideBar-tabIcon';
        this._palette.title.label = '';
        this._palette.title.caption = 'Command Palette';
    }
    /**
     * The placeholder text of the command palette's search input.
     */
    set placeholder(placeholder) {
        this._palette.inputNode.placeholder = placeholder;
    }
    get placeholder() {
        return this._palette.inputNode.placeholder;
    }
    /**
     * Activate the command palette for user input.
     */
    activate() {
        this._palette.activate();
    }
    /**
     * Add a command item to the command palette.
     *
     * @param options - The options for creating the command item.
     *
     * @returns A disposable that will remove the item from the palette.
     */
    addItem(options) {
        let item = this._palette.addItem(options);
        return new DisposableDelegate(() => {
            this._palette.removeItem(item);
        });
    }
}
/**
 * A namespace for `Palette` statics.
 */
(function (Palette) {
    /**
     * Activate the command palette.
     */
    function activate(app) {
        const { commands, shell } = app;
        const palette = Private.createPalette(app);
        // Show the current palette shortcut in its title.
        const updatePaletteTitle = () => {
            const binding = find(app.commands.keyBindings, b => b.command === CommandIDs.activate);
            if (binding) {
                const ks = CommandRegistry.formatKeystroke(binding.keys.join(' '));
                palette.title.caption = `Commands (${ks})`;
            }
            else {
                palette.title.caption = 'Commands';
            }
        };
        updatePaletteTitle();
        app.commands.keyBindingChanged.connect(() => {
            updatePaletteTitle();
        });
        commands.addCommand(CommandIDs.activate, {
            execute: () => {
                shell.activateById(palette.id);
            },
            label: 'Activate Command Palette'
        });
        palette.inputNode.placeholder = 'SEARCH';
        shell.add(palette, 'left', { rank: 300 });
        return new Palette(palette);
    }
    Palette.activate = activate;
    /**
     * Restore the command palette.
     */
    function restore(app, restorer) {
        const palette = Private.createPalette(app);
        // Let the application restorer track the command palette for restoration of
        // application state (e.g. setting the command palette as the current side bar
        // widget).
        restorer.add(palette, 'command-palette');
    }
    Palette.restore = restore;
})(Palette || (Palette = {}));
/**
 * The namespace for module private data.
 */
var Private;
(function (Private) {
    /**
     * The private command palette instance.
     */
    let palette;
    /**
     * Create the application-wide command palette.
     */
    function createPalette(app) {
        if (!palette) {
            palette = new CommandPalette({ commands: app.commands });
            palette.id = 'command-palette';
            palette.title.label = 'Commands';
        }
        return palette;
    }
    Private.createPalette = createPalette;
})(Private || (Private = {}));
//# sourceMappingURL=palette.js.map