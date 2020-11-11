'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('./tslib.es6-088f17e5.js');
require('./index-6a014dd5.js');
var PathGenerator = require('./PathGenerator-6eadb801.js');
require('./index-6a756adc.js');
var OptionsManager = require('./OptionsManager-c87b8948.js');

var BASE = window.location.href.split("#")[0] + "#";
function base(value) {
    if (value != null) {
        BASE = value;
    }
    return BASE;
}
function get() {
    return PathGenerator.prepare(OptionsManager.clearHref().split(BASE).slice(1).join(BASE));
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

exports.base = base;
exports.construct = construct;
exports.get = get;
