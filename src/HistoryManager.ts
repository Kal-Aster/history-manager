/**
 * @author Giuliano Collacchioni @2020
 */

import * as OptionsManager from "./OptionsManager";

import * as URLManager from "./URLManager";
import { ContextManager } from "./ContextManager";

let started: boolean = false;
let historyManaged: boolean | null = null;

export function setAutoManagement(value: boolean): void {
    if (started) {
        throw new Error("HistoryManager already started");
    }
    historyManaged = !!value;
}
export function getAutoManagement(): boolean {
    return historyManaged || false;
}

export interface IWork {
    finish(): void;
    beginFinish(): void;
    askFinish(): boolean;
    readonly finishing: boolean;
    readonly finished: boolean;
    readonly locking: boolean;
}

export interface ILock extends IWork {
    readonly locking: true;
}

let works: IWork[] = [];

let onworkfinished: [ () => void, any ][] = [];
export function onWorkFinished<T>(callback: (this: T) => void, context?: T): void {
    if (works.length === 0) {
        callback.call(context || null as any);
        return;
    }
    onworkfinished.push([callback, context || null]);
}

function createWork(locking?: false): IWork;
function createWork(locking: true): ILock;
function createWork(locking: boolean = false): IWork | ILock {
    let finished: boolean = false;
    let finishing: boolean = false;
    let work: IWork = {
        get locking(): boolean {
            return locking;
        },
        get finished(): boolean {
            return finished;
        },
        get finishing(): boolean {
            return finishing;
        },
        finish(): void {
            if (finished) {
                return;
            }
            finished = true;
            finishing = false;

            let i: number = works.length - 1;
            for (; i >= 0; i--) {
                if (works[i] === work) {
                    works.splice(i, 1);
                    break;
                }
            }

            if (i >= 0 && works.length === 0) {
                while (onworkfinished.length > 0 && works.length === 0) {
                    let [callback, context] = onworkfinished.shift()!;
                    callback.call(context || window);
                }
            }
        },
        beginFinish(): void {
            finishing = true;
        },
        askFinish(): boolean {
            return false;
        }
    };
    works.push(work);
    return work;
}

export function acquire(): ILock {
    let lock: ILock = createWork(true);
    return lock;
}
function isLocked(): boolean {
    return works.some(w => w.locking);
}
let catchPopState: (() => void) | null = null;
window.addEventListener("popstate", event => {
    if (!started || isLocked()) {
        return;
    }
    if (catchPopState == null) {
        handlePopState();
        return;
    }
    event.stopImmediatePropagation();
    catchPopState();
}, true);

function onCatchPopState(onCatchPopState: () => void, once: boolean = false): void {
    if (once) {
        let tmpOnCatchPopState: () => void = onCatchPopState;
        onCatchPopState = () => {
            catchPopState = null;
            tmpOnCatchPopState();
        };
    }
    catchPopState = onCatchPopState;
}

function goTo(href: string, replace: boolean = false): void {
    const fullHref = URLManager.construct(href, true);
    href = URLManager.construct(href);
    if (window.location.href === fullHref) {
        window.dispatchEvent(new Event("popstate"));
        return;
    }
    if (href[0] === "#") {
        if (replace) {
            window.location.replace(href);
        } else {
            window.location.assign(href);
        }
    } else {
        if (replace) {
            window.history.replaceState({}, "", href);
        } else {
            window.history.pushState({}, "", href);
        }
        window.dispatchEvent(new Event("popstate"));
    }
}

export function addFront(frontHref: string = "next"): Promise<void> {
    let href: string = URLManager.get();
    let work: IWork = createWork();
    return new Promise(resolve => {
        OptionsManager.goWith(URLManager.construct(frontHref, true), { back: undefined, front: null })
        .then(() => new Promise<void>(resolve => {
            onCatchPopState(resolve, true);
            window.history.go(-1);
        }))
        .then(() => new Promise<void>(resolve => {
            onCatchPopState(resolve, true);
            goTo(href, true);
        }))
        .then(() => {
            work.finish();
            resolve();
        });
    });
}

export function addBack(backHref: string = ""): Promise<void> {
    let href: string = URLManager.get();
    let work: IWork = createWork();
    return new Promise<void>(resolve => {
        (new Promise<void>(resolve => {
            onCatchPopState(resolve, true);
            window.history.go(-1);
        }))
        .then(() => new Promise<void>(resolve => {
            if (backHref) {
                onCatchPopState(resolve, true);
                goTo(backHref, true);
            } else {
                resolve();
            }
        }))
        .then(() => OptionsManager.set({ back: null, front: undefined }))
        .then(() => new Promise<void>(resolve => {
            onCatchPopState(resolve, true);
            goTo(href);
        }))
        .then(() => {
            work.finish();
            resolve();
        });
    });
}

let hasBack: boolean = false;

let contextManager: ContextManager = new ContextManager();
export function index(): number {
    return contextManager.index();
}

export function getHREFAt(index: number): string | null {
    return contextManager.get(index);
}

export function setContext(context: {
    name: string,
    paths: { path: string, fallback?: boolean }[],
    default?: string | null
}): void {
    if (historyManaged === null) {
        historyManaged = true;
    }
    return contextManager.setContext(context);
}

export function addContextPath(context: string, href: string, isFallback: boolean = false): RegExp {
    if (historyManaged === null) {
        historyManaged = true;
    }
    return contextManager.addContextPath(context, href, isFallback);
}
export function setContextDefaultHref(context: string, href: string): void {
    if (historyManaged === null) {
        historyManaged = true;
    }
    return contextManager.setContextDefaultHref(context, href);
}
export function getContextDefaultOf(context: string): string | null {
    return contextManager.getDefaultOf(context);
}

export function getContext(href: string | null = null): string | null {
    if (href == null) {
        return contextManager.currentContext();
    }
    return contextManager.contextOf(href);
}

export function getHREFs(): string[] {
    if (!historyManaged) {
        throw new Error("can't keep track of hrefs without history management");
    }
    return contextManager.hrefs();
}

function tryUnlock(): number {
    let locksAsked: number = 0;
    for (let i: number = works.length - 1; i >= 0; i--) {
        let work: IWork = works[i];
        if (work.locking && !work.finishing) {
            if (!work.askFinish()) {
                return -1;
            }
            locksAsked++;
        }
    }
    return locksAsked;
}

let workToRelease: IWork | null = null;

export function restore(context: string): Promise<void> {
    if (!historyManaged) {
        throw new Error("can't restore a context without history management");
    }
    let locksFinished: number = tryUnlock();
    if (locksFinished === -1) {
        return new Promise<void>((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>(resolve => { promiseResolve = resolve;});
    onWorkFinished(() => {
        let previousIndex: number = contextManager.index();
        if (contextManager.restore(context)) {
            let replace: boolean = previousIndex >= contextManager.index();
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            let href: string = contextManager.get()!;
            let hadBack: boolean = hasBack;
            (new Promise<void>(resolve => {
                if (!replace && !hasBack) {
                    onCatchPopState(resolve, true);
                    goTo(href);
                } else {
                    resolve();
                }
            }))
            .then(() => new Promise<void>(resolve => {
                let index: number = contextManager.index() - 1;
                if (replace && !hasBack) {
                    resolve();
                } else {
                    addBack(contextManager.get(index)!)
                    .then(() => {
                        hasBack = true;
                        resolve();
                    });
                }
            }))
            .then(() => new Promise<void>(resolve => {
                if (hadBack || replace) {
                    onCatchPopState(resolve, true);
                    goTo(href, true);
                } else {
                    resolve();
                }
            }))
            .then(onlanded);
        } else {
            promiseResolve();
        }
    });
    return promise;
}

export function assign(href: string): Promise<void> {
    let locksFinished: number = tryUnlock();
    if (locksFinished === -1) {
        return new Promise<void>((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>(resolve => { promiseResolve = resolve;});
    onWorkFinished(() => {
        workToRelease = createWork();
        onWorkFinished(promiseResolve);
        goTo(href);
    });
    return promise;
}

let replacing: boolean = false;
export function replace(href: string): Promise<void> {
    let locksFinished: number = tryUnlock();
    if (locksFinished === -1) {
        return new Promise<void>((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<void> = new Promise<void>(resolve => { promiseResolve = resolve; });
    onWorkFinished(() => {
        workToRelease = createWork();
        onWorkFinished(promiseResolve);
        goTo(href, replacing = true);
    });
    return promise;
}

export function go(direction: number): Promise<void> {
    let locksFinished: number = tryUnlock();
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
        if (historyManaged === false) {
            window.history.go(direction);
            promiseResolve();
            return;
        }
        const contextIndex: number = contextManager.index();
        let index: number = Math.max(0, Math.min(contextManager.length() - 1, contextIndex + direction));
        if (contextIndex === index) {
            onlanded();
            promiseResolve();
            return;
        }
        workToRelease = createWork();
        onWorkFinished(promiseResolve);
        if (direction > 0) {
            contextManager.index(index - 1);
            window.history.go(1);
        } else {
            contextManager.index(index + 1);
            window.history.go(-1);
        }
    });
    return promise;
}

export function start(fallbackContext: string | null): Promise<void> {
    if (historyManaged === null) {
        historyManaged = false;
    }
    fallbackContext = historyManaged ?
        (fallbackContext === void 0 ? contextManager.getContextNames()[0] : fallbackContext)
        : null
    ;
    let href: string = URLManager.get();
    let promiseResolve: () => void;
    let promiseReject: () => void;
    const promise: Promise<void> = new Promise<void>((resolve, reject) => {
        promiseResolve = resolve; promiseReject = reject;
    });
    if (historyManaged) {
        let context: string | null = contextManager.contextOf(href, false);
        if (context == null) {
            if (!fallbackContext) {
                throw new Error("must define a fallback context");
            }
            let defaultHREF: string | null = contextManager.getDefaultOf(fallbackContext);
            if (defaultHREF == null) {
                throw new Error("must define a default href for the fallback context");
            }
            started = true;
            href = defaultHREF;
            workToRelease = createWork();
            onCatchPopState(() => { onlanded(); promiseResolve(); }, true);
            goTo(defaultHREF, true);
        }
        contextManager.insert(href);
        if (context == null) {
            promiseReject!();
            return promise;
        }
    }
    started = true;
    onlanded();
    promiseResolve!();
    return promise;
}

export function isStarted(): boolean {
    return started;
}

function onlanded(): void {
    window.dispatchEvent(new Event("historylanded"));
    if (workToRelease != null) {
        let work: IWork = workToRelease;
        workToRelease = null;
        work.finish();
    }
}

function handlePopState(): void {
    let options: OptionsManager.Options = {
        ...OptionsManager.get(),
        ...(historyManaged ? {} : { front: undefined, back: undefined })
    };
    if (options.locked) {
        onCatchPopState(() => {
            if (OptionsManager.get().locked) {
                handlePopState();
            }
        }, true);
        window.history.go(-1);
        return;
    }
    if (options.front !== undefined) {
        let frontEvent: Event = new Event("historyforward", { cancelable: true });
        window.dispatchEvent(frontEvent);
        if (frontEvent.defaultPrevented) {
            onCatchPopState(() => { return; }, true);
            window.history.go(-1);
            return;
        }
        // should go forward in history
        let backHref: string = contextManager.get()!;
        let href: string = contextManager.goForward();
        (new Promise<void>(resolve => {
            if (hasBack) {
                onCatchPopState(resolve, true);
                window.history.go(-1);
            } else {
                resolve();
            }
        }))
        .then(() => new Promise<void>(resolve => {
            onCatchPopState(resolve, true);
            goTo(href, true);
        }))
        .then(addBack.bind(null, backHref))
        .then(() => new Promise<void>(resolve => {
            if (contextManager.index() < contextManager.length() - 1) {
                onCatchPopState(resolve, true);
                addFront(contextManager.get(contextManager.index() + 1)!).then(resolve);
            } else {
                resolve();
            }
        }))
        .then(() => {
            hasBack = true;
            onlanded();
        });
    } else if (options.back !== undefined) {
        let backEvent: Event = new Event("historybackward", { cancelable: true });
        window.dispatchEvent(backEvent);
        if (backEvent.defaultPrevented) {
            onCatchPopState(() => { return; }, true);
            window.history.go(+1);
            return;
        }
        // should go backward in history
        let frontHref: string = contextManager.get()!;
        let href: string = contextManager.goBackward();
        (new Promise<void>(resolve => {
            if (contextManager.index() > 0) {
                onCatchPopState(resolve, true);
                window.history.go(1);
            } else {
                resolve();
            }
        }))
        .then(() => new Promise<void>(resolve => {
            onCatchPopState(resolve, true);
            goTo(href, true);
        }))
        .then(addFront.bind(null, frontHref))
        .then(() => {
            hasBack = contextManager.index() > 0;
            onlanded();
        });
    } else {
        // should add new page to history
        let href: string = URLManager.get();
        let backHref: string = contextManager.get()!;
        if (href === backHref || !historyManaged) {
            return onlanded();
        }
        let replaced: boolean = replacing;
        replacing = false;
        let willHaveBack: boolean = hasBack || !replaced;
        contextManager.insert(href, replaced);
        (new Promise<void>(resolve => {
            if (hasBack && !replaced) {
                onCatchPopState(resolve, true);
                window.history.go(-1);
            } else {
                resolve();
            }
        }))
        .then(() => {
            if (replaced) {
                return Promise.resolve();
            }
            return addBack(backHref);
        })
        .then(() => new Promise<void>(resolve => {
            onCatchPopState(resolve, true);
            goTo(href, true);
        }))
        .then(() => {
            hasBack = willHaveBack;
            onlanded();
        });
    }
}