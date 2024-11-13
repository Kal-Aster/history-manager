import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

import addBack from "./addBack";
import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import awaitableOnWorkFinished from "./awaitableOnWorkFinished";
import createWork from "./createWork";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";
import onWorkFinished from "./onWorkFinished";
import tryUnlock from "./tryUnlock";

export default async function restore(
    context: string,
    internalState: InternalHistoryManagerState
) {
    if (!internalState.historyManaged) {
        throw new Error("can't restore a context without history management");
    }
    const locksFinished: number = tryUnlock(internalState);
    if (locksFinished < 0) {
        throw new Error("Rejected unlock");;
    }

    await awaitableOnWorkFinished(internalState);

    const { contextManager } = internalState;
    const previousIndex: number = contextManager.index();

    if (!contextManager.restore(context)) {
        return;
    }

    const replace = previousIndex >= contextManager.index();
    const href = contextManager.get()!;
    const hadBack = internalState.hasBack;

    if (!replace && !internalState.hasBack) {
        await awaitableOnCatchPopState(internalState, () => {
            goToHREF(href);
        });
    }

    const index = contextManager.index() - 1;
    if (!replace || internalState.hasBack) {
        await addBack(contextManager.get(index)!, internalState);
        internalState.hasBack = true;
    }

    if (hadBack || replace) {
        await awaitableOnCatchPopState(internalState, () => {
            goToHREF(href, true);
        });
    }

    onLanded(internalState);
}