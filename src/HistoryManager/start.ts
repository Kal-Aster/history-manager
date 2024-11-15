import URLManager from "../URLManager";

import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import createWork from "./createWork";
import getInternalState from "./getInternalState";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";

export default async function start(fallbackContext: string | null) {
    const internalState = getInternalState();
    if (internalState.started) {
        throw new Error("Already started");
    }

    if (internalState.historyManaged == null) {
        internalState.historyManaged = false;
    }

    fallbackContext = (internalState.historyManaged ?
        (fallbackContext == null ?
            internalState.contextManager.getContextNames()[0] :
            fallbackContext
        ) : null
    );
    let href = URLManager.get();

    if (internalState.historyManaged) {
        const context = internalState.contextManager.contextOf(
            href, false
        );
        if (context == null) {
            if (fallbackContext == null) {
                throw new Error("Must define a fallback context");
            }
            const defaultHREF = internalState.contextManager.getDefaultOf(
                fallbackContext
            );
            if (defaultHREF == null) {
                throw new Error("Must define a default href for the fallback context");
            }
            internalState.started = true;
            href = defaultHREF;
            internalState.workToRelease = createWork(false);
            await awaitableOnCatchPopState(() => {
                goToHREF(defaultHREF, true);
            });
        }

        internalState.contextManager.insert(href);
    }

    internalState.started = true;
    onLanded();
}
