/**
 * @author Giuliano Collacchioni @2020
 */

import * as OptionsManager from "./OptionsManager";
import * as HistoryManager from "./HistoryManager";

export type Lock = {
    readonly id: number,
    listen(listener: (event: Event) => void): void;
    unlisten(listener: (event: Event) => void): void;
    unlock(): void;
};

type Wrapper = {
    lock: Lock;
    fire(): boolean;
    release(): void;
    beginRelease(start_fn: () => void): void;
};

let locks: Wrapper[] = [];

let catchPopState: null | (() => void) = null;
let destroyEventListener: (() => void) | null = null;
export function initEventListener() {
    if (destroyEventListener !== null) {
        return destroyEventListener;
    }

    const listener = (event: PopStateEvent) => {
        if (catchPopState == null) {
            return handlePopState();
        }
        event.stopImmediatePropagation();
        catchPopState();
    };
    window.addEventListener("popstate", listener, true);
    return destroyEventListener = () => {
        window.removeEventListener("popstate", listener, true);
        destroyEventListener = null;
    };
}

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

export function lock(): Promise<Lock> {
    const delegate: EventTarget = new EventTarget();
    const id: number = Date.now();
    let historyLock: HistoryManager.ILock;
    let promiseResolve: (lock: Lock) => void;
    let isPromiseResolved: boolean = false;
    const promise: Promise<Lock> = new Promise<Lock>(resolve => {
        promiseResolve = lock => {
            resolve(lock);
            isPromiseResolved = true;
        };
    });
    HistoryManager.onWorkFinished(() => {
        historyLock = HistoryManager.acquire();
        const lock: Wrapper = {
            lock: {
                get id(): number {
                    return id;
                },
                listen(listener: (event: Event) => void): void {
                    delegate.addEventListener("navigation", listener);
                },
                unlisten(listener: (event: Event) => void): void {
                    delegate.removeEventListener("navigation", listener);
                },
                unlock(): void {
                    if (!locks.length || historyLock.finishing) {
                        return;
                    }
                    const fn: () => void = () => {
                        if (locks[locks.length - 1].lock.id === id) {
                            unlock();
                        } else {
                            locks.some((lock, index) => {
                                if (lock.lock.id === id) {
                                    locks.splice(index, 1)[0].release();
                                }
                                return false;
                            });
                        }
                    };
                    if (isPromiseResolved) {
                        fn();
                    } else {
                        promise.then(fn);
                    }
                }
            },
            fire(): boolean {
                let e: Event = new Event("navigation", { cancelable: true });
                delegate.dispatchEvent(e);
                return e.defaultPrevented;
            },
            release(): void {
                historyLock.finish();
            },
            beginRelease(start_fn: () => void): void {
                historyLock.beginFinish();
                if (isPromiseResolved) {
                    start_fn();
                } else {
                    promise.then(() => start_fn());
                }
            }
        };
        historyLock.askFinish = () => {
            if (!lock.fire()) {
                return false;
            }
            lock.lock.unlock();
            return true;
        };
        locks.push(lock);

        OptionsManager.goWith(
            OptionsManager.clearHref(),
            { ...OptionsManager.get(), locked: lock.lock.id }
        ).then(() => {
            promiseResolve(lock.lock);
        });
    });
    return promise;
}

export function unlock(force: boolean = true): boolean {
    let wrapper: Wrapper = locks.splice(locks.length - 1, 1)[0];
    if (wrapper == null) {
        return true;
    }
    if (!force && !wrapper.fire()) {
        return false;
    }
    wrapper.beginRelease(() => {
        onCatchPopState(() => {
            wrapper.release();
        }, true);
        window.history.go(-1);
    });
    return true;
}

export function locked(): boolean {
    return locks.length > 0;
}

let shouldUnlock: boolean = false;
function handlePopState(): void {
    if (locks.length === 0) {
        return;
    }
    let lockId: number = parseInt(OptionsManager.get().locked, 10);
    if (isNaN(lockId)) {
        shouldUnlock = true;
        window.history.go(1);
    } else {
        let lock: Wrapper = locks[locks.length - 1];
        if (lockId === lock.lock.id) {
            if (shouldUnlock && lock.fire()) {
                unlock();
            }
            shouldUnlock = false;
            return;
        } else if (lockId > lock.lock.id) {
            window.history.go(-1);
        } else {
            shouldUnlock = true;
            window.history.go(1);
        }
    }
}