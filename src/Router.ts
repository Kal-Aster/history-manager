/**
 * @author Giuliano Collacchioni @2020
 */

import { Key} from "path-to-regexp";
import * as qs from "query-string";

import * as HistoryManager from "./HistoryManager";
import * as NavigationLock from "./NavigationLock";
import * as PathGenerator from "./PathGenerator";
import * as URLManager from "./URLManager";

const ROUTES: unique symbol = Symbol("routes");
const REDIRECTIONS: unique symbol = Symbol("redirections");
const DESTROYED: unique symbol = Symbol("destroyed");

export type KeyMap = Map<string, any>;

/**
 * Genera una Map avendo le chiavi e i valori associati in due liste separate
 * @param keys
 * @param values
 */
function KeyMapFrom(keys: Array<Key>, values: any[]): Map<string, any> {
    let map: Map<string, any> = new Map();
    keys.forEach((key, index) => {
        map.set(key.name.toString(), values[index]);
    });
    return map;
}

export interface ILocation {
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
export interface IRouteCallback {
    (location: ILocation, keymap: KeyMap, redirection: { location: ILocation, keymap: KeyMap } | null): void;
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
let routers: Array<GenericRouter> = [];

export function getLocation(href: string = URLManager.get()): ILocation {
    let pathname: string = "";
    let hash: string = "";
    let query: string = "";
    let cachedQuery: { [key: string]: any } | null = null;
    // href = "/" + href.replace(/[\\\/]+(?![^(]*[)])/g, "/").replace(/^[\/]+/, "").replace(/[\/]+$/, "");
    {
        let split: string[] = href.split("#");
        pathname = split.shift()!;
        hash = split.join("#");
        hash = hash ? "#" + hash : "";
    }{
        let split: string[] = pathname.split("?");
        pathname = split.shift()!;
        query = split.join("?");
        query = query ? "?" + query : "";
    }
    pathname = PathGenerator.prepare(pathname);
    return {
        hrefIf: function (go: string): string {
            let oldP: string = pathname;
            let oldH: string = hash;
            let oldQ: string = query;
            this.href = go;
            let hrefIf: string = this.href;
            pathname = oldP;
            hash = oldH;
            query = oldQ;
            return hrefIf;
        },
        get href(): string {
            return pathname + query + hash;
        },
        set href(value: string) {
            if (typeof value !== "string") {
                throw new Error("href should be a string");
            }
            if (!value) {
                // refresh
                return;
            }
            // match at start "//", "/", "#" or "?"
            let match: RegExpMatchArray | null = value.match(/^([\/\\]{2,})|([\/\\]{1})|([#])|([\?])/);
            if (match) {
                switch (match[0]) {
                    case "?": {
                        query = "?" + encodeURI(value.substr(1)).replace("#", "%23").replace("?", "%3F");
                        break;
                    }
                    case "#": {
                        hash = value;
                        break;
                    }
                    case "/": {
                        pathname = PathGenerator.prepare(value);
                        hash = "";
                        query = "";
                        break;
                    }
                    default: {
                        // here only for "//", not valid
                        return;
                    }
                }
            } else {
                let path: Array<string> = pathname.split("/");
                // replace last item with the new value
                path.pop();
                path.push(PathGenerator.prepare(value));
                pathname = path.join("/");
                hash = "";
                query = "";
            }
            // emit?
        },
        get pathname(): string {
            return pathname;
        },
        set pathname(value: string) {
            if (typeof value !== "string") {
                throw new Error("pathname should be a string");
            }
            pathname = PathGenerator.prepare(value);
        },
        get hash(): string {
            return hash;
        },
        set hash(value: string) {
            if (typeof value !== "string") {
                throw new Error("hash should be a string");
            }
            if (!value) {
                hash = "";
                return;
            }
            if (value.indexOf("#") !== 0) {
                value = "#" + value;
            }
            hash = value;
        },
        get query(): string {
            return query;
        },
        set query(value: string) {
            if (typeof value !== "string") {
                throw new Error("query should be a string");
            }
            cachedQuery = null;
            if (!value) {
                query = "";
                return;
            }
            if (value.indexOf("?") !== 0) {
                value = "?" + value;
            }
            query = encodeURI(value).replace("#", "%23");
        },
        get parsedQuery(): any {
            if (!query) {
                return {};
            }
            if (!cachedQuery) {
                cachedQuery = qs.parse(query.replace(/^\?/, ""));
            }
            return cachedQuery;
        },
        hasQueryParam(param: string): boolean {
            if (!query) {
                return false;
            }
            return this.parsedQuery[param] !== undefined;
        },
        getQueryParam(param: string): string | null | undefined {
            if (!query) {
                return undefined;
            }
            return this.parsedQuery[param];
        },
        addQueryParam(param: string, value: string | null = null): void {
            let newQuery: { [key: string]: any } = { ...this.parsedQuery, [param]: value };
            cachedQuery = null;
            query = qs.stringify(newQuery);
            if (query) {
                query = "?" + query;
            }
        },
        removeQueryParam(param: string): void {
            if (!query) {
                return;
            }
            let parsedQuery: { [key: string]: any } = this.parsedQuery;
            delete parsedQuery[param];
            this.query = qs.stringify(parsedQuery);
        }
    };
}

function emitSingle(router: GenericRouter, location?: ILocation): void {
    // se non è disponibile `location` recuperare l'attuale
    let path: string;
    if (location) {
        path = location.pathname;
    } else {
        location = getLocation();
        path = location.pathname;
    }
    // path = PathGenerator.prepare(path); // it is done inside location, is it needed here?
    let redirection: { location: ILocation, keymap: KeyMap } | null = null;
    // check if this route should be redirected
    router[REDIRECTIONS].some(redirectionRoute => {
        let exec: RegExpExecArray | null = redirectionRoute.regex.exec(path as string);
        if (exec) {
            redirection = { location: location as ILocation, keymap: KeyMapFrom(redirectionRoute.keys, exec.slice(1)) };
            location = getLocation(redirectionRoute.redirection);
            path = location.pathname;
            return false;
        }
        return false;
    });
    router[ROUTES].some(route => {
        let exec: RegExpExecArray | null = route.regex.exec(path as string);
        if (exec) {
            route.callback(location as ILocation, KeyMapFrom(route.keys, exec.slice(1)), redirection);
            return true;
        }
        return false;
    });
}
function _emit(): void {
    let location: ILocation = getLocation();
    routers.forEach(router => {
        emitSingle(router, location);
    });
}

let emitRoute: boolean = true;
function onland(): void {
    if (emitRoute) {
        _emit();
    } else {
        emitRoute = true;
    }
}
window.addEventListener("historylanded", onland);

function _go(path: string, replace: boolean = false, emit: boolean = true): Promise<void | undefined> {
    let lastEmitRoute: boolean = emitRoute;
    emitRoute = emit;
    return (replace ? HistoryManager.replace(path) : HistoryManager.assign(path)).catch(() => {
        emitRoute = lastEmitRoute;
    });
}

function _throwIfDestroyed(router: GenericRouter): void {
    if (router[DESTROYED]) {
        throw new Error("Router destroyed");
    }
}
class GenericRouter {
    constructor() {
        routers.push(this);
    }
    [ROUTES]: Array<IRoute> = [];
    [REDIRECTIONS]: Array<IRedirectionRoute> = [];
    [DESTROYED]: boolean = false;
    destroy(): void {
        if (this[DESTROYED]) {
            return;
        }
        let index: number = routers.indexOf(this);
        if (index > -1) {
            routers.splice(index, 1);
        }
        this[DESTROYED] = true;
    }
    /**
     * Segna il percorso specificato come reindirizzamento ad un altro
     * @param path
     * @param redirection
     */
    redirect(path: string, redirection: string): RegExp {
        _throwIfDestroyed(this);
        let keys: Array<Key> = [];
        let regex: RegExp = PathGenerator.generate(path, keys);
        this[REDIRECTIONS].push({ regex, keys, redirection: PathGenerator.prepare(redirection) });
        return regex;
    }
    /**
     * Elimina un reindirizzamento
     * @param path
     */
    unredirect(path: string): void {
        _throwIfDestroyed(this);
        let keys: Array<Key> = [];
        let regex: RegExp = PathGenerator.generate(path, keys);
        let rIndex: number = -1;
        this[ROUTES].some((route, index) => {
            let xSource: string = (regex.ignoreCase ? regex.source.toLowerCase() : regex.source);
            let ySource: string = (route.regex.ignoreCase ? route.regex.source.toLowerCase() : route.regex.source);
            if ((xSource === ySource) && (regex.global === route.regex.global) &&
                (regex.ignoreCase === route.regex.ignoreCase) && (regex.multiline === route.regex.multiline)
            ) {
                rIndex = index;
                return true;
            }
            return false;
        });
        if (rIndex > -1) {
            this[ROUTES].splice(rIndex, 1);
        }
    }
    /**
     * Associa una funzione ad un percorso
     * @param path
     * @param callback
     */
    route(path: string, callback: IRouteCallback): RegExp {
        _throwIfDestroyed(this);
        let keys: Array<Key> = [];
        let regex: RegExp = PathGenerator.generate(path, keys);
        this[ROUTES].push({ regex, keys, callback });
        return regex;
    }
    /**
     * Elimina la funzione associata al percorso
     * @param path
     */
    unroute(path: string): void {
        _throwIfDestroyed(this);
        let keys: Array<Key> = [];
        let regex: RegExp = PathGenerator.generate(path, keys);
        let rIndex: number = -1;
        this[ROUTES].some((route, index) => {
            let xSource: string = (regex.ignoreCase ? regex.source.toLowerCase() : regex.source);
            let ySource: string = (route.regex.ignoreCase ? route.regex.source.toLowerCase() : route.regex.source);
            if ((xSource === ySource) && (regex.global === route.regex.global) &&
                (regex.ignoreCase === route.regex.ignoreCase) && (regex.multiline === route.regex.multiline)
            ) {
                rIndex = index;
                return true;
            }
            return false;
        });
        if (rIndex > -1) {
            this[ROUTES].splice(rIndex, 1);
        }
    }
    emit(): void {
        emitSingle(this);
    }
}

// interface IMainRouter extends GenericRouter {
//     /**
//      * Crea un router separato dal principale
//      */
//     create(): GenericRouter;
//     setQueryParam(param: string, value: string | null | undefined, options?: { replace?: boolean, emit?: boolean }): Promise<undefined>;
//     go(path: string, options?: { replace?: boolean, emit?: boolean }): Promise<undefined>;
//     go(index: number, options?: { emit: boolean }): Promise<undefined>;
//     base: string;
//     location: ILocation;
//     /**
//      * Blocca la navigazione
//      */
//     lock(/* ghost?: boolean */): Promise<NavigationLock.Lock>;
//     /**
//      * Sblocca la navigazione
//      */
//     unlock(force?: boolean): boolean;
//     locked: boolean;
//     getContext(href?: string): string | null;
//     /**
//      * Associa un percorso ad un contesto
//      * @param context
//      * @param href
//      * @param isFallbackContext
//      * @param canChain
//      */
//     addContextPath(context: string, href: string, isFallbackContext?: boolean, canChain?: boolean): RegExp;
//     /**
//      * Imposta il percorso predefinito di un contesto
//      * @param context
//      * @param href
//      */
//     setContextDefaultHref(context: string, href: string): void;
//     /**
//      * Imposta un contesto
//      * @param this
//      * @param context
//      */
//     setContext(context: {
//         name: string,
//         paths: { path: string, fallback?: boolean }[],
//         default?: string
//     }): void;
//     restoreContext(context: string, defaultHref?: string): Promise<void>;
//     emit(single?: boolean): void;
//     // start(startingContext: string, organizeHistory?: boolean): boolean;
//     start(startingContext: string): void;
//     getLocationAt(index: number): ILocation | null;
//     index(): number;
// }

let main: GenericRouter = new GenericRouter();

export function redirect(path: string, redirection: string): RegExp {
    return main.redirect(path, redirection);
}
export function unredirect(path: string): void {
    return main.unredirect(path);
}
export function route(path: string, callback: IRouteCallback): RegExp {
    return main.route(path, callback);
}
export function unroute(path: string): void {
    return main.unroute(path);
}
// :TODO:
// main.start = function (startingContext: string, organizeHistory: boolean = true): boolean {
export function start (startingContext: string): Promise<void> {
    return HistoryManager.start(startingContext);
}
export function index(): number {
    return HistoryManager.index();
}
export function getLocationAt(index: number): ILocation | null {
    let href: string | null = HistoryManager.getHREFAt(index);
    if (href == null) {
        return null;
    }
    return getLocation(href);
}
export function addContextPath(context: string, href: string, isFallback: boolean = false): RegExp {
    return HistoryManager.addContextPath(context, href, isFallback);
}
export function setContextDefaultHref(context: string, href: string): void {
    return HistoryManager.setContextDefaultHref(context, href);
}
export function setContext(context: {
    name: string,
    paths: { path: string, fallback?: boolean }[],
    default?: string
}): void {
    return HistoryManager.setContext(context);
}
export function getContext(href?: string): string | null {
    return HistoryManager.getContext(href);
}
export function restoreContext(context: string, defaultHref?: string): Promise<void> {
    return HistoryManager.restore(context);
}
export function getContextDefaultOf(context: string): string | null {
    return HistoryManager.getContextDefaultOf(context);
}
export function emit(single: boolean = false): void {
    if (single) {
        return emitSingle(main);
    }
    return _emit();
}
export function create(): GenericRouter {
    return new GenericRouter();
}
export function go(path_index: string | number, options: {
    emit: boolean
    replace?: boolean,
}): Promise<void> {
    // tslint:disable-next-line: typedef
    let path_index_type = typeof path_index;
    if (path_index_type !== "string" && path_index_type !== "number") {
        throw new Error("router.go should receive an url string or a number");
    }
    // let promiseResolve: () => void;
    options = { ...options };
    return new Promise<void>((promiseResolve: () => void, promiseReject: () => void) => {
        let goingEvent: CustomEvent<{
            direction: string | number, replace?: boolean, emit: boolean
        }> = new CustomEvent<{ direction: string | number, replace?: boolean, emit: boolean }>(
            "router:going",
            {
                detail: {
                    direction: path_index,
                    ...options
                },
                cancelable: true
            }
        );
        window.dispatchEvent(goingEvent);
        if (goingEvent.defaultPrevented) {
            promiseReject();
            return;
        }
        if (path_index_type === "string") {
            _go(
                path_index as string,
                (options && options.replace) || false,
                (options == null || options.emit == null) ? true : options.emit
            ).then(promiseResolve);
        } else {
            let lastEmitRoute: boolean = emitRoute;
            emitRoute = options.emit == null ? true : options.emit;
            HistoryManager.go(path_index as number).then(promiseResolve, () => {
                emitRoute = lastEmitRoute;
            });
        }
    });
}
export function setQueryParam(param: string, value: string | null | undefined, options: {
    emit: boolean,
    replace?: boolean
}): Promise<void> {
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>(resolve => { promiseResolve = resolve;});
    HistoryManager.onWorkFinished(() => {
        let location: ILocation = getLocation();
        if (value === undefined) {
            location.removeQueryParam(param);
        } else {
            location.addQueryParam(param, value);
        }
        go(location.href, options).then(promiseResolve);
    });
    return promise;
}
export function lock(): Promise<NavigationLock.Lock> {
    return NavigationLock.lock();
}
export function unlock(force: boolean = true): boolean {
    return NavigationLock.unlock(force);
}
export function destroy(): void {
    throw new Error("cannot destroy main Router");
}
export function getBase(): string {
    return URLManager.base();
}
export function setBase(newBase: string): void {
    URLManager.base(newBase.replace(/[\/]+$/, ""));
    _emit();
}
export function isLocked(): boolean {
    return NavigationLock.locked();
}

export type Redirection = { location: ILocation, keymap: KeyMap };
export { NavigationLock };