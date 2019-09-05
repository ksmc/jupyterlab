// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { Dialog, showDialog } from '@jupyterlab/apputils';
import * as React from 'react';
/**
 * Prompt the user what do about companion packages, if present.
 *
 * @param builder the build manager
 */
export function presentCompanions(kernelCompanions, serverCompanion) {
    let entries = [];
    if (serverCompanion) {
        entries.push(React.createElement("p", { key: "server-companion" },
            "This package has indicated that it needs a corresponding server extension:",
            React.createElement("code", null,
                " ",
                serverCompanion.base.name)));
    }
    if (kernelCompanions.length > 0) {
        entries.push(React.createElement("p", { key: 'kernel-companion' }, "This package has indicated that it needs a corresponding package for the kernel."));
        for (let [index, entry] of kernelCompanions.entries()) {
            entries.push(React.createElement("p", { key: `companion-${index}` },
                "The package",
                React.createElement("code", null, entry.kernelInfo.base.name),
                ", is required by the following kernels:"));
            let kernelEntries = [];
            for (let [index, kernel] of entry.kernels.entries()) {
                kernelEntries.push(React.createElement("li", { key: `kernels-${index}` },
                    React.createElement("code", null, kernel.display_name)));
            }
            entries.push(React.createElement("ul", { key: 'kernel-companion-end' }, kernelEntries));
        }
    }
    let body = (React.createElement("div", null,
        entries,
        React.createElement("p", null, "You should make sure that the indicated packages are installed before trying to use the extension. Do you want to continue with the extension installation?")));
    const hasKernelCompanions = kernelCompanions.length > 0;
    const hasServerCompanion = !!serverCompanion;
    let title = '';
    if (hasKernelCompanions && hasServerCompanion) {
        title = 'Kernel and Server Companions';
    }
    else if (hasKernelCompanions) {
        title = 'Kernel Companions';
    }
    else {
        title = 'Server Companion';
    }
    return showDialog({
        title,
        body,
        buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({
                label: 'OK',
                caption: 'Install the JupyterLab extension.'
            })
        ]
    }).then(result => {
        return result.button.accept;
    });
}
//# sourceMappingURL=companions.js.map