import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Debouncer } from '@jupyterlab/coreutils';
import * as React from 'react';
const OVERLAY_CLASS = 'jp-DocumentSearch-overlay';
const OVERLAY_ROW_CLASS = 'jp-DocumentSearch-overlay-row';
const INPUT_CLASS = 'jp-DocumentSearch-input';
const INPUT_WRAPPER_CLASS = 'jp-DocumentSearch-input-wrapper';
const REGEX_BUTTON_CLASS_OFF = 'jp-DocumentSearch-input-button-off jp-DocumentSearch-regex-button';
const REGEX_BUTTON_CLASS_ON = 'jp-DocumentSearch-input-button-on jp-DocumentSearch-regex-button';
const CASE_BUTTON_CLASS_OFF = 'jp-DocumentSearch-input-button-off jp-DocumentSearch-case-button';
const CASE_BUTTON_CLASS_ON = 'jp-DocumentSearch-input-button-on jp-DocumentSearch-case-button';
const INDEX_COUNTER_CLASS = 'jp-DocumentSearch-index-counter';
const UP_DOWN_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-up-down-wrapper';
const UP_BUTTON_CLASS = 'jp-DocumentSearch-up-button';
const DOWN_BUTTON_CLASS = 'jp-DocumentSearch-down-button';
const CLOSE_BUTTON_CLASS = 'jp-DocumentSearch-close-button';
const REGEX_ERROR_CLASS = 'jp-DocumentSearch-regex-error';
const REPLACE_ENTRY_CLASS = 'jp-DocumentSearch-replace-entry';
const REPLACE_BUTTON_CLASS = 'jp-DocumentSearch-replace-button';
const REPLACE_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-replace-button-wrapper';
const REPLACE_WRAPPER_CLASS = 'jp-DocumentSearch-replace-wrapper-class';
const REPLACE_TOGGLE_COLLAPSED = 'jp-DocumentSearch-replace-toggle-collapsed';
const REPLACE_TOGGLE_EXPANDED = 'jp-DocumentSearch-replace-toggle-expanded';
const FOCUSED_INPUT = 'jp-DocumentSearch-focused-input';
const TOGGLE_WRAPPER = 'jp-DocumentSearch-toggle-wrapper';
const TOGGLE_PLACEHOLDER = 'jp-DocumentSearch-toggle-placeholder';
const BUTTON_CONTENT_CLASS = 'jp-DocumentSearch-button-content';
const BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-button-wrapper';
class SearchEntry extends React.Component {
    constructor(props) {
        super(props);
    }
    /**
     * Focus the input.
     */
    focusInput() {
        this.refs.searchInputNode.focus();
    }
    componentDidUpdate() {
        if (this.props.forceFocus) {
            this.focusInput();
        }
    }
    render() {
        const caseButtonToggleClass = this.props.caseSensitive
            ? CASE_BUTTON_CLASS_ON
            : CASE_BUTTON_CLASS_OFF;
        const regexButtonToggleClass = this.props.useRegex
            ? REGEX_BUTTON_CLASS_ON
            : REGEX_BUTTON_CLASS_OFF;
        const wrapperClass = `${INPUT_WRAPPER_CLASS} ${this.props.inputFocused ? FOCUSED_INPUT : ''}`;
        return (React.createElement("div", { className: wrapperClass },
            React.createElement("input", { placeholder: this.props.searchText ? null : 'Find', className: INPUT_CLASS, value: this.props.searchText, onChange: e => this.props.onChange(e), onKeyDown: e => this.props.onKeydown(e), tabIndex: 2, onFocus: e => this.props.onInputFocus(), onBlur: e => this.props.onInputBlur(), ref: "searchInputNode" }),
            React.createElement("button", { className: BUTTON_WRAPPER_CLASS, onClick: () => this.props.onCaseSensitiveToggled(), tabIndex: 4 },
                React.createElement("span", { className: `${caseButtonToggleClass} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 })),
            React.createElement("button", { className: BUTTON_WRAPPER_CLASS, onClick: () => this.props.onRegexToggled(), tabIndex: 5 },
                React.createElement("span", { className: `${regexButtonToggleClass} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 }))));
    }
}
class ReplaceEntry extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (React.createElement("div", { className: REPLACE_WRAPPER_CLASS },
            React.createElement("input", { placeholder: this.props.replaceText ? null : 'Replace', className: REPLACE_ENTRY_CLASS, value: this.props.replaceText, onKeyDown: e => this.props.onReplaceKeydown(e), onChange: e => this.props.onChange(e), tabIndex: 3, ref: "replaceInputNode" }),
            React.createElement("button", { className: REPLACE_BUTTON_WRAPPER_CLASS, onClick: () => this.props.onReplaceCurrent(), tabIndex: 9 },
                React.createElement("span", { className: `${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 }, "Replace")),
            React.createElement("button", { className: REPLACE_BUTTON_WRAPPER_CLASS, tabIndex: 10, onClick: () => this.props.onReplaceAll() },
                React.createElement("span", { className: `${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 }, "Replace All"))));
    }
}
function UpDownButtons(props) {
    return (React.createElement("div", { className: UP_DOWN_BUTTON_WRAPPER_CLASS },
        React.createElement("button", { className: BUTTON_WRAPPER_CLASS, onClick: () => props.onHighlightPrevious(), tabIndex: 6 },
            React.createElement("span", { className: `${UP_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 })),
        React.createElement("button", { className: BUTTON_WRAPPER_CLASS, onClick: () => props.onHightlightNext(), tabIndex: 7 },
            React.createElement("span", { className: `${DOWN_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 }))));
}
function SearchIndices(props) {
    return (React.createElement("div", { className: INDEX_COUNTER_CLASS }, props.totalMatches === 0
        ? '-/-'
        : `${props.currentIndex + 1}/${props.totalMatches}`));
}
class SearchOverlay extends React.Component {
    constructor(props) {
        super(props);
        this._debouncedStartSearch = new Debouncer(() => {
            this._executeSearch(true, this.state.searchText);
        }, 500);
        this.state = props.overlayState;
    }
    componentDidMount() {
        if (this.state.searchText) {
            this._executeSearch(true, this.state.searchText);
        }
    }
    _onSearchChange(event) {
        const searchText = event.target.value;
        this.setState({ searchText: searchText });
        void this._debouncedStartSearch.invoke();
    }
    _onReplaceChange(event) {
        this.setState({ replaceText: event.target.value });
    }
    _onSearchKeydown(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            event.stopPropagation();
            this._executeSearch(!event.shiftKey);
        }
        else if (event.keyCode === 27) {
            event.preventDefault();
            event.stopPropagation();
            this._onClose();
        }
    }
    _onReplaceKeydown(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            event.stopPropagation();
            this.props.onReplaceCurrent(this.state.replaceText);
        }
    }
    _executeSearch(goForward, searchText) {
        // execute search!
        let query;
        const input = searchText ? searchText : this.state.searchText;
        try {
            query = Private.parseQuery(input, this.props.overlayState.caseSensitive, this.props.overlayState.useRegex);
            this.setState({ errorMessage: '' });
        }
        catch (e) {
            this.setState({ errorMessage: e.message });
            return;
        }
        if (Private.regexEqual(this.props.overlayState.query, query)) {
            if (goForward) {
                this.props.onHightlightNext();
            }
            else {
                this.props.onHighlightPrevious();
            }
            return;
        }
        this.props.onStartQuery(query);
    }
    _onClose() {
        // Clean up and close widget.
        this.props.onEndSearch();
        this._debouncedStartSearch.dispose();
    }
    _onReplaceToggled() {
        this.setState({
            replaceEntryShown: !this.state.replaceEntryShown
        });
    }
    _onSearchInputFocus() {
        if (!this.state.searchInputFocused) {
            this.setState({ searchInputFocused: true });
        }
    }
    _onSearchInputBlur() {
        if (this.state.searchInputFocused) {
            this.setState({ searchInputFocused: false });
        }
    }
    render() {
        return [
            React.createElement("div", { className: OVERLAY_ROW_CLASS, key: 0 },
                this.props.isReadOnly ? (React.createElement("div", { className: TOGGLE_PLACEHOLDER })) : (React.createElement("button", { className: TOGGLE_WRAPPER, onClick: () => this._onReplaceToggled(), tabIndex: 1 },
                    React.createElement("span", { className: `${this.state.replaceEntryShown
                            ? REPLACE_TOGGLE_EXPANDED
                            : REPLACE_TOGGLE_COLLAPSED} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 }))),
                React.createElement(SearchEntry, { useRegex: this.props.overlayState.useRegex, caseSensitive: this.props.overlayState.caseSensitive, onCaseSensitiveToggled: () => {
                        this.props.onCaseSensitiveToggled();
                        this._executeSearch(true);
                    }, onRegexToggled: () => {
                        this.props.onRegexToggled();
                        this._executeSearch(true);
                    }, onKeydown: (e) => this._onSearchKeydown(e), onChange: (e) => this._onSearchChange(e), onInputFocus: this._onSearchInputFocus.bind(this), onInputBlur: this._onSearchInputBlur.bind(this), inputFocused: this.state.searchInputFocused, searchText: this.state.searchText, forceFocus: this.props.overlayState.forceFocus }),
                React.createElement(SearchIndices, { currentIndex: this.props.overlayState.currentIndex, totalMatches: this.props.overlayState.totalMatches }),
                React.createElement(UpDownButtons, { onHighlightPrevious: () => this._executeSearch(false), onHightlightNext: () => this._executeSearch(true) }),
                React.createElement("button", { className: BUTTON_WRAPPER_CLASS, onClick: () => this._onClose(), tabIndex: 8 },
                    React.createElement("span", { className: `${CLOSE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`, tabIndex: -1 }))),
            React.createElement("div", { className: OVERLAY_ROW_CLASS, key: 1 }, !this.props.isReadOnly && this.state.replaceEntryShown ? (React.createElement(ReplaceEntry, { onReplaceKeydown: (e) => this._onReplaceKeydown(e), onChange: (e) => this._onReplaceChange(e), onReplaceCurrent: () => this.props.onReplaceCurrent(this.state.replaceText), onReplaceAll: () => this.props.onReplaceAll(this.state.replaceText), replaceText: this.state.replaceText, ref: "replaceEntry" })) : null),
            React.createElement("div", { className: REGEX_ERROR_CLASS, hidden: this.state.errorMessage && this.state.errorMessage.length === 0, key: 3 }, this.state.errorMessage)
        ];
    }
}
export function createSearchOverlay(options) {
    const { widgetChanged, overlayState, onCaseSensitiveToggled, onRegexToggled, onHightlightNext, onHighlightPrevious, onStartQuery, onReplaceCurrent, onReplaceAll, onEndSearch, isReadOnly } = options;
    const widget = ReactWidget.create(React.createElement(UseSignal, { signal: widgetChanged, initialArgs: overlayState }, (_, args) => {
        return (React.createElement(SearchOverlay, { onCaseSensitiveToggled: onCaseSensitiveToggled, onRegexToggled: onRegexToggled, onHightlightNext: onHightlightNext, onHighlightPrevious: onHighlightPrevious, onStartQuery: onStartQuery, onEndSearch: onEndSearch, onReplaceCurrent: onReplaceCurrent, onReplaceAll: onReplaceAll, overlayState: args, isReadOnly: isReadOnly }));
    }));
    widget.addClass(OVERLAY_CLASS);
    return widget;
}
var Private;
(function (Private) {
    function parseQuery(queryString, caseSensitive, regex) {
        const flag = caseSensitive ? 'g' : 'gi';
        // escape regex characters in query if its a string search
        const queryText = regex
            ? queryString
            : queryString.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
        let ret;
        ret = new RegExp(queryText, flag);
        if (ret.test('')) {
            ret = /x^/;
        }
        return ret;
    }
    Private.parseQuery = parseQuery;
    function regexEqual(a, b) {
        if (!a || !b) {
            return false;
        }
        return (a.source === b.source &&
            a.global === b.global &&
            a.ignoreCase === b.ignoreCase &&
            a.multiline === b.multiline);
    }
    Private.regexEqual = regexEqual;
})(Private || (Private = {}));
//# sourceMappingURL=searchoverlay.js.map