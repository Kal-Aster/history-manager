import './tslib.es6-4eedd806.js';
import './index-c2fda29c.js';
import { p as prepare } from './PathGenerator-70ab30e9.js';
import './index-d109065d.js';
import { c as clearHref } from './OptionsManager-bbe4ea74.js';

var BASE = window.location.href.split("#")[0] + "#";
function base(value) {
    if (value != null) {
        BASE = value;
    }
    return BASE;
}
function get() {
    return prepare(clearHref().split(BASE).slice(1).join(BASE));
}
function construct(href) {
    switch (href[0]) {
        case "?": {
            href = get().split("?")[0] + href;
            break;
        }
        case "#": {
            href = get().split("#")[0] + href;
            break;
        }
    }
    return BASE + href;
}

export { base, construct, get };
