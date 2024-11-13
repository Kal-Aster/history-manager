import OptionsManager from "../OptionsManager";
import HistoryManager from "../HistoryManager";

import InternalNavigationLockState from "../types/InternalNavigationLockState";

import createLockManagerWrapper from "./createLockManagerWrapper";

export default async function lock(
    internalState: InternalNavigationLockState
){
    await HistoryManager.onWorkFinishedPromise();

    let markSetupDone: () => void;
    const setupDonePromise = new Promise<void>(resolve => {
        markSetupDone = resolve;
    });
    const lock = createLockManagerWrapper(
        internalState,
        setupDonePromise
    );

    await OptionsManager.goWith(
        OptionsManager.clearHref(),
        {
            ...OptionsManager.get(),
            locked: lock.lockManager.id
        }
    )

    markSetupDone!();
    return lock.lockManager;
}
