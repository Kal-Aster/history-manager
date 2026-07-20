import HistoryManager from "../HistoryManager";

import LockManager from "../types/LockManager";
import LockManagerWrapper from "../types/LockManagerWrapper";

import getInternalState from "./getInternalState";
import unlock from "./unlock";

// Monotonic lock ids. Date.now() collides when several locks are created within
// the same millisecond (e.g. quickly stacked locks), and the LIFO unlock/marker
// bookkeeping keys off the id, so a collision drifts navigation on release.
let nextLockId = 1;

export default function createLockManagerWrapper(
    setupDonePromise: Promise<void>
) {
    const lockingWork = HistoryManager.acquire();

    const id = nextLockId++;
    const delegate = new EventTarget();

    const lockManager: LockManager = {
        get id() { return id; },
        listen(listener: (event: Event) => void): void {
            delegate.addEventListener("navigation", listener);
        },
        unlisten(listener: (event: Event) => void): void {
            delegate.removeEventListener("navigation", listener);
        },
        async unlock() {
            await setupDonePromise;

            // Read the registry only once the await is behind us: a release that
            // lands while this one is still settling — the router's own bookkeeping
            // during a navigation started from a locked page — empties the stack
            // under a check taken any earlier.
            const { locks } = getInternalState();
            if (
                locks.length === 0 ||
                lockingWork.finishing
            ) {
                return;
            }

            if (locks.at(-1)!.lockManager.id === id) {
                unlock(false);
                return;
            }

            locks.some((lock, index) => {
                if (lock.lockManager.id === id) {
                    locks.splice(index, 1)[0].release();
                    return true;
                }
                return false;
            });
        }
    };
    const lockManagerWrapper: LockManagerWrapper = {
        lockManager,
        fire(): boolean {
            const e = new Event("navigation", { cancelable: true });
            delegate.dispatchEvent(e);
            return e.defaultPrevented;
        },
        async release() {
            await setupDonePromise;

            lockingWork.finish();
        },
        async beginRelease() {
            await setupDonePromise;

            lockingWork.beginFinish();
        }
    };
    lockingWork.askFinish = () => {
        if (!lockManagerWrapper.fire()) {
            return false;
        }
        lockManager.unlock();
        return true;
    };

    getInternalState().locks.push(lockManagerWrapper);

    return lockManagerWrapper;
}