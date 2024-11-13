import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import addFront from "./addFront";
import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";

export default async function goBackward(
    internalState: InternalHistoryManagerState
) {
    const { contextManager } = internalState;

    const frontHref: string = contextManager.get()!;
    const href: string = contextManager.goBackward();
    
    if (contextManager.index() > 0) {
        await awaitableOnCatchPopState(internalState, () => {
            window.history.go(1);
        });
    }

    await awaitableOnCatchPopState(internalState, () => {
        goToHREF(href, true);
    });
    await addFront(frontHref, internalState);

    internalState.hasBack = contextManager.index() > 0;
    onLanded(internalState);
}