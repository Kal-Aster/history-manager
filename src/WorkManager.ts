interface ILock {
    release(): void;
    beginRelease(start_fn: () => void): void;
    readonly releasing: boolean;
    readonly released: boolean;
    onrelease<T>(callback: (this: T) => void, context?: T): void;
}

let locks: ILock[] = [];
export function lock(locking_fn: (this: ILock, lock: ILock) => boolean | void): Promise<ILock> {
    let released: boolean = false;
    let releasing: boolean = false;
    let onrelease: [() => void, any][] = [];
    let promise: Promise<ILock>;
    let lock: ILock = {
        get released(): boolean {
            return released;
        },
        get releasing(): boolean {
            return releasing;
        },
        release(): void {
            if (released) {
                return;
            }
            released = true;
            releasing = false;

            let i: number = locks.length - 1;
            for (; i >= 0; i--) {
                if (locks[i] === lock) {
                    locks.splice(i, 1);
                    break;
                }
            }
            if (i >= 0) {
                onrelease.forEach(([callback, context]) => {
                    callback.call(context || null);
                });
            }
        },
        beginRelease(start_fn: () => void): void {
            releasing = true;
            start_fn();
        },
        onrelease<T>(callback: (this: T) => void, context: T = null as any): void {
            onrelease.push([callback, context || null]);
        }
    };
    return promise = new Promise<ILock>(resolve => {
        ondone(() => {
            let result: boolean | void = locking_fn.call(lock, lock);
            locks.push(lock);
            if (result !== false && result !== void 0) {
                lock.release();
            }
            resolve(lock);
        });
    });
}

export function locked(): boolean {
    return locks.length > 0 && locks.every(lock => !lock.releasing && !lock.released);
}

let currentWork: number = -1;
let working: number = 0;
let ondoneCallbacks: [() => void, any][] = [];
function completeWork(): void {
    if (currentWork === -1) {
        return;
    }
    if (--working === 0) {
        currentWork = -1;
        while (ondoneCallbacks.length && currentWork === -1) {
            let [callback, context] = ondoneCallbacks.shift();
            callback.call(context || null);
        }
    }
}

function ondoneWork<T>(fn: (this: T) => void, context: T, workId: number): void {
    if (currentWork !== -1 && currentWork !== workId) {
        ondoneCallbacks.push([fn, context || null]);
        return;
    }
    fn.call(context || null as any);
}

export function startWork(start_fn: (complete: () => void, id: number) => void, id: number = Date.now()): number {
    if (locked()) {
        console.error("navigation is locked");
        return -1;
    }
    let completed: boolean = false;
    ondoneWork(() => {
        currentWork = id;
        working++;
        start_fn(() => {
            if (completed) {
                return;
            }
            completed = true;
            completeWork();
        }, id);
    }, null, id);
    return id;
}

export function ondone<T>(fn: (this: T) => void, context?: T): void {
    if (working) {
        ondoneCallbacks.push([fn, context || null]);
        return;
    }
    fn.call(context || null as any);
}