// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ClientSession } from '@jupyterlab/apputils';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { UUID } from '@phosphor/coreutils';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { Token } from '@phosphor/coreutils';
import { Panel } from '@phosphor/widgets';
import { CodeConsole } from './widget';
/**
 * The class name added to console panels.
 */
const PANEL_CLASS = 'jp-ConsolePanel';
const CONSOLE_ICON_CLASS = 'jp-CodeConsoleIcon';
/**
 * A panel which contains a console and the ability to add other children.
 */
export class ConsolePanel extends Panel {
    /**
     * Construct a console panel.
     */
    constructor(options) {
        super();
        this._executed = null;
        this._connected = null;
        this.addClass(PANEL_CLASS);
        let { rendermime, mimeTypeService, path, basePath, name, manager, modelFactory } = options;
        let contentFactory = (this.contentFactory =
            options.contentFactory || ConsolePanel.defaultContentFactory);
        let count = Private.count++;
        if (!path) {
            path = `${basePath || ''}/console-${count}-${UUID.uuid4()}`;
        }
        let session = (this._session = new ClientSession({
            manager: manager.sessions,
            path,
            name: name || `Console ${count}`,
            type: 'console',
            kernelPreference: options.kernelPreference,
            setBusy: options.setBusy
        }));
        let resolver = new RenderMimeRegistry.UrlResolver({
            session,
            contents: manager.contents
        });
        rendermime = rendermime.clone({ resolver });
        this.console = contentFactory.createConsole({
            rendermime,
            session,
            mimeTypeService,
            contentFactory,
            modelFactory
        });
        this.addWidget(this.console);
        void session.initialize().then(() => {
            this._connected = new Date();
            this._updateTitle();
        });
        this.console.executed.connect(this._onExecuted, this);
        this._updateTitle();
        session.kernelChanged.connect(this._updateTitle, this);
        session.propertyChanged.connect(this._updateTitle, this);
        this.title.icon = CONSOLE_ICON_CLASS;
        this.title.closable = true;
        this.id = `console-${count}`;
    }
    /**
     * The session used by the panel.
     */
    get session() {
        return this._session;
    }
    /**
     * Dispose of the resources held by the widget.
     */
    dispose() {
        this.session.dispose();
        this.console.dispose();
        super.dispose();
    }
    /**
     * Handle `'activate-request'` messages.
     */
    onActivateRequest(msg) {
        let prompt = this.console.promptCell;
        if (prompt) {
            prompt.editor.focus();
        }
    }
    /**
     * Handle `'close-request'` messages.
     */
    onCloseRequest(msg) {
        super.onCloseRequest(msg);
        this.dispose();
    }
    /**
     * Handle a console execution.
     */
    _onExecuted(sender, args) {
        this._executed = args;
        this._updateTitle();
    }
    /**
     * Update the console panel title.
     */
    _updateTitle() {
        Private.updateTitle(this, this._connected, this._executed);
    }
}
/**
 * A namespace for ConsolePanel statics.
 */
(function (ConsolePanel) {
    /**
     * Default implementation of `IContentFactory`.
     */
    class ContentFactory extends CodeConsole.ContentFactory {
        /**
         * Create a new console panel.
         */
        createConsole(options) {
            return new CodeConsole(options);
        }
    }
    ConsolePanel.ContentFactory = ContentFactory;
    /**
     * A default code console content factory.
     */
    ConsolePanel.defaultContentFactory = new ContentFactory();
    /* tslint:disable */
    /**
     * The console renderer token.
     */
    ConsolePanel.IContentFactory = new Token('@jupyterlab/console:IContentFactory');
    /* tslint:enable */
})(ConsolePanel || (ConsolePanel = {}));
/**
 * A namespace for private data.
 */
var Private;
(function (Private) {
    /**
     * The counter for new consoles.
     */
    Private.count = 1;
    /**
     * Update the title of a console panel.
     */
    function updateTitle(panel, connected, executed) {
        let session = panel.console.session;
        let caption = `Name: ${session.name}\n` +
            `Directory: ${PathExt.dirname(session.path)}\n` +
            `Kernel: ${session.kernelDisplayName}`;
        if (connected) {
            caption += `\nConnected: ${Time.format(connected.toISOString())}`;
        }
        if (executed) {
            caption += `\nLast Execution: ${Time.format(executed.toISOString())}`;
        }
        panel.title.label = session.name || 'Console';
        panel.title.caption = caption;
    }
    Private.updateTitle = updateTitle;
})(Private || (Private = {}));
//# sourceMappingURL=panel.js.map