import HistoryManager from "../HistoryManager";

import getInternalState from "./getInternalState";
import goToPath from "./goToPath";

export default async function go(
    direction: string | number,
    options: {
        emit?: boolean,
        replace?: boolean,
    } = {}
) {
    if (
        typeof direction !== "string" &&
        typeof direction !== "number"
    ) {
        throw new Error("go should receive an url as string or a direction as number");
    }
    const normalizedOptions = {
        emit: true,
        replace: false,
        ...options
    };

    const goingEvent = new CustomEvent<{
        direction: string | number,
        replace?: boolean,
        emit: boolean
    }>(
        "router:going",
        {
            detail: {
                direction,
                ...normalizedOptions
            },
            cancelable: true
        }
    );
    window.dispatchEvent(goingEvent);
    if (goingEvent.defaultPrevented) {
        // should throw error?
        throw new Error("router going prevented");
        return;
    }

    if (typeof direction === "string") {
        return await goToPath(
            direction as string,
            (normalizedOptions && normalizedOptions.replace) || false,
            (normalizedOptions == null || normalizedOptions.emit == null) ? true : normalizedOptions.emit
        );
    }

    const state = getInternalState();

    const lastEmitRoute = state.emitRoute;
    state.emitRoute = normalizedOptions.emit;
    try {
        await HistoryManager.go(direction);
    } catch (error) {
        state.emitRoute = lastEmitRoute;
        throw error;
    }
}