import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import onCatchPopState from "./onCatchPopState"

export default async function awaitableOnCatchPopState(
    internalState: InternalHistoryManagerState,
    executor: () => void
) {
    const awaiter = new Promise<void>(resolve => {
        onCatchPopState(resolve, true, internalState);
    });
    executor();
    return awaiter;
}