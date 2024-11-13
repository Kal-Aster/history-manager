/**
 * @author Giuliano Collacchioni @2020
 */

import ContextManager from "../ContextManager";

import assign from "./assign";
import createWork from "./createWork";
import go from "./go";
import initEventListener from "./initEventListener";
import onWorkFinished from "./onWorkFinished";
import replace from "./replace";
import restore from "./restore";
import start from "./start";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import LockingWork from "../types/LockingWork";
import awaitableOnWorkFinished from "./awaitableOnWorkFinished";

const internalState: InternalHistoryManagerState = {
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
    if (internalState.started) {
        throw new Error("HistoryManager already started");
    }
    internalState.historyManaged = !!value;
}
function getAutoManagement(): boolean {
    return internalState.historyManaged || false;
}

function acquire(): LockingWork {
    return createWork(true, internalState);
}

function index(): number {
    return internalState.contextManager.index();
}

function getHREFAt(index: number): string | null {
    return internalState.contextManager.get(index);
}

function setContext(context: {
    name: string,
    paths: { path: string, fallback?: boolean }[],
    default?: string | null
}): void {
    if (internalState.historyManaged === null) {
        internalState.historyManaged = true;
    }
    return internalState.contextManager.setContext(context);
}

function addContextPath(context: string, href: string, isFallback: boolean = false): RegExp {
    if (internalState.historyManaged === null) {
        internalState.historyManaged = true;
    }
    return internalState.contextManager.addContextPath(context, href, isFallback);
}
function setContextDefaultHref(context: string, href: string): void {
    if (internalState.historyManaged === null) {
        internalState.historyManaged = true;
    }
    return internalState.contextManager.setContextDefaultHref(context, href);
}
function getContextDefaultOf(context: string): string | null {
    return internalState.contextManager.getDefaultOf(context);
}

function getContext(href: string | null = null): string | null {
    if (href == null) {
        return internalState.contextManager.currentContext();
    }
    return internalState.contextManager.contextOf(href);
}

function getHREFs(): string[] {
    if (!internalState.historyManaged) {
        throw new Error("can't keep track of hrefs without history management");
    }
    return internalState.contextManager.hrefs();
}

function isStarted(): boolean {
    return internalState.started;
}

const HistoryManager = {
    setAutoManagement,
    getAutoManagement,
    onWorkFinished<T>(
        callback: (this: T, ...args: any[]) => any,
        context: T = null as any
    ) {
        return onWorkFinished(callback, context, internalState);
    },
    async onWorkFinishedPromise() {
        await awaitableOnWorkFinished(internalState);
    },
    acquire,
    initEventListener() {
        return initEventListener(internalState);
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
    restore(context: string) {
        return restore(context, internalState)
    },
    assign(href: string) {
        return assign(href, internalState);
    },
    replace(href: string) {
        return replace(href, internalState);
    },
    go(direction: number) {
        return go(direction, internalState);
    },
    start(fallbackContext: string | null) {
        return start(fallbackContext, internalState);
    },
    isStarted
};
export default HistoryManager;