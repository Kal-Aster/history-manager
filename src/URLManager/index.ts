/**
 * @author Giuliano Collacchioni @2020
 */

import OptionsManager from "../OptionsManager";
import PathGenerator from "../PathGenerator";

import getInternalState from "./getInternalState";
import getLocation from "./getLocation";
import setBase from "./setBase";

import { DELIMITER } from "./constants";

function base(value?: string) {
    if (value != null) {
        setBase(value);
    }

    return getInternalState().BASE;
}
function get() {
    const LOCATION = getLocation();
    const { BASE } = getInternalState();

    return `/${PathGenerator.prepare(
        OptionsManager.clearHref().split(LOCATION).slice(1).join(LOCATION).split(BASE).slice(1).join(BASE)
    )}`.replace(DELIMITER, "/");
}
function construct(href: string, full = false) {
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

    return `${(full ? getLocation() : "")}${(`${getInternalState().BASE}/${href}`).replace(DELIMITER, "/")}`;
}

const URLManager = {
    base,
    get,
    construct
};
export default URLManager;