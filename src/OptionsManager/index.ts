/**
 * @author Giuliano Collacchioni @2020
 */

import add from "./add";
import get from "./get";
import goWith from "./goWith";
import initEventListener from "./initEventListener";
import remove from "./remove";
import set from "./set";
import splitHref from "./splitHref";

const OptionsManager = {
    initEventListener,
    get,
    set,
    add,
    remove,
    goWith,
    clearHref() {
        return splitHref(window.location.href)[0];
    }
};
export default OptionsManager;