import { ABCWidgetFactory, DocumentRegistry, IDocumentWidget, DocumentWidget } from '@jupyterlab/docregistry';
import { DataGrid, TextRenderer, CellRenderer } from '@phosphor/datagrid';
import { Message } from '@phosphor/messaging';
import { Widget } from '@phosphor/widgets';
/**
 * Configuration for cells textrenderer.
 */
export declare class TextRenderConfig {
    /**
     * default text color
     */
    textColor: string;
    /**
     * background color for a search match
     */
    matchBackgroundColor: string;
    /**
     * background color for the current search match.
     */
    currentMatchBackgroundColor: string;
    /**
     * horizontalAlignment of the text
     */
    horizontalAlignment: TextRenderer.HorizontalAlignment;
}
/**
 * Search service remembers the search state and the location of the last
 * match, for incremental searching.
 * Search service is also responsible of providing a cell renderer function
 * to set the background color of cells matching the search text.
 */
export declare class GridSearchService {
    constructor(grid: DataGrid);
    /**
     * Returns a cellrenderer config function to render each cell background.
     * If cell match, background is matchBackgroundColor, if it's the current
     * match, background is currentMatchBackgroundColor.
     */
    cellBackgroundColorRendererFunc(config: TextRenderConfig): CellRenderer.ConfigFunc<string>;
    /**
     * Clear the search.
     */
    clear(): void;
    /**
     * incrementally look for searchText.
     */
    find(query: RegExp, reverse?: boolean): boolean;
    /**
     * Wrap indices if needed to just before the start or just after the end.
     */
    private _wrapRows;
    readonly query: RegExp;
    private _grid;
    private _query;
    private _row;
    private _column;
    private _looping;
}
/**
 * A viewer for CSV tables.
 */
export declare class CSVViewer extends Widget {
    /**
     * Construct a new CSV viewer.
     */
    constructor(options: CSVViewer.IOptions);
    /**
     * The CSV widget's context.
     */
    readonly context: DocumentRegistry.Context;
    /**
     * A promise that resolves when the csv viewer is ready to be revealed.
     */
    readonly revealed: Promise<void>;
    /**
     * The delimiter for the file.
     */
    delimiter: string;
    /**
     * The style used by the data grid.
     */
    style: DataGrid.IStyle;
    /**
     * The config used to create text renderer.
     */
    rendererConfig: TextRenderConfig;
    /**
     * The search service
     */
    readonly searchService: GridSearchService;
    /**
     * Dispose of the resources used by the widget.
     */
    dispose(): void;
    /**
     * Go to line
     */
    goToLine(lineNumber: number): void;
    /**
     * Handle `'activate-request'` messages.
     */
    protected onActivateRequest(msg: Message): void;
    /**
     * Create the model for the grid.
     */
    private _updateGrid;
    private _context;
    private _grid;
    private _searchService;
    private _monitor;
    private _delimiter;
    private _revealed;
}
/**
 * A namespace for `CSVViewer` statics.
 */
export declare namespace CSVViewer {
    /**
     * Instantiation options for CSV widgets.
     */
    interface IOptions {
        /**
         * The document context for the CSV being rendered by the widget.
         */
        context: DocumentRegistry.Context;
    }
}
/**
 * A document widget for CSV content widgets.
 */
export declare class CSVDocumentWidget extends DocumentWidget<CSVViewer> {
    constructor(options: CSVDocumentWidget.IOptions);
    /**
     * Set URI fragment identifier for rows
     */
    setFragment(fragment: string): void;
}
export declare namespace CSVDocumentWidget {
    interface IOptions extends DocumentWidget.IOptionsOptionalContent<CSVViewer> {
        delimiter?: string;
    }
}
/**
 * A widget factory for CSV widgets.
 */
export declare class CSVViewerFactory extends ABCWidgetFactory<IDocumentWidget<CSVViewer>> {
    /**
     * Create a new widget given a context.
     */
    protected createNewWidget(context: DocumentRegistry.Context): IDocumentWidget<CSVViewer>;
}
/**
 * A widget factory for TSV widgets.
 */
export declare class TSVViewerFactory extends ABCWidgetFactory<IDocumentWidget<CSVViewer>> {
    /**
     * Create a new widget given a context.
     */
    protected createNewWidget(context: DocumentRegistry.Context): IDocumentWidget<CSVViewer>;
}
