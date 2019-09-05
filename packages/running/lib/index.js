// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import * as React from 'react';
import { toArray } from '@phosphor/algorithm';
import { Signal } from '@phosphor/signaling';
import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Dialog, showDialog, ToolbarButtonComponent } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';
/**
 * The class name added to a running widget header.
 */
const HEADER_CLASS = 'jp-RunningSessions-header';
/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-RunningSessions-section';
/**
 * The class name added to the running sessions section header.
 */
const SECTION_HEADER_CLASS = 'jp-RunningSessions-sectionHeader';
/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-RunningSessions-sectionContainer';
/**
 * The class name added to the running kernel sessions section list.
 */
const LIST_CLASS = 'jp-RunningSessions-sectionList';
/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-RunningSessions-item';
/**
 * The class name added to a running session item icon.
 */
const ITEM_ICON_CLASS = 'jp-RunningSessions-itemIcon';
/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-RunningSessions-itemLabel';
/**
 * The class name added to a running session item shutdown button.
 */
const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';
/**
 * The class name added to a notebook icon.
 */
const NOTEBOOK_ICON_CLASS = 'jp-mod-notebook';
/**
 * The class name added to a console icon.
 */
const CONSOLE_ICON_CLASS = 'jp-mod-console';
/**
 * The class name added to a file icon.
 */
const FILE_ICON_CLASS = 'jp-mod-file';
/**
 * The class name added to a terminal icon.
 */
const TERMINAL_ICON_CLASS = 'jp-mod-terminal';
function Item(props) {
    const { model } = props;
    return (React.createElement("li", { className: ITEM_CLASS },
        React.createElement("span", { className: `${ITEM_ICON_CLASS} ${props.iconClass(model)}` }),
        React.createElement("span", { className: ITEM_LABEL_CLASS, title: props.labelTitle ? props.labelTitle(model) : '', onClick: () => props.openRequested.emit(model) }, props.label(model)),
        React.createElement("button", { className: `${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`, onClick: () => props.shutdown(model) }, "SHUT\u00A0DOWN")));
}
function ListView(props) {
    const { models } = props, rest = __rest(props, ["models"]);
    return (React.createElement("ul", { className: LIST_CLASS }, models.map((m, i) => (React.createElement(Item, Object.assign({ key: i, model: m }, rest))))));
}
function List(props) {
    const initialModels = toArray(props.manager.running());
    const filterRunning = props.filterRunning || (_ => true);
    function render(models) {
        return React.createElement(ListView, Object.assign({ models: models.filter(filterRunning) }, props));
    }
    if (!props.available) {
        return render(initialModels);
    }
    return (React.createElement(UseSignal, { signal: props.manager.runningChanged, initialArgs: initialModels }, (sender, args) => render(args)));
}
/**
 * The Section component contains the shared look and feel for an interactive
 * list of kernels and sessions.
 *
 * It is specialized for each based on it's props.
 */
function Section(props) {
    function onShutdown() {
        void showDialog({
            title: `Shut Down All ${props.name} Sessions?`,
            buttons: [
                Dialog.cancelButton(),
                Dialog.warnButton({ label: 'Shut Down All' })
            ]
        }).then(result => {
            if (result.button.accept) {
                props.manager.shutdownAll();
            }
        });
    }
    return (React.createElement("div", { className: SECTION_CLASS }, props.available && (React.createElement(React.Fragment, null,
        React.createElement("header", { className: SECTION_HEADER_CLASS },
            React.createElement("h2", null,
                props.name,
                " Sessions"),
            React.createElement(ToolbarButtonComponent, { tooltip: `Shut Down All ${props.name} Sessions…`, iconClassName: "jp-CloseIcon", onClick: onShutdown })),
        React.createElement("div", { className: CONTAINER_CLASS },
            React.createElement(List, Object.assign({}, props)))))));
}
function RunningSessionsComponent({ manager, sessionOpenRequested, terminalOpenRequested }) {
    const terminalsAvailable = manager.terminals.isAvailable();
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: HEADER_CLASS },
            React.createElement(ToolbarButtonComponent, { tooltip: "Refresh List", iconClassName: "jp-RefreshIcon", onClick: () => {
                    if (terminalsAvailable) {
                        void manager.terminals.refreshRunning();
                    }
                    void manager.sessions.refreshRunning();
                } })),
        React.createElement(Section, { openRequested: terminalOpenRequested, manager: manager.terminals, name: "Terminal", iconClass: () => `${ITEM_ICON_CLASS} ${TERMINAL_ICON_CLASS}`, label: m => `terminals/${m.name}`, available: terminalsAvailable, shutdown: m => manager.terminals.shutdown(m.name) }),
        React.createElement(Section, { openRequested: sessionOpenRequested, manager: manager.sessions, filterRunning: m => !!((m.name || PathExt.basename(m.path)).indexOf('.') !== -1 || m.name), name: "Kernel", iconClass: m => {
                if ((m.name || PathExt.basename(m.path)).indexOf('.ipynb') !== -1) {
                    return NOTEBOOK_ICON_CLASS;
                }
                else if (m.type.toLowerCase() === 'console') {
                    return CONSOLE_ICON_CLASS;
                }
                return FILE_ICON_CLASS;
            }, label: m => m.name || PathExt.basename(m.path), available: true, labelTitle: m => {
                let kernelName = m.kernel.name;
                if (manager.specs) {
                    const spec = manager.specs.kernelspecs[kernelName];
                    kernelName = spec ? spec.display_name : 'unknown';
                }
                return `Path: ${m.path}\nKernel: ${kernelName}`;
            }, shutdown: m => manager.sessions.shutdown(m.id) })));
}
/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions extends ReactWidget {
    /**
     * Construct a new running widget.
     */
    constructor(options) {
        super();
        this._sessionOpenRequested = new Signal(this);
        this._terminalOpenRequested = new Signal(this);
        this.options = options;
        // this can't be in the react element, because then it would be too nested
        this.addClass(RUNNING_CLASS);
    }
    render() {
        return (React.createElement(RunningSessionsComponent, { manager: this.options.manager, sessionOpenRequested: this._sessionOpenRequested, terminalOpenRequested: this._terminalOpenRequested }));
    }
    /**
     * A signal emitted when a kernel session open is requested.
     */
    get sessionOpenRequested() {
        return this._sessionOpenRequested;
    }
    /**
     * A signal emitted when a terminal session open is requested.
     */
    get terminalOpenRequested() {
        return this._terminalOpenRequested;
    }
}
//# sourceMappingURL=index.js.map