import { prepare } from './PathGenerator';
import { clearHref } from './OptionsManager';

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
