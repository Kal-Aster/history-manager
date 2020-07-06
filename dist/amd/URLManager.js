define(['exports', './PathGenerator', './OptionsManager'], function (exports, PathGenerator, OptionsManager) { 'use strict';

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

    Object.defineProperty(exports, '__esModule', { value: true });

});
