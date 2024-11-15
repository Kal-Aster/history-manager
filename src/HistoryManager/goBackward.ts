import addFront from "./addFront";
import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import getInternalState from "./getInternalState";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";

export default async function goBackward() {
    const internalState = getInternalState();
    const { contextManager } = internalState;

    const frontHref: string = contextManager.get()!;
    const href: string = contextManager.goBackward();
    
    if (contextManager.index() > 0) {
        await awaitableOnCatchPopState(() => {
            window.history.go(1);
        });
    }

    await awaitableOnCatchPopState(() => {
        goToHREF(href, true);
    });
    await addFront(frontHref);

    internalState.hasBack = contextManager.index() > 0;
    onLanded();
}