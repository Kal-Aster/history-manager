import InternalNavigationLockState from "../types/InternalNavigationLockState"
import onCatchPopState from "./onCatchPopState"

export default async function onCatchPopStatePromise(
    internalState: InternalNavigationLockState
) {
    return new Promise<void>(resolve => {
        onCatchPopState(resolve, true, internalState);
    });
}