import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
export default function awaitableCatchPopState(internalState: InternalHistoryManagerState, executor: () => void): Promise<void>;
