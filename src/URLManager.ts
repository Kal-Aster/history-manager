/**
 * @author Giuliano Collacchioni @2020
 */

import OptionsManager = require("./OptionsManager");
import PathGenerator = require("./PathGenerator");

let BASE: string = window.location.href.split("#")[0] + "#";

export function base(value?: string): string {
    if (value != null) {
        BASE = value;
    }
    return BASE;
}
export function get(): string {
    return PathGenerator.prepare(OptionsManager.clearHref().split(BASE).slice(1).join(BASE));
}
export function construct(href: string): string {
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
    return BASE + href;
}