import InternalOptionsManagerState from "../types/InternalOptionsManagerState";

import get from "./get";
import set from "./set";

/**
 * Remove given option
 * @param opt
 */
export default async function remove(opt: string) {
    const opts = get();
    if (opts[opt] === undefined) {
        return;
    }

    delete opts[opt];
    return set(opts);
}
