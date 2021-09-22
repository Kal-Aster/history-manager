/**
 * @author Giuliano Collacchioni @2020
 */
import { Path, Key } from "path-to-regexp";
declare namespace ContextManager {
    class ContextManager {
        private _contexts;
        private _hrefs;
        private _index;
        private _length;
        /**
         * Removes all references after the actual index
         */
        clean(): void;
        currentContext(): string | null;
        contextOf(href: string, skipFallback?: boolean): string | null;
        insert(href: string, replace?: boolean): void;
        goBackward(): string;
        goForward(): string;
        get(index?: number): string | null;
        index(): number;
        index(value: number): void;
        length(): number;
        getContextNames(): string[];
        getDefaultOf(context: string): string | null;
        restore(context: string): boolean;
        addContextPath(context_name: string, path: string, fallback?: boolean): RegExp;
        setContextDefaultHref(context_name: string, href: string | null): void;
        setContext(context: {
            name: string;
            paths: {
                path: string;
                fallback?: boolean;
            }[];
            default?: string | null;
        }): void;
        hrefs(): string[];
    }
    interface IContextPath {
        path: RegExp;
        fallback: boolean;
    }
    // [ paths, default_href ]
    type ContextInfo = [
        IContextPath[],
        string | null | undefined
    ];
    // ( context_name, ContextInfo )
    type ContextsMap = Map<string, ContextInfo>;
    // [ context_name, hrefs ][]
    type HREFsArray = [
        string,
        string[]
    ][];
}
declare namespace HistoryManager {
    function setAutoManagement(value: boolean): void;
    function getAutoManagement(): boolean;
    interface IWork {
        finish(): void;
        beginFinish(): void;
        askFinish(): boolean;
        readonly finishing: boolean;
        readonly finished: boolean;
        readonly locking: boolean;
    }
    interface ILock extends IWork {
        readonly locking: true;
    }
    function onWorkFinished<T>(callback: (this: T) => void, context?: T): void;
    function acquire(): ILock;
    function initEventListener(): () => void;
    function addFront(frontHref?: string): Promise<void>;
    function addBack(backHref?: string): Promise<void>;
    function index(): number;
    function getHREFAt(index: number): string | null;
    function setContext(context: {
        name: string;
        paths: {
            path: string;
            fallback?: boolean;
        }[];
        default?: string | null;
    }): void;
    function addContextPath(context: string, href: string, isFallback?: boolean): RegExp;
    function setContextDefaultHref(context: string, href: string): void;
    function getContextDefaultOf(context: string): string | null;
    function getContext(href?: string | null): string | null;
    function getHREFs(): string[];
    function restore(context: string): Promise<void>;
    function assign(href: string): Promise<void>;
    function replace(href: string): Promise<void>;
    function go(direction: number): Promise<void>;
    function start(fallbackContext: string | null): Promise<void>;
    function isStarted(): boolean;
}
declare namespace NavigationLock {
    type Lock = {
        readonly id: number;
        listen(listener: (event: Event) => void): void;
        unlisten(listener: (event: Event) => void): void;
        unlock(): void;
    };
    function initEventListener(): () => void;
    function lock(): Promise<Lock>;
    function unlock(force?: boolean): boolean;
    function locked(): boolean;
}
declare namespace OptionsManager {
    function initEventListener(): () => void;
    type Options = {
        [key: string]: any;
    };
    /**
     * Gets the options stored in the url
     */
    function get(): Options;
    /**
     * Sets the options
     * @param opts
     */
    function set(opts: Options): Promise<void>;
    /**
     * Add an option to those stored in the url
     */
    function add(opt: string, value?: string): Promise<void>;
    /**
     * Remove given option
     * @param opt
     */
    function remove(opt: string): Promise<void>;
    /**
     * Go to the given href adding the specified options
     * @param href
     * @param opts
     * @param replace
     */
    function goWith(href: string, opts: Options, replace?: boolean): Promise<void>;
    /**
     * Get the href with the options portion
     */
    function clearHref(): string;
}
declare namespace PathGenerator {
    const LEADING_DELIMITER: RegExp;
    const TRAILING_DELIMITER: RegExp;
    const DELIMITER_NOT_IN_PARENTHESES: RegExp;
    function prepare(path: string): string;
    function generate(path: Path, keys?: Key[]): RegExp;
}
declare namespace Router {
    namespace NavigationLock {
        type Lock = {
            readonly id: number;
            listen(listener: (event: Event) => void): void;
            unlisten(listener: (event: Event) => void): void;
            unlock(): void;
        };
        function initEventListener(): () => void;
        function lock(): Promise<Lock>;
        function unlock(force?: boolean): boolean;
        function locked(): boolean;
    }
    const ROUTES: unique symbol;
    const REDIRECTIONS: unique symbol;
    const DESTROYED: unique symbol;
    type KeyMap = Map<string, any>;
    interface ILocation {
        href: string;
        pathname: string;
        hash: string;
        query: string;
        parsedQuery: any;
        hasQueryParam(param: string): boolean;
        getQueryParam(param: string): string | null | undefined;
        addQueryParam(param: string, value: string | null): void;
        removeQueryParam(param: string): void;
        hrefIf(go: string): string;
    }
    interface IRouteCallback {
        (location: ILocation, keymap: KeyMap, redirection: {
            location: ILocation;
            keymap: KeyMap;
        } | null): void;
    }
    interface IRoute {
        regex: RegExp;
        keys: Array<Key>;
        callback: IRouteCallback;
    }
    interface IRedirectionRoute {
        regex: RegExp;
        keys: Array<Key>;
        redirection: string;
    }
    function getLocation(href?: string): ILocation;
    function initEventListener(): () => void;
    class GenericRouter {
        constructor();
        [ROUTES]: Array<IRoute>;
        [REDIRECTIONS]: Array<IRedirectionRoute>;
        [DESTROYED]: boolean;
        destroy(): void;
        /**
         * Segna il percorso specificato come reindirizzamento ad un altro
         * @param path
         * @param redirection
         */
        redirect(path: string, redirection: string): RegExp;
        /**
         * Elimina un reindirizzamento
         * @param path
         */
        unredirect(path: string): void;
        /**
         * Associa una funzione ad un percorso
         * @param path
         * @param callback
         */
        route(path: string, callback: IRouteCallback): RegExp;
        /**
         * Elimina la funzione associata al percorso
         * @param path
         */
        unroute(path: string): void;
        emit(): void;
    }
    function redirect(path: string, redirection: string): RegExp;
    function unredirect(path: string): void;
    function route(path: string, callback: IRouteCallback): RegExp;
    function unroute(path: string): void;
    // :TODO:
    // main.start = function (startingContext: string, organizeHistory: boolean = true): boolean {
    function start(startingContext: string): Promise<void>;
    function index(): number;
    function getLocationAt(index: number): ILocation | null;
    function addContextPath(context: string, href: string, isFallback?: boolean): RegExp;
    function setContextDefaultHref(context: string, href: string): void;
    function setContext(context: {
        name: string;
        paths: {
            path: string;
            fallback?: boolean;
        }[];
        default?: string;
    }): void;
    function getContext(href?: string): string | null;
    function restoreContext(context: string, defaultHref?: string): Promise<void>;
    function getContextDefaultOf(context: string): string | null;
    function emit(single?: boolean): void;
    function create(): GenericRouter;
    function go(path_index: string | number, options: {
        emit: boolean;
        replace?: boolean;
    }): Promise<void>;
    function setQueryParam(param: string, value: string | null | undefined, options: {
        emit: boolean;
        replace?: boolean;
    }): Promise<void>;
    function lock(): Promise<NavigationLock.Lock>;
    function unlock(force?: boolean): boolean;
    function destroy(): void;
    function getBase(): string;
    function setBase(newBase: string): void;
    function isLocked(): boolean;
    type Redirection = {
        location: ILocation;
        keymap: KeyMap;
    };
}
declare namespace URLManager {
    function base(value?: string): string;
    function get(): string;
    function construct(href: string, full?: boolean): string;
}
declare namespace WorkManager {
    interface ILock {
        release(): void;
        beginRelease(start_fn: () => void): void;
        readonly releasing: boolean;
        readonly released: boolean;
        onrelease<T>(callback: (this: T) => void, context?: T): void;
    }
    function lock(locking_fn: (this: ILock, lock: ILock) => boolean | void): Promise<ILock>;
    function locked(): boolean;
    function startWork(start_fn: (complete: () => void, id: number) => void, id?: number): number;
    function ondone<T>(fn: (this: T) => void, context?: T): void;
}
export { ContextManager, HistoryManager, NavigationLock, OptionsManager, PathGenerator, Router, URLManager, WorkManager };
