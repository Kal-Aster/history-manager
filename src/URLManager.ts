/**
 * @author Giuliano Collacchioni @2020
 */

import { clearHref } from "./OptionsManager";
import { prepare } from "./PathGenerator";

let BASE: string = "#";
const LOCATION_BASE: string = `${
    window.location.protocol
}//${
    window.location.host
}${
    window.location.port ? `:${window.location.port}` : ""
}`;
const LOCATION_PATHNAME = window.location.pathname;

const parenthesesRegex: RegExp = /[\\\/]+/g;

export function base(value?: string): string {
    if (value != null) {
        if (typeof value !== "string") {
            throw new TypeError("invalid base value");
        }
        value += "/";
        value.replace(parenthesesRegex, "/");
        if (value[0] !== "#" && value[0] !== "/") {
            value = "/" + value;
        }
        if (value[0] === "/" && !window.history.pushState) {
            value = "#" + value;
        }
        BASE = value;
    }
    return BASE;
}
export function get(): string {
    const LOCATION = LOCATION_BASE + LOCATION_PATHNAME;
    return prepare(clearHref().split(LOCATION).slice(1).join(LOCATION).split(BASE).slice(1).join(BASE));
}
export function construct(href: string, full: boolean = false): string {
    switch (href[0]) {
        case "?": {
            href = get().split("?")[0] + href;
            break;
        }
        case "#": {
            href = get().split("#")[0] + href;
            break;
        }
        default: { break; }
    }
    return (full ? LOCATION_BASE + (BASE[0] === "#" ? LOCATION_PATHNAME : "") : "") +
        (BASE + "/" + href).replace(parenthesesRegex, "/")
    ;
}