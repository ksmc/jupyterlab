/// <reference types="react" />
import { ISignal } from '@phosphor/signaling';
import { ReactWidget } from '@jupyterlab/apputils';
import { ServiceManager, Session, TerminalSession } from '@jupyterlab/services';
/**
 * A class that exposes the running terminal and kernel sessions.
 */
export declare class RunningSessions extends ReactWidget {
    /**
     * Construct a new running widget.
     */
    constructor(options: RunningSessions.IOptions);
    protected render(): JSX.Element;
    /**
     * A signal emitted when a kernel session open is requested.
     */
    readonly sessionOpenRequested: ISignal<this, Session.IModel>;
    /**
     * A signal emitted when a terminal session open is requested.
     */
    readonly terminalOpenRequested: ISignal<this, TerminalSession.IModel>;
    private _sessionOpenRequested;
    private _terminalOpenRequested;
    private options;
}
/**
 * The namespace for the `RunningSessions` class statics.
 */
export declare namespace RunningSessions {
    /**
     * An options object for creating a running sessions widget.
     */
    interface IOptions {
        /**
         * A service manager instance.
         */
        manager: ServiceManager.IManager;
    }
}
