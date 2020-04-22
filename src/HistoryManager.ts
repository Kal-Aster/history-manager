/**
 * @author Giuliano Collacchioni @2020
 */

import OptionsManager = require("./OptionsManager");

import URLManager = require("./URLManager");
import { ContextManager } from "./ContextManager";

let started: boolean = false;

export interface IWork {
    finish(): void;
    beginFinish(): void;
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
                    let [callback, context] = onworkfinished.shift();
                    callback.call(context || window);
                }
            }
        },
        beginFinish(): void {
            finishing = true;
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
    href = URLManager.construct(href);
    if (window.location.href === href) {
        window.dispatchEvent(new Event("popstate"));
        return;
    }
    if (replace) {
        window.location.replace(href);
    } else {
        window.location.assign(href);
    }
}

export function addFront(frontHref: string = "next"): Promise<undefined> {
    let href: string = URLManager.get();
    let work: IWork = createWork();
    return new Promise(resolve => {
        OptionsManager.goWith(URLManager.construct(frontHref), { back: undefined, front: null })
        .then(() => new Promise<undefined>(resolve => {
            onCatchPopState(resolve, true);
            window.history.go(-1);
        }))
        .then(() => new Promise(resolve => {
            onCatchPopState(resolve, true);
            goTo(href, true);
        }))
        .then(() => {
            work.finish();
            resolve();
        });
    });
}

export function addBack(backHref: string = ""): Promise<undefined> {
    let href: string = URLManager.get();
    let work: IWork = createWork();
    return new Promise(resolve => {
        (new Promise(resolve => {
            onCatchPopState(resolve, true);
            window.history.go(-1);
        }))
        .then(() => new Promise(resolve => {
            if (backHref) {
                onCatchPopState(resolve, true);
                goTo(backHref, true);
            } else {
                resolve();
            }
        }))
        .then(() => OptionsManager.set({ back: null, front: undefined }))
        .then(() => new Promise(resolve => {
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
    return contextManager.setContext(context);
}

export function addContextPath(context: string, href: string, isFallback: boolean = false): RegExp {
    return contextManager.addContextPath(context, href, isFallback);
}
export function setContextDefaultHref(context: string, href: string): void {
    return contextManager.setContextDefaultHref(context, href);
}

export function getContext(href: string | null = null): string | null {
    if (href == null) {
        return contextManager.currentContext();
    }
    return contextManager.contextOf(href);
}

export function getHREFs(): string[] {
    return contextManager.hrefs();
}

function errorIfLocked(): boolean {
    for (let i: number = works.length - 1; i >= 0; i--) {
        let work: IWork = works[i];
        if (work.locking && !work.finishing) {
            return true;
        }
    }
    return false;
}

let workToRelease: IWork | null = null;

export function restore(context: string): Promise<undefined> {
    if (errorIfLocked()) {
        return new Promise((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<undefined> = new Promise(resolve => { promiseResolve = resolve;});
    onWorkFinished(() => {
        let previousIndex: number = contextManager.index();
        if (contextManager.restore(context)) {
            let replace: boolean = previousIndex >= contextManager.index();
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            let href: string = contextManager.get()!;
            let hadBack: boolean = hasBack;
            (new Promise<undefined>(resolve => {
                if (!replace && !hasBack) {
                    onCatchPopState(resolve, true);
                    goTo(href);
                } else {
                    resolve();
                }
            }))
            .then(() => new Promise<undefined>(resolve => {
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
            .then(() => new Promise(resolve => {
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

export function assign(href: string): Promise<undefined> {
    if (errorIfLocked()) {
        return new Promise((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<undefined> = new Promise(resolve => { promiseResolve = resolve;});
    onWorkFinished(() => {
        workToRelease = createWork();
        onWorkFinished(promiseResolve);
        goTo(href);
    });
    return promise;
}

let replacing: boolean = false;
export function replace(href: string): Promise<undefined> {
    if (errorIfLocked()) {
        return new Promise((_, reject) => { reject(); });
    }
    let promiseResolve: () => void;
    let promise: Promise<undefined> = new Promise(resolve => { promiseResolve = resolve; })
    onWorkFinished(() => {
        workToRelease = createWork();
        onWorkFinished(promiseResolve);
        goTo(href, replacing = true);
    });
    return promise;
}

export function go(direction: number): Promise<undefined> {
    if (errorIfLocked()) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }
    if (direction === 0) {
        throw new Error("direction must be different than 0");
    }
    direction = parseInt(direction as any, 10);
    if (isNaN(direction)) {
        throw new Error("direction must be a number");
    }
    let promiseResolve: () => void;
    let promise: Promise<undefined> = new Promise((resolve, reject) => { promiseResolve = resolve; });
    onWorkFinished(() => {
        let index: number = contextManager.index() + direction;
        if (index < 0 || index >= contextManager.length()) {
            return onlanded();
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

export function start(fallbackContext: string | null = contextManager.getContextNames()[0]): void {
    let href: string = URLManager.get();
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
        onCatchPopState(onlanded, true);
        goTo(defaultHREF, true);
    }
    contextManager.insert(href);
    if (context != null) {
        started = true;
        onlanded();
    }
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
    let options: OptionsManager.Options = OptionsManager.get();
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
        (new Promise<undefined>(resolve => {
            if (hasBack) {
                onCatchPopState(resolve, true);
                window.history.go(-1);
            } else {
                resolve();
            }
        }))
        .then(() => new Promise<undefined>(resolve => {
            onCatchPopState(resolve, true);
            goTo(href, true);
        }))
        .then(addBack.bind(null, backHref))
        .then(() => new Promise<undefined>(resolve => {
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
        (new Promise<undefined>(resolve => {
            if (contextManager.index() > 0) {
                onCatchPopState(resolve, true);
                window.history.go(1);
            } else {
                resolve();
            }
        })).then(() => new Promise<undefined>(resolve => {
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
        if (href === backHref) {
            return onlanded();
        }
        let replaced: boolean = replacing;
        replacing = false;
        contextManager.insert(href, replaced);
        (new Promise<undefined>(resolve => {
            if (hasBack && !replaced) {
                onCatchPopState(resolve, true);
                window.history.go(-1);
            } else {
                resolve();
            }
        }))
        .then(addBack.bind(null, backHref))
        .then(() => new Promise(resolve => {
            onCatchPopState(resolve, true);
            goTo(href, true);
        }))
        .then(() => {
            hasBack = true;
            onlanded();
        });
    }
}