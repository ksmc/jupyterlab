import { IDisplayState } from './interfaces';
import { SearchInstance } from './searchinstance';
import { Signal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
export declare function createSearchOverlay(options: createSearchOverlay.IOptions): Widget;
declare namespace createSearchOverlay {
    interface IOptions {
        widgetChanged: Signal<SearchInstance, IDisplayState>;
        overlayState: IDisplayState;
        onCaseSensitiveToggled: Function;
        onRegexToggled: Function;
        onHightlightNext: Function;
        onHighlightPrevious: Function;
        onStartQuery: Function;
        onEndSearch: Function;
        onReplaceCurrent: Function;
        onReplaceAll: Function;
        isReadOnly: boolean;
    }
}
export {};
