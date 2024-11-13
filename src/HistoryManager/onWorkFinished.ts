import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

export default function onWorkFinished<T>(
    callback: (this: T) => void, context: T,
    internalState: InternalHistoryManagerState
): void {
    if (internalState.works.length === 0) {
        callback.call(context || null as any);
        return;
    }
    internalState.onworkfinished.push(
        [callback, context || null]
    );
}