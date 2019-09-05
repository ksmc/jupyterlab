// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { VDomRenderer, ToolbarButtonComponent } from '@jupyterlab/apputils';
import { Button, InputGroup, Collapse } from '@jupyterlab/ui-components';
import * as React from 'react';
import ReactPaginate from 'react-paginate';
import { ListModel } from './model';
import { isJupyterOrg } from './query';
// TODO: Replace pagination with lazy loading of lower search results
/**
 * Search bar VDOM component.
 */
export class SearchBar extends React.Component {
    constructor(props) {
        super(props);
        /**
         * Handler for search input changes.
         */
        this.handleChange = (e) => {
            let target = e.target;
            this.setState({
                value: target.value
            });
        };
        this.state = {
            value: ''
        };
    }
    /**
     * Render the list view using the virtual DOM.
     */
    render() {
        return (React.createElement("div", { className: "jp-extensionmanager-search-bar" },
            React.createElement(InputGroup, { className: "jp-extensionmanager-search-wrapper", type: "text", placeholder: this.props.placeholder, onChange: this.handleChange, value: this.state.value, rightIcon: "search" })));
    }
}
/**
 * Create a build prompt as a react element.
 *
 * @param props Configuration of the build prompt.
 */
function BuildPrompt(props) {
    return (React.createElement("div", { className: "jp-extensionmanager-buildprompt" },
        React.createElement("div", { className: "jp-extensionmanager-buildmessage" }, "A build is needed to include the latest changes"),
        React.createElement(Button, { onClick: props.performBuild, minimal: true, small: true }, "Rebuild"),
        React.createElement(Button, { onClick: props.ignoreBuild, minimal: true, small: true }, "Ignore")));
}
/**
 * VDOM for visualizing an extension entry.
 */
function ListEntry(props) {
    const { entry } = props;
    const flagClasses = [];
    if (entry.status && ['ok', 'warning', 'error'].indexOf(entry.status) !== -1) {
        flagClasses.push(`jp-extensionmanager-entry-${entry.status}`);
    }
    let title = entry.name;
    if (isJupyterOrg(entry.name)) {
        flagClasses.push(`jp-extensionmanager-entry-mod-whitelisted`);
        title = `${entry.name} (Developed by Project Jupyter)`;
    }
    return (React.createElement("li", { className: `jp-extensionmanager-entry ${flagClasses.join(' ')}`, title: title },
        React.createElement("div", { className: "jp-extensionmanager-entry-title" },
            React.createElement("div", { className: "jp-extensionmanager-entry-name" },
                React.createElement("a", { href: entry.url, target: "_blank", rel: "noopener" }, entry.name)),
            React.createElement("div", { className: "jp-extensionmanager-entry-jupyter-org" })),
        React.createElement("div", { className: "jp-extensionmanager-entry-content" },
            React.createElement("div", { className: "jp-extensionmanager-entry-description" }, entry.description),
            React.createElement("div", { className: "jp-extensionmanager-entry-buttons" },
                !entry.installed && (React.createElement(Button, { onClick: () => props.performAction('install', entry), minimal: true, small: true }, "Install")),
                ListModel.entryHasUpdate(entry) && (React.createElement(Button, { onClick: () => props.performAction('install', entry), minimal: true, small: true }, "Update")),
                entry.installed && (React.createElement(Button, { onClick: () => props.performAction('uninstall', entry), minimal: true, small: true }, "Uninstall")),
                entry.enabled && (React.createElement(Button, { onClick: () => props.performAction('disable', entry), minimal: true, small: true }, "Disable")),
                !entry.enabled && (React.createElement(Button, { onClick: () => props.performAction('enable', entry), minimal: true, small: true }, "Enable"))))));
}
/**
 * List view widget for extensions
 */
export function ListView(props) {
    const entryViews = [];
    for (let entry of props.entries) {
        entryViews.push(React.createElement(ListEntry, { entry: entry, key: entry.name, performAction: props.performAction }));
    }
    let pagination;
    if (props.numPages > 1) {
        pagination = (React.createElement("div", { className: "jp-extensionmanager-pagination" },
            React.createElement(ReactPaginate, { previousLabel: '<', nextLabel: '>', breakLabel: React.createElement("a", { href: "" }, "..."), breakClassName: 'break-me', pageCount: props.numPages, marginPagesDisplayed: 2, pageRangeDisplayed: 5, onPageChange: (data) => props.onPage(data.selected), containerClassName: 'pagination', activeClassName: 'active' })));
    }
    const listview = (React.createElement("ul", { className: "jp-extensionmanager-listview" }, entryViews));
    return (React.createElement("div", { className: "jp-extensionmanager-listview-wrapper" },
        entryViews.length > 0 ? (listview) : (React.createElement("div", { key: "message", className: "jp-extensionmanager-listview-message" }, "No entries")),
        pagination));
}
function ErrorMessage(props) {
    return (React.createElement("div", { key: "error-msg", className: "jp-extensionmanager-error" }, props.children));
}
/**
 *
 */
export class CollapsibleSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: props.isOpen || true
        };
    }
    /**
     * Render the collapsible section using the virtual DOM.
     */
    render() {
        return (React.createElement(React.Fragment, null,
            React.createElement("header", null,
                React.createElement(ToolbarButtonComponent, { iconClassName: this.state.isOpen
                        ? 'jp-extensionmanager-expandIcon'
                        : 'jp-extensionmanager-collapseIcon', onClick: () => {
                        this.handleCollapse();
                    } }),
                React.createElement("span", { className: "jp-extensionmanager-headerText" }, this.props.header),
                this.props.headerElements),
            React.createElement(Collapse, { isOpen: this.state.isOpen }, this.props.children)));
    }
    /**
     * Handler for search input changes.
     */
    handleCollapse() {
        this.setState({
            isOpen: !this.state.isOpen
        }, () => {
            if (this.props.onCollapse) {
                this.props.onCollapse(this.state.isOpen);
            }
        });
    }
}
/**
 * The main view for the discovery extension.
 */
export class ExtensionView extends VDomRenderer {
    constructor(serviceManager) {
        super();
        this.model = new ListModel(serviceManager);
        this.addClass('jp-extensionmanager-view');
    }
    /**
     * The search input node.
     */
    get inputNode() {
        return this.node.querySelector('.jp-extensionmanager-search-wrapper input');
    }
    /**
     * Render the extension view using the virtual DOM.
     */
    render() {
        const model = this.model;
        let pages = Math.ceil(model.totalEntries / model.pagination);
        let elements = [React.createElement(SearchBar, { key: "searchbar", placeholder: "SEARCH" })];
        if (model.promptBuild) {
            elements.push(React.createElement(BuildPrompt, { key: "buildpromt", performBuild: () => {
                    model.performBuild();
                }, ignoreBuild: () => {
                    model.ignoreBuildRecommendation();
                } }));
        }
        // Indicator element for pending actions:
        elements.push(React.createElement("div", { key: "pending", className: `jp-extensionmanager-pending ${model.hasPendingActions() ? 'jp-mod-hasPending' : ''}` }));
        const content = [];
        if (!model.initialized) {
            void model.initialize();
            content.push(React.createElement("div", { key: "loading-placeholder", className: "jp-extensionmanager-loader" }, "Updating extensions list"));
        }
        else if (model.serverConnectionError !== null) {
            content.push(React.createElement(ErrorMessage, { key: "error-msg" },
                React.createElement("p", null, "Error communicating with server extension. Consult the documentation for how to ensure that it is enabled."),
                React.createElement("p", null, "Reason given:"),
                React.createElement("pre", null, model.serverConnectionError)));
        }
        else if (model.serverRequirementsError !== null) {
            content.push(React.createElement(ErrorMessage, { key: "server-requirements-error" },
                React.createElement("p", null, "The server has some missing requirements for installing extensions."),
                React.createElement("p", null, "Details:"),
                React.createElement("pre", null, model.serverRequirementsError)));
        }
        else {
            // List installed and discovery sections
            let installedContent = [];
            if (model.installedError !== null) {
                installedContent.push(React.createElement(ErrorMessage, { key: "install-error" }, `Error querying installed extensions${model.installedError ? `: ${model.installedError}` : '.'}`));
            }
            else {
                installedContent.push(React.createElement(ListView, { key: "installed-items", entries: model.installed, numPages: 1, onPage: value => {
                        /* no-op */
                    }, performAction: this.onAction.bind(this) }));
            }
            content.push(React.createElement(CollapsibleSection, { key: "installed-section", isOpen: true, header: "Installed", headerElements: React.createElement(ToolbarButtonComponent, { key: "refresh-button", className: "jp-extensionmanager-refresh", iconClassName: "jp-RefreshIcon", onClick: () => {
                        model.refreshInstalled();
                    }, tooltip: "Refresh extension list" }) }, installedContent));
            let searchContent = [];
            if (model.searchError !== null) {
                searchContent.push(React.createElement(ErrorMessage, { key: "search-error" }, `Error searching for extensions${model.searchError ? `: ${model.searchError}` : '.'}`));
            }
            else {
                searchContent.push(React.createElement(ListView, { key: "search-items", 
                    // Filter out installed extensions:
                    entries: model.searchResult.filter(entry => model.installed.indexOf(entry) === -1), numPages: pages, onPage: value => {
                        this.onPage(value);
                    }, performAction: this.onAction.bind(this) }));
            }
            content.push(React.createElement(CollapsibleSection, { key: "search-section", isOpen: false, header: model.query ? 'Search Results' : 'Discover', onCollapse: (isOpen) => {
                    if (isOpen && model.query === null) {
                        model.query = '';
                    }
                } }, searchContent));
        }
        elements.push(React.createElement("div", { key: "content", className: "jp-extensionmanager-content" }, content));
        return elements;
    }
    /**
     * Callback handler for the user specifies a new search query.
     *
     * @param value The new query.
     */
    onSearch(value) {
        this.model.query = value;
    }
    /**
     * Callback handler for the user changes the page of the search result pagination.
     *
     * @param value The pagination page number.
     */
    onPage(value) {
        this.model.page = value;
    }
    /**
     * Callback handler for when the user wants to perform an action on an extension.
     *
     * @param action The action to perform.
     * @param entry The entry to perform the action on.
     */
    onAction(action, entry) {
        switch (action) {
            case 'install':
                return this.model.install(entry);
            case 'uninstall':
                return this.model.uninstall(entry);
            case 'enable':
                return this.model.enable(entry);
            case 'disable':
                return this.model.disable(entry);
            default:
                throw new Error(`Invalid action: ${action}`);
        }
    }
    /**
     * Handle the DOM events for the command palette.
     *
     * @param event - The DOM event sent to the command palette.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the command palette's DOM node.
     * It should not be called directly by user code.
     */
    handleEvent(event) {
        switch (event.type) {
            case 'input':
                this.onSearch(this.inputNode.value);
                break;
            case 'focus':
            case 'blur':
                this._toggleFocused();
                break;
            default:
                break;
        }
    }
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    onBeforeAttach(msg) {
        this.node.addEventListener('input', this);
        this.node.addEventListener('focus', this, true);
        this.node.addEventListener('blur', this, true);
    }
    /**
     * A message handler invoked on an `'after-detach'` message.
     */
    onAfterDetach(msg) {
        this.node.removeEventListener('input', this);
        this.node.removeEventListener('focus', this, true);
        this.node.removeEventListener('blur', this, true);
    }
    /**
     * A message handler invoked on an `'activate-request'` message.
     */
    onActivateRequest(msg) {
        if (this.isAttached) {
            let input = this.inputNode;
            input.focus();
            input.select();
        }
    }
    /**
     * Toggle the focused modifier based on the input node focus state.
     */
    _toggleFocused() {
        let focused = document.activeElement === this.inputNode;
        this.toggleClass('p-mod-focused', focused);
    }
}
//# sourceMappingURL=widget.js.map