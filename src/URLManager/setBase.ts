import getInternalState from "./getInternalState";

import { DELIMITER } from "./constants";

export default function setBase(value: string) {
    if (typeof value !== "string") {
        throw new TypeError("invalid base value");
    }

    value += "/";
    value = value.replace(DELIMITER, "/");
    if (value[0] !== "#" && value[0] !== "/") {
        value = "/" + value;
    }
    if (value[0] === "/" && !window.history.pushState) {
        value = "#" + value;
    }

    getInternalState().BASE = value;
}