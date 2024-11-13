import InternalOptionsManagerState from "../types/InternalOptionsManagerState";
import onCatchPopState from "./onCatchPopState";

export default async function goTo(
    href: string,
    replace: boolean,
    internalState: InternalOptionsManagerState
) {
    if (href === window.location.href) {
        return;
    }

    return new Promise<void>(resolve => {
        onCatchPopState(resolve, true, internalState);

        if (href[0] === "#") {
            if (replace) {
                window.location.replace(href);
            } else {
                window.location.assign(href);
            }
        } else {
            if (replace) {
                window.history.replaceState({}, "", href);
            } else {
                window.history.pushState({}, "", href);
            }
            window.dispatchEvent(new Event("popstate"));
        }
    });
}
