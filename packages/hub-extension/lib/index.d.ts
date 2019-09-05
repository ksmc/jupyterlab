import { JupyterFrontEnd } from '@jupyterlab/application';
/**
 * The command IDs used by the plugin.
 */
export declare namespace CommandIDs {
    const controlPanel: string;
    const logout: string;
    const restart: string;
}
declare const _default: import("@phosphor/application").IPlugin<JupyterFrontEnd<JupyterFrontEnd.IShell>, any>[];
export default _default;
