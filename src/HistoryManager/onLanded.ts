import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

export default function onLanded(
    internalState: InternalHistoryManagerState
): void {
    window.dispatchEvent(new Event("historylanded"));
    if (internalState.workToRelease == null) {
        return;
    }
    const work = internalState.workToRelease;
    internalState.workToRelease = null;

    work.finish();
}