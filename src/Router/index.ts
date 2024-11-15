/**
 * @author Giuliano Collacchioni @2020
 */

import HistoryManager from "../HistoryManager";
import NavigationLock from "../NavigationLock";
import URLManager from "../URLManager";

import RouteCallback from "../types/RouteCallback";

import emit from "./emit";
import emitSingle from "./emitSingle";
import GenericRouter from "./GenericRouter";
import getLocation from "./getLocation";
import go from "./go";
import initEventListener from "./initEventListener";
import setQueryParam from "./setQueryParam";

const main = new GenericRouter();

const Router = {
    getLocation,
    initEventListener,
    go,
    setQueryParam,

    redirect(
        path: string,
        redirection: string
    ) {
        return main.redirect(path, redirection);
    },
    unredirect(path: string) {
        return main.unredirect(path);
    },
    route(
        path: string,
        callback: RouteCallback
    ) {
        return main.route(path, callback);
    },
    unroute(path: string) {
        return main.unroute(path);
    },
    // :TODO:
    // start(startingContext: string, organizeHistory = true)
    start(startingContext: string) {
        initEventListener();
        return HistoryManager.start(startingContext);
    },
    index() {
        return HistoryManager.index();
    },
    getLocationAt(index: number) {
        let href: string | null = HistoryManager.getHREFAt(index);
        if (href == null) {
            return null;
        }
        return getLocation(href);
    },
    addContextPath(
        context: string,
        href: string,
        isFallback = false
    ) {
        return HistoryManager.addContextPath(
            context, href, isFallback
        );
    },
    setContextDefaultHref(context: string, href: string) {
        return HistoryManager.setContextDefaultHref(context, href);
    },
    setContext(context: {
        name: string,
        paths: { path: string, fallback?: boolean }[],
        default?: string
    }): void {
        return HistoryManager.setContext(context);
    },
    getContext(href?: string) {
        return HistoryManager.getContext(href);
    },
    restoreContext(context: string, defaultHref?: string) {
        return HistoryManager.restore(context);
    },
    getContextDefaultOf(context: string) {
        return HistoryManager.getContextDefaultOf(context);
    },
    emit(emitOnlyMain = false) {
        if (emitOnlyMain) {
            return emitSingle(main, getLocation());
        }

        return emit();
    },
    create() {
        return new GenericRouter();
    },
    lock() {
        return NavigationLock.lock();
    },
    unlock(force = true) {
        return NavigationLock.unlock(force);
    },
    getBase() {
        return URLManager.base();
    },
    setBase(newBase: string) {
        URLManager.base(newBase.replace(/[\/]+$/, ""));
        emit();
    },
    isLocked() {
        return NavigationLock.locked();
    }
};
export default Router;