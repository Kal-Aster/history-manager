import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import LockingWork from "../types/LockingWork";
import Work from "../types/Work";

export default function createWork(
    locking: false,
    internalState: InternalHistoryManagerState
): Work;
export default function createWork(
    locking: true,
    state:InternalHistoryManagerState
): LockingWork;
export default function createWork(
    locking: boolean,
    state: InternalHistoryManagerState
): Work | LockingWork {
    let finished: boolean = false;
    let finishing: boolean = false;

    const {
        works,
        onworkfinished
    } = state;

    const work: Work = {
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