// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PathExt, PageConfig, Poll } from '@jupyterlab/coreutils';
import { shouldOverwrite } from '@jupyterlab/docmanager';
import { ArrayIterator, each, find, ArrayExt } from '@phosphor/algorithm';
import { PromiseDelegate } from '@phosphor/coreutils';
import { Signal } from '@phosphor/signaling';
import { showDialog, Dialog } from '@jupyterlab/apputils';
/**
 * The default duration of the auto-refresh in ms
 */
const DEFAULT_REFRESH_INTERVAL = 10000;
/**
 * The maximum upload size (in bytes) for notebook version < 5.1.0
 */
export const LARGE_FILE_SIZE = 15 * 1024 * 1024;
/**
 * The size (in bytes) of the biggest chunk we should upload at once.
 */
export const CHUNK_SIZE = 1024 * 1024;
/**
 * An implementation of a file browser model.
 *
 * #### Notes
 * All paths parameters without a leading `'/'` are interpreted as relative to
 * the current directory.  Supports `'../'` syntax.
 */
export class FileBrowserModel {
    /**
     * Construct a new file browser model.
     */
    constructor(options) {
        this._connectionFailure = new Signal(this);
        this._fileChanged = new Signal(this);
        this._items = [];
        this._key = '';
        this._pathChanged = new Signal(this);
        this._paths = new Set();
        this._pending = null;
        this._pendingPath = null;
        this._refreshed = new Signal(this);
        this._sessions = [];
        this._state = null;
        this._isDisposed = false;
        this._restored = new PromiseDelegate();
        this._uploads = [];
        this._uploadChanged = new Signal(this);
        this.manager = options.manager;
        this._driveName = options.driveName || '';
        let rootPath = this._driveName ? this._driveName + ':' : '';
        this._model = {
            path: rootPath,
            name: PathExt.basename(rootPath),
            type: 'directory',
            content: undefined,
            writable: false,
            created: 'unknown',
            last_modified: 'unknown',
            mimetype: 'text/plain',
            format: 'text'
        };
        this._state = options.state || null;
        const refreshInterval = options.refreshInterval || DEFAULT_REFRESH_INTERVAL;
        const { services } = options.manager;
        services.contents.fileChanged.connect(this._onFileChanged, this);
        services.sessions.runningChanged.connect(this._onRunningChanged, this);
        this._unloadEventListener = (e) => {
            if (this._uploads.length > 0) {
                const confirmationMessage = 'Files still uploading';
                e.returnValue = confirmationMessage;
                return confirmationMessage;
            }
        };
        window.addEventListener('beforeunload', this._unloadEventListener);
        this._poll = new Poll({
            factory: () => this.cd('.'),
            frequency: {
                interval: refreshInterval,
                backoff: true,
                max: 300 * 1000
            },
            standby: 'when-hidden'
        });
    }
    /**
     * A signal emitted when the file browser model loses connection.
     */
    get connectionFailure() {
        return this._connectionFailure;
    }
    /**
     * The drive name that gets prepended to the path.
     */
    get driveName() {
        return this._driveName;
    }
    /**
     * A promise that resolves when the model is first restored.
     */
    get restored() {
        return this._restored.promise;
    }
    /**
     * Get the file path changed signal.
     */
    get fileChanged() {
        return this._fileChanged;
    }
    /**
     * Get the current path.
     */
    get path() {
        return this._model ? this._model.path : '';
    }
    /**
     * A signal emitted when the path changes.
     */
    get pathChanged() {
        return this._pathChanged;
    }
    /**
     * A signal emitted when the directory listing is refreshed.
     */
    get refreshed() {
        return this._refreshed;
    }
    /**
     * Get the kernel spec models.
     */
    get specs() {
        return this.manager.services.sessions.specs;
    }
    /**
     * Get whether the model is disposed.
     */
    get isDisposed() {
        return this._isDisposed;
    }
    /**
     * A signal emitted when an upload progresses.
     */
    get uploadChanged() {
        return this._uploadChanged;
    }
    /**
     * Create an iterator over the status of all in progress uploads.
     */
    uploads() {
        return new ArrayIterator(this._uploads);
    }
    /**
     * Dispose of the resources held by the model.
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        window.removeEventListener('beforeunload', this._unloadEventListener);
        this._isDisposed = true;
        this._poll.dispose();
        this._sessions.length = 0;
        this._items.length = 0;
        Signal.clearData(this);
    }
    /**
     * Create an iterator over the model's items.
     *
     * @returns A new iterator over the model's items.
     */
    items() {
        return new ArrayIterator(this._items);
    }
    /**
     * Create an iterator over the active sessions in the directory.
     *
     * @returns A new iterator over the model's active sessions.
     */
    sessions() {
        return new ArrayIterator(this._sessions);
    }
    /**
     * Force a refresh of the directory contents.
     */
    async refresh() {
        await this._poll.refresh();
        await this._poll.tick;
    }
    /**
     * Change directory.
     *
     * @param path - The path to the file or directory.
     *
     * @returns A promise with the contents of the directory.
     */
    async cd(newValue = '.') {
        if (newValue !== '.') {
            newValue = Private.normalizePath(this.manager.services.contents, this._model.path, newValue);
        }
        else {
            newValue = this._pendingPath || this._model.path;
        }
        if (this._pending) {
            // Collapse requests to the same directory.
            if (newValue === this._pendingPath) {
                return this._pending;
            }
            // Otherwise wait for the pending request to complete before continuing.
            await this._pending;
        }
        let oldValue = this.path;
        let options = { content: true };
        this._pendingPath = newValue;
        if (oldValue !== newValue) {
            this._sessions.length = 0;
        }
        let services = this.manager.services;
        this._pending = services.contents
            .get(newValue, options)
            .then(contents => {
            if (this.isDisposed) {
                return;
            }
            this._handleContents(contents);
            this._pendingPath = null;
            this._pending = null;
            if (oldValue !== newValue) {
                // If there is a state database and a unique key, save the new path.
                // We don't need to wait on the save to continue.
                if (this._state && this._key) {
                    void this._state.save(this._key, { path: newValue });
                }
                this._pathChanged.emit({
                    name: 'path',
                    oldValue,
                    newValue
                });
            }
            this._onRunningChanged(services.sessions, services.sessions.running());
            this._refreshed.emit(void 0);
        })
            .catch(error => {
            this._pendingPath = null;
            this._pending = null;
            if (error.response && error.response.status === 404) {
                error.message = `Directory not found: "${this._model.path}"`;
                console.error(error);
                this._connectionFailure.emit(error);
                return this.cd('/');
            }
            else {
                this._connectionFailure.emit(error);
            }
        });
        return this._pending;
    }
    /**
     * Download a file.
     *
     * @param path - The path of the file to be downloaded.
     *
     * @returns A promise which resolves when the file has begun
     *   downloading.
     */
    async download(path) {
    	const msg = `Cannot download data files from protected environment.`;
        console.log(msg);
        alert(msg);
        return this.manager.services.contents.getDownloadUrl(path).then(url => { });
    }
    /**
     * Restore the state of the file browser.
     *
     * @param id - The unique ID that is used to construct a state database key.
     *
     * @returns A promise when restoration is complete.
     *
     * #### Notes
     * This function will only restore the model *once*. If it is called multiple
     * times, all subsequent invocations are no-ops.
     */
    restore(id) {
        const state = this._state;
        const restored = !!this._key;
        if (!state || restored) {
            return Promise.resolve(void 0);
        }
        const manager = this.manager;
        const key = `file-browser-${id}:cwd`;
        const ready = manager.services.ready;
        return Promise.all([state.fetch(key), ready])
            .then(([value]) => {
            if (!value) {
                this._restored.resolve(undefined);
                return;
            }
            const path = value['path'];
            const localPath = manager.services.contents.localPath(path);
            return manager.services.contents
                .get(path)
                .then(() => this.cd(localPath))
                .catch(() => state.remove(key));
        })
            .catch(() => state.remove(key))
            .then(() => {
            this._key = key;
            this._restored.resolve(undefined);
        }); // Set key after restoration is done.
    }
    /**
     * Upload a `File` object.
     *
     * @param file - The `File` object to upload.
     *
     * @returns A promise containing the new file contents model.
     *
     * #### Notes
     * On Notebook version < 5.1.0, this will fail to upload files that are too
     * big to be sent in one request to the server. On newer versions, it will
     * ask for confirmation then upload the file in 1 MB chunks.
     */
    async upload(file) {
    	const chunkedUpload = file.size > CHUNK_SIZE;
        return await this._upload(file, chunkedUpload);
    }
    async _shouldUploadLarge(file) {
        const { button } = await showDialog({
            title: 'Large file size warning',
            body: `The file size is ${Math.round(file.size / (1024 * 1024))} MB. Do you still want to upload it?`,
            buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'Upload' })]
        });
        return button.accept;
    }
    /**
     * Perform the actual upload.
     */
    async _upload(file, chunked) {
    	const msg = `Cannot upload data files to protected environment without security scan.`;
        console.log(msg);
        alert(msg);
    }
    _uploadCheckDisposed() {
        if (this.isDisposed) {
            return Promise.reject('Filemanager disposed. File upload canceled');
        }
        return Promise.resolve();
    }
    /**
     * Handle an updated contents model.
     */
    _handleContents(contents) {
        // Update our internal data.
        this._model = {
            name: contents.name,
            path: contents.path,
            type: contents.type,
            content: undefined,
            writable: contents.writable,
            created: contents.created,
            last_modified: contents.last_modified,
            mimetype: contents.mimetype,
            format: contents.format
        };
        this._items = contents.content;
        this._paths.clear();
        contents.content.forEach((model) => {
            this._paths.add(model.path);
        });
    }
    /**
     * Handle a change to the running sessions.
     */
    _onRunningChanged(sender, models) {
        this._populateSessions(models);
        this._refreshed.emit(void 0);
    }
    /**
     * Handle a change on the contents manager.
     */
    _onFileChanged(sender, change) {
        let path = this._model.path;
        let { sessions } = this.manager.services;
        let { oldValue, newValue } = change;
        let value = oldValue && oldValue.path && PathExt.dirname(oldValue.path) === path
            ? oldValue
            : newValue && newValue.path && PathExt.dirname(newValue.path) === path
                ? newValue
                : undefined;
        // If either the old value or the new value is in the current path, update.
        if (value) {
            void this._poll.refresh();
            this._populateSessions(sessions.running());
            this._fileChanged.emit(change);
            return;
        }
    }
    /**
     * Populate the model's sessions collection.
     */
    _populateSessions(models) {
        this._sessions.length = 0;
        each(models, model => {
            if (this._paths.has(model.path)) {
                this._sessions.push(model);
            }
        });
    }
}
/**
 * The namespace for the file browser model private data.
 */
var Private;
(function (Private) {
    /**
     * Normalize a path based on a root directory, accounting for relative paths.
     */
    function normalizePath(contents, root, path) {
        const driveName = contents.driveName(root);
        const localPath = contents.localPath(root);
        const resolved = PathExt.resolve(localPath, path);
        return driveName ? `${driveName}:${resolved}` : resolved;
    }
    Private.normalizePath = normalizePath;
})(Private || (Private = {}));
//# sourceMappingURL=model.js.map