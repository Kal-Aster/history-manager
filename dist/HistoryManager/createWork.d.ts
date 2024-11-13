import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import LockingWork from "../types/LockingWork";
import Work from "../types/Work";
export default function createWork(locking: false, internalState: InternalHistoryManagerState): Work;
export default function createWork(locking: true, state: InternalHistoryManagerState): LockingWork;
