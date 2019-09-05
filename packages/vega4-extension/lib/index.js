/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { Widget } from '@phosphor/widgets';
/**
 * The CSS class to add to the Vega and Vega-Lite widget.
 */
const VEGA_COMMON_CLASS = 'jp-RenderedVegaCommon4';
/**
 * The CSS class to add to the Vega.
 */
const VEGA_CLASS = 'jp-RenderedVega4';
/**
 * The CSS class to add to the Vega-Lite.
 */
const VEGALITE_CLASS = 'jp-RenderedVegaLite2';
/**
 * The MIME type for Vega.
 *
 * #### Notes
 * The version of this follows the major version of Vega.
 */
export const VEGA_MIME_TYPE = 'application/vnd.vega.v4+json';
/**
 * The MIME type for Vega-Lite.
 *
 * #### Notes
 * The version of this follows the major version of Vega-Lite.
 */
export const VEGALITE_MIME_TYPE = 'application/vnd.vegalite.v2+json';
/**
 * A widget for rendering Vega or Vega-Lite data, for usage with rendermime.
 */
export class RenderedVega extends Widget {
    /**
     * Create a new widget for rendering Vega/Vega-Lite.
     */
    constructor(options) {
        super();
        this._mimeType = options.mimeType;
        this._resolver = options.resolver;
        this.addClass(VEGA_COMMON_CLASS);
        this.addClass(this._mimeType === VEGA_MIME_TYPE ? VEGA_CLASS : VEGALITE_CLASS);
    }
    /**
     * Render Vega/Vega-Lite into this widget's node.
     */
    async renderModel(model) {
        const spec = model.data[this._mimeType];
        const metadata = model.metadata[this._mimeType];
        const embedOptions = metadata && metadata.embed_options ? metadata.embed_options : {};
        const mode = this._mimeType === VEGA_MIME_TYPE ? 'vega' : 'vega-lite';
        const vega = Private.vega != null ? Private.vega : await Private.ensureVega();
        const el = document.createElement('div');
        // clear the output before attaching a chart
        this.node.textContent = '';
        this.node.appendChild(el);
        if (this._result) {
            this._result.view.finalize();
        }
        const loader = vega.vega.loader({
            http: { credentials: 'same-origin' }
        });
        const sanitize = async (uri, options) => {
            // Use the resolver for any URIs it wants to handle
            const resolver = this._resolver;
            if (resolver.isLocal(uri)) {
                const absPath = await resolver.resolveUrl(uri);
                uri = await resolver.getDownloadUrl(absPath);
            }
            return loader.sanitize(uri, options);
        };
        this._result = await vega.default(el, spec, Object.assign({ actions: true, defaultStyle: true }, embedOptions, { mode, loader: Object.assign({}, loader, { sanitize }) }));
        if (model.data['image/png']) {
            return;
        }
        // Add png representation of vega chart to output
        const imageURL = await this._result.view.toImageURL('png');
        model.setData({
            data: Object.assign({}, model.data, { 'image/png': imageURL.split(',')[1] })
        });
    }
    dispose() {
        if (this._result) {
            this._result.view.finalize();
        }
        super.dispose();
    }
}
/**
 * A mime renderer factory for vega data.
 */
export const rendererFactory = {
    safe: true,
    mimeTypes: [VEGA_MIME_TYPE, VEGALITE_MIME_TYPE],
    createRenderer: options => new RenderedVega(options)
};
const extension = {
    id: '@jupyterlab/vega4-extension:factory',
    rendererFactory,
    rank: 58,
    dataType: 'json',
    documentWidgetFactoryOptions: [
        {
            name: 'Vega4',
            primaryFileType: 'vega4',
            fileTypes: ['vega4', 'json'],
            defaultFor: ['vega4']
        },
        {
            name: 'Vega-Lite2',
            primaryFileType: 'vega-lite2',
            fileTypes: ['vega-lite2', 'json'],
            defaultFor: ['vega-lite2']
        }
    ],
    fileTypes: [
        {
            mimeTypes: [VEGA_MIME_TYPE],
            name: 'vega4',
            extensions: ['.vg', '.vg.json', '.vega'],
            iconClass: 'jp-MaterialIcon jp-VegaIcon'
        },
        {
            mimeTypes: [VEGALITE_MIME_TYPE],
            name: 'vega-lite2',
            extensions: ['.vl', '.vl.json', '.vegalite'],
            iconClass: 'jp-MaterialIcon jp-VegaIcon'
        }
    ]
};
export default extension;
/**
 * A namespace for private module data.
 */
var Private;
(function (Private) {
    /**
     * Lazy-load and cache the vega-embed library
     */
    function ensureVega() {
        if (Private.vegaReady) {
            return Private.vegaReady;
        }
        Private.vegaReady = import('./built-vega-embed');
        return Private.vegaReady;
    }
    Private.ensureVega = ensureVega;
})(Private || (Private = {}));
//# sourceMappingURL=index.js.map