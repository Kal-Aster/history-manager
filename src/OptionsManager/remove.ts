import InternalOptionsManagerState from "../types/InternalOptionsManagerState";
import get from "./get";
import set from "./set";

/**
 * Remove given option
 * @param opt
 */
export default async function remove(
    opt: string,
    internalState: InternalOptionsManagerState
) {
    const opts = get(internalState);
    if (opts[opt] === undefined) {
        return;
    }

    delete opts[opt];
    return set(opts, internalState);
}
