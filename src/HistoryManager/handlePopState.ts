import OptionsManager from "../OptionsManager";

import Options from "../types/Options";
import getInternalState from "./getInternalState";

import goBackward from "./goBackward";
import goForward from "./goForward";
import goToNewPage from "./goToNewPage";
import onCatchPopState from "./onCatchPopState";

export default function handlePopState(): void {
    const internalState = getInternalState();

    const options: Options = {
        ...OptionsManager.get(),
        ...(internalState.historyManaged ?
            {} : { front: undefined, back: undefined }
        )
    };
    // Lock handling (including the `locked` marker) is now the sole
    // responsibility of NavigationLock; the orchestrator routes locked
    // popstates there and never reaches this handler for them.

    if (options.front !== undefined) {
        const frontEvent: Event = new Event(
            "historyforward", { cancelable: true }
        );
        window.dispatchEvent(frontEvent);
        if (frontEvent.defaultPrevented) {
            onCatchPopState(() => { return; }, true);
            window.history.go(-1);
            return;
        }

        goForward();
        return;
    }
    
    if (options.back !== undefined) {
        let backEvent: Event = new Event(
            "historybackward", { cancelable: true }
        );
        window.dispatchEvent(backEvent);
        if (backEvent.defaultPrevented) {
            onCatchPopState(() => { return; }, true);
            window.history.go(+1);
            return;
        }
 
        goBackward();
        return;
    }

    goToNewPage();
}