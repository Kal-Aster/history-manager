import './tslib.es6-4eedd806.js';
import './index-71b123e0.js';
import { p as prepare } from './PathGenerator-5ecdbddb.js';
import './index-42276b71.js';
import { c as clearHref } from './OptionsManager-fa51c5df.js';

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
