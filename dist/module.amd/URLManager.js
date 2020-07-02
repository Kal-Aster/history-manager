define(['exports', './tslib.es6-ee56af75', './index-b965db6c', './PathGenerator-2df3f407', './index-271cf777', './OptionsManager-0057cf14'], function (exports, tslib_es6, index$1, PathGenerator, index$2, OptionsManager) { 'use strict';

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
//# sourceMappingURL=URLManager.js.map
