import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import getInternalState from "./getInternalState";

export default function onLanded() {
    window.dispatchEvent(new Event("historylanded"));

    const internalState = getInternalState();
    if (internalState.workToRelease == null) {
        return;
    }
    const work = internalState.workToRelease;
    internalState.workToRelease = null;

    work.finish();
}