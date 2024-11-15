import HistoryManager from "../HistoryManager";

import getInternalState from "./getInternalState";

export default async function goToPath(
    path: string,
    replace = false,
    shouldEmitRoute = true
) {
    const state = getInternalState();

    const lastEmitRoute = state.emitRoute;
    state.emitRoute = shouldEmitRoute;
    try {
        if (replace) {
            await HistoryManager.replace(path);
        } else {
            await HistoryManager.assign(path)
        }
    } catch (error) {
        state.emitRoute = lastEmitRoute;
        throw error;
    }
}