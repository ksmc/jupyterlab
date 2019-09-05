import { IWidgetTracker } from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { Token } from '@phosphor/coreutils';
import { ImageViewer } from './widget';
/**
 * A class that tracks editor widgets.
 */
export interface IImageTracker extends IWidgetTracker<IDocumentWidget<ImageViewer>> {
}
/**
 * The editor tracker token.
 */
export declare const IImageTracker: Token<IImageTracker>;
