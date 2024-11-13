import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

export default function isLocked(
    internalState: InternalHistoryManagerState
): boolean {
    return internalState.works.some(w => w.locking);
}