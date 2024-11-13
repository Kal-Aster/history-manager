/**
 * @author Giuliano Collacchioni @2020
 */
import { Key } from "path-to-regexp";
import * as NavigationLock from "./NavigationLock";
declare const ROUTES: unique symbol;
declare const REDIRECTIONS: unique symbol;
declare const DESTROYED: unique symbol;
export type KeyMap = Map<string, any>;
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
export declare function getLocation(href?: string): ILocation;
export declare function initEventListener(): () => void;
declare class GenericRouter {
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
export declare function redirect(path: string, redirection: string): RegExp;
export declare function unredirect(path: string): void;
export declare function route(path: string, callback: IRouteCallback): RegExp;
export declare function unroute(path: string): void;
export declare function start(startingContext: string): Promise<void>;
export declare function index(): number;
export declare function getLocationAt(index: number): ILocation | null;
export declare function addContextPath(context: string, href: string, isFallback?: boolean): RegExp;
export declare function setContextDefaultHref(context: string, href: string): void;
export declare function setContext(context: {
    name: string;
    paths: {
        path: string;
        fallback?: boolean;
    }[];
    default?: string;
}): void;
export declare function getContext(href?: string): string | null;
export declare function restoreContext(context: string, defaultHref?: string): Promise<void>;
export declare function getContextDefaultOf(context: string): string | null;
export declare function emit(single?: boolean): void;
export declare function create(): GenericRouter;
export declare function go(path_index: string | number, options?: {
    emit?: boolean;
    replace?: boolean;
}): Promise<void>;
export declare function setQueryParam(param: string, value: string | null | undefined, options: {
    emit: boolean;
    replace?: boolean;
}): Promise<void>;
export declare function lock(): Promise<NavigationLock.Lock>;
export declare function unlock(force?: boolean): boolean;
export declare function destroy(): void;
export declare function getBase(): string;
export declare function setBase(newBase: string): void;
export declare function isLocked(): boolean;
export type Redirection = {
    location: ILocation;
    keymap: KeyMap;
};
export { NavigationLock };
