/**
 * @author Giuliano Collacchioni @2020
 */

import * as URLManager from "./URLManager";

import { ContextManager } from "./ContextManager";
import InternalHistoryManagerState from "./types/InternalHistoryManagerState";
import LockingWork from "./types/LockingWork";
import createWork from "./HistoryManager/createWork";
import initEventListener from "./HistoryManager/initEventListener";
import goToHREF from "./HistoryManager/goToHREF";
import onLanded from "./HistoryManager/onLanded";
import onCatchPopState from "./HistoryManager/onCatchPopState";
import addBack from "./HistoryManager/addBack";

const state: InternalHistoryManagerState = {
    started: false,
    historyManaged: null,

    works: [],
    onworkfinished: [],
    workToRelease: null,

    contextManager: new ContextManager(),

    hasBack: false,
    replacing: false,

    catchPopState: null,
    destroyEventListener: null
};

function setAutoManagement(value: boolean): void {
    if (state.started) {
        throw new Error("HistoryManager already started");
    }
    state.historyManaged = !!value;
}
function getAutoManagement(): boolean {
    return state.historyManaged || false;
}

function onWorkFinished<T>(callback: (this: T) => void, context?: T): void {
    if (state.works.length === 0) {
        callback.call(context || null as any);
        return;
    }
    state.onworkfinished.push([callback, context || null]);
}

function acquire(): LockingWork {
    let lock: LockingWork = createWork(true, state);
    return lock;
}

function index(): number {
    return state.contextManager.index();
}

function getHREFAt(index: number): string | null {
    return state.contextManager.get(index);
}

function setContext(context: {
    name: string,
    paths: { path: string, fallback?: boolean }[],
    default?: string | null
}): void {
    if (state.historyManaged === null) {
        state.historyManaged = true;
    }
    return state.contextManager.setContext(context);
}

function addContextPath(context: string, href: string, isFallback: boolean = false): RegExp {
    if (state.historyManaged === null) {
        state.historyManaged = true;
    }
    return state.contextManager.addContextPath(context, href, isFallback);
}
function setContextDefaultHref(context: string, href: string): void {
    if (state.historyManaged === null) {
        state.historyManaged = true;
    }
    return state.contextManager.setContextDefaultHref(context, href);
}
function getContextDefaultOf(context: string): string | null {
    return state.contextManager.getDefaultOf(context);
}

function getContext(href: string | null = null): string | null {
    if (href == null) {
        return state.contextManager.currentContext();
    }
    return state.contextManager.contextOf(href);
}

function getHREFs(): string[] {
    if (!state.historyManaged) {
        throw new Error("can't keep track of hrefs without history management");
    }
    return state.contextManager.hrefs();
}

function tryUnlock(): number {
    let locksAsked: number = 0;
    for (let i: number = state.works.length - 1; i >= 0; i--) {
        const work = state.works[i];
        if (work.locking && !work.finishing) {
            if (!work.askFinish()) {
                return -1;
            }
            locksAsked++;
        }
    }
    return locksAsked;
}

function restore(context: string): Promise<void> {
    if (!state.historyManaged) {
        throw new Error("can't restore a context without history management");
    }
    const locksFinished: number = tryUnlock();
    if (locksFinished === -1) {
        return new Promise<void>((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>(resolve => { promiseResolve = resolve;});
    onWorkFinished(() => {
        const { contextManager } = state;
        const previousIndex: number = contextManager.index();

        if (contextManager.restore(context)) {
            let replace: boolean = previousIndex >= contextManager.index();
            state.workToRelease = createWork(false, state);
            onWorkFinished(promiseResolve);

            const href: string = contextManager.get()!;
            const hadBack: boolean = state.hasBack;

            (new Promise<void>(resolve => {
                if (!replace && !state.hasBack) {
                    onCatchPopState(resolve, true, state);
                    goToHREF(href);
                } else {
                    resolve();
                }
            }))
            .then(() => new Promise<void>(resolve => {
                let index: number = contextManager.index() - 1;
                if (replace && !state.hasBack) {
                    resolve();
                } else {
                    addBack(contextManager.get(index)!, state)
                    .then(() => {
                        state.hasBack = true;
                        resolve();
                    });
                }
            }))
            .then(() => new Promise<void>(resolve => {
                if (hadBack || replace) {
                    onCatchPopState(resolve, true, state);
                    goToHREF(href, true);
                } else {
                    resolve();
                }
            }))
            .then(() => {
                onLanded(state);
            });
        } else {
            promiseResolve();
        }
    });
    return promise;
}

function assign(href: string): Promise<void> {
    const locksFinished: number = tryUnlock();
    if (locksFinished === -1) {
        return new Promise<void>((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>(resolve => { promiseResolve = resolve;});
    onWorkFinished(() => {
        state.workToRelease = createWork(false, state);
        onWorkFinished(promiseResolve);
        goToHREF(href);
    });
    return promise;
}

function replace(href: string): Promise<void> {
    let locksFinished: number = tryUnlock();
    if (locksFinished === -1) {
        return new Promise<void>((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>(resolve => { promiseResolve = resolve; });
    onWorkFinished(() => {
        state.workToRelease = createWork(false, state);
        onWorkFinished(promiseResolve);
        goToHREF(href, state.replacing = true);
    });
    return promise;
}

function go(direction: number): Promise<void> {
    const locksFinished: number = tryUnlock();
    if (locksFinished === -1) {
        return new Promise<void>((resolve, reject) => {
            reject();
        });
    }
    if (direction === 0) {
        return Promise.resolve();
    }
    direction = parseInt(direction as any, 10) + locksFinished;
    if (isNaN(direction)) {
        throw new Error("direction must be a number");
    }
    if (direction === 0) {
        return Promise.resolve();
    }
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>((resolve, reject) => { promiseResolve = resolve; });
    onWorkFinished(() => {
        if (state.historyManaged === false) {
            window.history.go(direction);
            promiseResolve();
            return;
        }
        const contextIndex: number = state.contextManager.index();
        let index: number = Math.max(0, Math.min(state.contextManager.length() - 1, contextIndex + direction));
        if (contextIndex === index) {
            onLanded(state);
            promiseResolve();
            return;
        }
        state.workToRelease = createWork(false, state);
        onWorkFinished(promiseResolve);
        if (direction > 0) {
            state.contextManager.index(index - 1);
            window.history.go(1);
        } else {
            state.contextManager.index(index + 1);
            window.history.go(-1);
        }
    });
    return promise;
}

function start(fallbackContext: string | null): Promise<void> {
    if (state.historyManaged === null) {
        state.historyManaged = false;
    }
    fallbackContext = state.historyManaged ?
        (fallbackContext === void 0 ? state.contextManager.getContextNames()[0] : fallbackContext)
        : null
    ;
    let href: string = URLManager.get();
    let promiseResolve: () => void;
    let promiseReject: () => void;
    const promise: Promise<void> = new Promise<void>((resolve, reject) => {
        promiseResolve = resolve; promiseReject = reject;
    });
    if (state.historyManaged) {
        let context: string | null = state.contextManager.contextOf(href, false);
        if (context == null) {
            if (!fallbackContext) {
                throw new Error("must define a fallback context");
            }
            let defaultHREF: string | null = state.contextManager.getDefaultOf(fallbackContext);
            if (defaultHREF == null) {
                throw new Error("must define a default href for the fallback context");
            }
            state.started = true;
            href = defaultHREF;
            state.workToRelease = createWork(false, state);
            onCatchPopState(() => {
                onLanded(state);
                promiseResolve();
            }, true, state);
            goToHREF(defaultHREF, true);
        }
        state.contextManager.insert(href);
        if (context == null) {
            promiseReject!();
            return promise;
        }
    }
    state.started = true;
    onLanded(state);
    promiseResolve!();
    return promise;
}

function isStarted(): boolean {
    return state.started;
}





const historyManager = {
    setAutoManagement,
    getAutoManagement,
    onWorkFinished,
    acquire,
    initEventListener() {
        return initEventListener(state);
    },
    // addFront,
    // addBack,
    index,
    getHREFAt,
    setContext,
    addContextPath,
    setContextDefaultHref,
    getContextDefaultOf,
    getContext,
    getHREFs,
    restore,
    assign,
    replace,
    go,
    start,
    isStarted
};
export default historyManager;