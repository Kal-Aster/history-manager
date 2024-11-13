import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import onCatchPopState from "./onCatchPopState"

export default async function awaitableCatchPopState(
    internalState: InternalHistoryManagerState,
    executor: () => void
) {
    const awaiter = new Promise<void>(resolve => {
        onCatchPopState(resolve, true, internalState);
    });
    executor();
    await awaiter;
}