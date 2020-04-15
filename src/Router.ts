/**
 * @author Giuliano Collacchioni @2020
 */

import pathToRegexp = require("./lib/path-to-regexp");
import querystring = require("./lib/querystring");

import HistoryManager = require("./HistoryManager");
import NavigationLock = require("./NavigationLock");
import PathGenerator = require("./PathGenerator");
import UrlManager = require("./UrlManager");

const ROUTES: unique symbol = Symbol("routes");
const REDIRECTIONS: unique symbol = Symbol("redirections");
const DESTROYED: unique symbol = Symbol("destroyed");

type KeyMap = Map<string, any>;

/**
 * Genera una Map avendo le chiavi e i valori associati in due liste separate
 * @param keys
 * @param values
 */
function KeyMapFrom(keys: Array<pathToRegexp.Key>, values: any[]): Map<string, any> {
    let map: Map<string, any> = new Map();
    keys.forEach((key, index) => {
        map.set(key.name.toString(), values[index]);
    });
    return map;
}

interface ILocation {
    href: string;
    pathname: string;
    hash: string;
    query: string;
    parsedQuery: any;
    hasQueryParam(param: string): boolean;
    getQueryParam(param: string): string | null | undefined;
    addQueryParam(param: string, value?: string): void;
    removeQueryParam(param: string): void;
    hrefIf(go: string): string;
}
interface IRouteCallback {
    (location: ILocation, keymap: KeyMap, redirection: { location: ILocation, keymap: KeyMap } | null): void;
}
interface IRoute {
    regex: RegExp;
    keys: Array<pathToRegexp.Key>;
    callback: IRouteCallback;
}
interface IRedirectionRoute {
    regex: RegExp;
    keys: Array<pathToRegexp.Key>;
    redirection: string;
}
let routers: Array<GenericRouter> = [];

function getLocation(href: string = UrlManager.get()): ILocation {
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
                cachedQuery = querystring.decode(query.replace(/^\?/, ""));
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
            let query: { [key: string]: any } = { ...this.parsedQuery, [param]: value };
            this.query = querystring.encode(query);
        },
        removeQueryParam(param: string): void {
            if (!query) {
                return;
            }
            let parsedQuery: { [key: string]: any } = this.parsedQuery;
            delete parsedQuery[param];
            this.query = querystring.encode(parsedQuery);
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
function emit(): void {
    let location: ILocation = getLocation();
    routers.forEach(router => {
        emitSingle(router, location);
    });
}

let emitRoute: boolean = true;
function onland(): void {
    if (emitRoute) {
        emit();
    } else {
        emitRoute = true;
    }
}
window.addEventListener("historylanded", onland);

function go(path: string, replace: boolean = false, emit: boolean = true): void {
    if (NavigationLock.locked()) {
        console.warn("navigation locked");
        return;
    }
    emitRoute = emit;
    let newLocation: string = UrlManager.construct(path);
    if (newLocation === window.location.href) {
        setTimeout(onland, 0);
    } else {
        if (replace) {
            HistoryManager.replace(path);
        } else {
            HistoryManager.assign(path);
        }
    }
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
        let keys: Array<pathToRegexp.Key> = [];
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
        let keys: Array<pathToRegexp.Key> = [];
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
        let keys: Array<pathToRegexp.Key> = [];
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
        let keys: Array<pathToRegexp.Key> = [];
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

interface IMainRouter extends GenericRouter {
    /**
     * Crea un router separato dal principale
     */
    create(): GenericRouter;
    go(path: string, replace?: boolean, emit?: boolean): void;
    go(index: number, emit?: boolean): void;
    base: string;
    location: ILocation;
    /**
     * Blocca la navigazione
     */
    lock(/* ghost?: boolean */): Promise<NavigationLock.Lock>;
    /**
     * Sblocca la navigazione
     */
    unlock(): void;
    locked: boolean;
    getContext(href?: string): string | null;
    /**
     * Associa un percorso ad un contesto
     * @param context
     * @param href
     * @param isFallbackContext
     * @param canChain
     */
    addContextPath(context: string, href: string, isFallbackContext?: boolean, canChain?: boolean): RegExp;
    /**
     * Imposta il percorso predefinito di un contesto
     * @param context
     * @param href
     */
    setContextDefaultHref(context: string, href: string): void;
    /**
     * Imposta un contesto
     * @param this
     * @param context
     */
    setContext(context: {
        name: string,
        paths: { path: string, fallback?: boolean }[],
        default?: string
    }): void;
    restoreContext(context: string, defaultHref?: string): void;
    emit(single?: boolean): void;
    // start(startingContext: string, organizeHistory?: boolean): boolean;
    start(startingContext: string): void;
}

let main: IMainRouter = new GenericRouter() as IMainRouter;
// :TODO:
// main.start = function (startingContext: string, organizeHistory: boolean = true): boolean {
main.start = function (startingContext: string): void {
    return HistoryManager.start(startingContext);
};
main.addContextPath = function (context: string, href: string, isFallback: boolean = false): RegExp {
    return HistoryManager.addContextPath(context, href, isFallback);
};
main.setContextDefaultHref = function (context: string, href: string): void {
    return HistoryManager.setContextDefaultHref(context, href);
};
main.setContext = function (context: {
    name: string,
    paths: { path: string, fallback?: boolean }[],
    default?: string
}): void {
    return HistoryManager.setContext(context);
};
main.getContext = function (href?: string): string | null {
    return HistoryManager.getContext(href);
};
main.restoreContext = function (context: string, defaultHref?: string): void {
    return HistoryManager.restore(context);
};
main.emit = function (this: IMainRouter, single: boolean = false): void {
    if (single) {
        return emitSingle((this as any)._router);
    }
    return emit();
};
main.create = function (): GenericRouter {
    return new GenericRouter();
};
main.go = function routerGo(path_index: string | number, replace?: boolean, emit: boolean = true): void {
    // emettere l'evento "router:going" per dare la possibilità di interrompere la navigazione programmatica
    let goingEvent: CustomEvent<{
        direction: string | number, replace?: boolean, emit: boolean
    }> = new CustomEvent<{ direction: string | number, replace?: boolean, emit: boolean }>(
        "router:going",
        {
            detail: {
                direction: path_index,
                ...(typeof path_index === "string" ? { replace, emit } : { emit: replace != null })
            },
            cancelable: true
        }
    );
    window.dispatchEvent(goingEvent);
    if (goingEvent.defaultPrevented) {
        return;
    }
    if (NavigationLock.locked()) {
        console.warn("navigation locked");
        return;
    }
    if (typeof path_index === "string") {
        go(path_index, replace, emit);
    } else if (typeof path_index === "number") {
        HistoryManager.go(path_index);
    } else {
        throw new Error("router.go should receive an url string or a number");
    }
};
main.lock = function (): Promise<NavigationLock.Lock> {
    return NavigationLock.lock();
};
main.unlock = function (): void {
    return NavigationLock.unlock();
};
main.destroy = function (): void {
    throw new Error("cannot destroy main Router");
};
Object.defineProperty(main, "base", {
    get: () => {
        return UrlManager.base();
    },
    set: newBase => {
        UrlManager.base(newBase.replace(/[\/]+$/, ""));
        emit();
    },
    configurable: false
});
Object.defineProperty(main, "locked", {
    get: () => {
        return NavigationLock.locked();
    },
    configurable: false
});
Object.defineProperty(main, "location", {
    get: () => {
        return getLocation();
    },
    configurable: false
});

type ILocation_ = ILocation;
type IRouteCallback_ = IRouteCallback;
type GenericRouter_ = GenericRouter;
type KeyMap_ = KeyMap;
type NavigationLock_ = typeof NavigationLock;
namespace main {
    export type ILocation = ILocation_;
    export type IRouteCallback = IRouteCallback_;
    export type GenericRouter = GenericRouter_;
    export type KeyMap = KeyMap_;
    export type NavigationLock = NavigationLock_;
    export type Redirection = { location: ILocation, keymap: KeyMap };
}

import Main = main;
export = Main;
