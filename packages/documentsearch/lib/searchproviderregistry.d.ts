import { ISearchProvider, ISearchProviderConstructor } from './interfaces';
import { ISearchProviderRegistry } from './tokens';
import { IDisposable } from '@phosphor/disposable';
import { ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
export declare class SearchProviderRegistry implements ISearchProviderRegistry {
    /**
     * Add a provider to the registry.
     *
     * @param key - The provider key.
     * @returns A disposable delegate that, when disposed, deregisters the given search provider
     */
    register<T extends Widget = Widget>(key: string, provider: ISearchProviderConstructor<T>): IDisposable;
    /**
     * Returns a matching provider for the widget.
     *
     * @param widget - The widget to search over.
     * @returns the search provider, or undefined if none exists.
     */
    getProviderForWidget<T extends Widget = Widget>(widget: T): ISearchProvider<T> | undefined;
    /**
     * Signal that emits when a new search provider has been registered
     * or removed.
     */
    readonly changed: ISignal<this, void>;
    private _findMatchingProvider;
    private _changed;
    private _providerMap;
}
