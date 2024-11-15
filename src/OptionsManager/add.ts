import get from "./get";
import set from "./set";

/**
 * Add an option to those stored in the url
 */
export default async function add(
    opt: string,
    value: string | undefined
) {
    const opts = get();
    if (opts[opt] !== undefined && opts[opt] === value) {
        return;
    }

    opts[opt] = value ?? null;
    return set(opts);
}