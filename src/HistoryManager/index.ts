/**
 * @author Giuliano Collacchioni @2020
 */

import ContextManager from "../ContextManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import LockingWork from "../types/LockingWork";

import assign from "./assign";
import awaitableOnWorkFinished from "./awaitableOnWorkFinished";
import createWork from "./createWork";
import getInternalState from "./getInternalState";
import go from "./go";
import initEventListener from "./initEventListener";
import onWorkFinished from "./onWorkFinished";
import replace from "./replace";
import restore from "./restore";
import start from "./start";

function setAutoManagement(value: boolean) {
    const internalState = getInternalState();
    if (internalState.started) {
        throw new Error("HistoryManager already started");
    }
    internalState.historyManaged = !!value;
}
function getAutoManagement() {
    return getInternalState().historyManaged || false;
}

function acquire() {
    return createWork(true);
}

function index() {
    return getInternalState().contextManager.index();
}

function getHREFAt(index: number) {
    return getInternalState().contextManager.get(index);
}

function setContext(context: {
    name: string,
    paths: { path: string, fallback?: boolean }[],
    default?: string | null
}) {
    const internalState = getInternalState();
    if (internalState.historyManaged === null) {
        internalState.historyManaged = true;
    }
    return internalState.contextManager.setContext(context);
}

function addContextPath(
    context: string,
    href: string,
    isFallback: boolean = false
) {
    const internalState = getInternalState();
    if (internalState.historyManaged === null) {
        internalState.historyManaged = true;
    }
    return internalState.contextManager.addContextPath(context, href, isFallback);
}
function setContextDefaultHref(context: string, href: string) {
    const internalState = getInternalState();
    if (internalState.historyManaged === null) {
        internalState.historyManaged = true;
    }
    return internalState.contextManager.setContextDefaultHref(context, href);
}
function getContextDefaultOf(context: string) {
    return getInternalState().contextManager.getDefaultOf(context);
}

function getContext(href: string | null = null) {
    const internalState = getInternalState();
    if (href == null) {
        return internalState.contextManager.currentContext();
    }
    return internalState.contextManager.contextOf(href);
}

function getHREFs() {
    const internalState = getInternalState();
    if (!internalState.historyManaged) {
        throw new Error("can't keep track of hrefs without history management");
    }
    return internalState.contextManager.hrefs();
}

function isStarted(): boolean {
    return getInternalState().started;
}

const HistoryManager = {
    setAutoManagement,
    getAutoManagement,
    onWorkFinished,
    async onWorkFinishedPromise() {
        await awaitableOnWorkFinished();
    },
    acquire,
    initEventListener,
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
export default HistoryManager;