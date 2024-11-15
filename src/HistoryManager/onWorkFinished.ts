import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import getInternalState from "./getInternalState";

export default function onWorkFinished<T>(
    callback: (this: T) => void, context: T
): void {
    const internalState = getInternalState();
    if (internalState.works.length === 0) {
        callback.call(context || null as any);
        return;
    }
    internalState.onworkfinished.push(
        [callback, context || null]
    );
}