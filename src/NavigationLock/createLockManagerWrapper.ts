import HistoryManager from "../HistoryManager";

import LockManager from "../types/LockManager";
import LockManagerWrapper from "../types/LockManagerWrapper";

import getInternalState from "./getInternalState";
import unlock from "./unlock";

export default function createLockManagerWrapper(
    setupDonePromise: Promise<void>
) {
    const lockingWork = HistoryManager.acquire();

    const id: number = Date.now();
    const delegate: EventTarget = new EventTarget();

    const lockManager: LockManager = {
        get id() { return id; },
        listen(listener: (event: Event) => void): void {
            delegate.addEventListener("navigation", listener);
        },
        unlisten(listener: (event: Event) => void): void {
            delegate.removeEventListener("navigation", listener);
        },
        async unlock() {
            const { locks } = getInternalState();
            if (
                locks.length === 0 ||
                lockingWork.finishing
            ) {
                return;
            }

            await setupDonePromise;

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