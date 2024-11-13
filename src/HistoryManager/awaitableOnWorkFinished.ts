import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import onWorkFinished from "./onWorkFinished";

export default async function awaitableOnWorkFinished(
    internalState: InternalHistoryManagerState
) {
    return new Promise<void>(resolve => {
        onWorkFinished(resolve, null, internalState);
    });
}