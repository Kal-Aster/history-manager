/**
 * @author Giuliano Collacchioni @2020
 */

import OptionsManager from "./OptionsManager";
import { prepare } from "./PathGenerator";

let BASE: string = "#";
let LOCATION_BASE: string | null = null;
let LOCATION_PATHNAME: string | null = null;

function getLocationBase() {
    if (LOCATION_BASE !== null) {
        return LOCATION_BASE;
    }
    return LOCATION_BASE = `${
        window.location.protocol
    }//${
        window.location.host
    }`;
}
function getLocationPathname() {
    if (LOCATION_PATHNAME !== null) {
        return LOCATION_PATHNAME;
    }
    return LOCATION_PATHNAME = window.location.pathname;
}

function getLocation(): string {
    return getLocationBase() + (BASE[0] === "#" ? getLocationPathname() : "");
}

const parenthesesRegex: RegExp = /[\\\/]+/g;

export function base(value?: string): string {
    if (value != null) {
        if (typeof value !== "string") {
            throw new TypeError("invalid base value");
        }
        value += "/";
        value = value.replace(parenthesesRegex, "/");
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
    const LOCATION = getLocation();
    return `/${
        prepare(OptionsManager.clearHref().split(LOCATION).slice(1).join(LOCATION).split(BASE).slice(1).join(BASE))
    }`.replace(parenthesesRegex, "/");
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
    return (full ? getLocation() : "") +
        (BASE + "/" + href).replace(parenthesesRegex, "/")
    ;
}