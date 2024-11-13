import InternalOptionsManagerState from "../types/InternalOptionsManagerState";

export default function splitHref(
    href: string,
    { DIVIDER }: InternalOptionsManagerState
): [string, string] {
    const splitted = href.split(DIVIDER);
    if (splitted.length < 2) {
        return [ splitted[0], splitted[1] || "" ];
    }
    return [
        splitted.slice(0, -1).join(DIVIDER),
        splitted.at(-1)!
    ];
}
