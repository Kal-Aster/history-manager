import HistoryManager from "../HistoryManager";
import NavigationLock from "../NavigationLock";

import getInternalState from "./getInternalState";
import onhistorylanded from "./onhistorylanded";
import onpopstate from "./onpopstate";

export default function initEventListener() {
    const state = getInternalState();

    if (state.destroyEventListener !== null) {
        return state.destroyEventListener;
    }

    // Module init no longer registers popstate listeners; it only wires up
    // per-module setup (e.g. OptionsManager's one-shot load cleanup).
    const destroyHistoryEventListener = HistoryManager.initEventListener();
    const destroyNavigationLockEventListener = NavigationLock.initEventListener();

    // Single popstate authority for the whole library.
    window.addEventListener("popstate", onpopstate, true);
    window.addEventListener("historylanded", onhistorylanded);

    return state.destroyEventListener = () => {
        window.removeEventListener("popstate", onpopstate, true);
        window.removeEventListener("historylanded", onhistorylanded);
        destroyNavigationLockEventListener();
        destroyHistoryEventListener();
        state.destroyEventListener = null;
    };
}
