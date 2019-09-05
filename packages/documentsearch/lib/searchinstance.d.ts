import { ISearchProvider } from './interfaces';
import { IDisposable } from '@phosphor/disposable';
import { ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
/**
 * Represents a search on a single widget.
 */
export declare class SearchInstance implements IDisposable {
    constructor(widget: Widget, searchProvider: ISearchProvider);
    /**
     * The search widget.
     */
    readonly searchWidget: Widget;
    /**
     * The search provider.
     */
    readonly provider: ISearchProvider<Widget>;
    /**
     * Focus the search widget input.
     */
    focusInput(): void;
    /**
     * Updates the match index and total display in the search widget.
     */
    updateIndices(): void;
    private _updateDisplay;
    private _startQuery;
    private _replaceCurrent;
    private _replaceAll;
    /**
     * Dispose of the resources held by the search instance.
     */
    dispose(): void;
    /**
     * Test if the object has been disposed.
     */
    readonly isDisposed: boolean;
    /**
     * A signal emitted when the object is disposed.
     */
    readonly disposed: ISignal<this, void>;
    /**
     * Display search widget.
     */
    _displaySearchWidget(): void;
    private _highlightNext;
    private _highlightPrevious;
    private _onCaseSensitiveToggled;
    private _onRegexToggled;
    private _widget;
    private _displayState;
    private _displayUpdateSignal;
    private _activeProvider;
    private _searchWidget;
    private _isDisposed;
    private _disposed;
}
