import { IClientSession } from '@jupyterlab/apputils';
import { CodeCell } from '@jupyterlab/cells';
import { KernelMessage } from '@jupyterlab/services';
import { IDisposable } from '@phosphor/disposable';
/**
 * A handler for capturing API messages from other sessions that should be
 * rendered in a given parent.
 */
export declare class ForeignHandler implements IDisposable {
    /**
     * Construct a new foreign message handler.
     */
    constructor(options: ForeignHandler.IOptions);
    /**
     * Set whether the handler is able to inject foreign cells into a console.
     */
    enabled: boolean;
    /**
     * The client session used by the foreign handler.
     */
    readonly session: IClientSession;
    /**
     * The foreign handler's parent receiver.
     */
    readonly parent: ForeignHandler.IReceiver;
    /**
     * Test whether the handler is disposed.
     */
    readonly isDisposed: boolean;
    /**
     * Dispose the resources held by the handler.
     */
    dispose(): void;
    /**
     * Handler IOPub messages.
     *
     * @returns `true` if the message resulted in a new cell injection or a
     * previously injected cell being updated and `false` for all other messages.
     */
    protected onIOPubMessage(sender: IClientSession, msg: KernelMessage.IIOPubMessage): boolean;
    /**
     * Create a new code cell for an input originated from a foreign session.
     */
    private _newCell;
    private _enabled;
    private _parent;
    private _isDisposed;
}
/**
 * A namespace for `ForeignHandler` statics.
 */
export declare namespace ForeignHandler {
    /**
     * The instantiation options for a foreign handler.
     */
    interface IOptions {
        /**
         * The client session used by the foreign handler.
         */
        session: IClientSession;
        /**
         * The parent into which the handler will inject code cells.
         */
        parent: IReceiver;
    }
    /**
     * A receiver of newly created foreign cells.
     */
    interface IReceiver {
        /**
         * Create a cell.
         */
        createCodeCell(): CodeCell;
        /**
         * Add a newly created cell.
         */
        addCell(cell: CodeCell, msgId: string): void;
        /**
         * Trigger a rendering update on the receiver.
         */
        update(): void;
        /**
         * Get a cell associated with a message id.
         */
        getCell(msgId: string): CodeCell;
    }
}
