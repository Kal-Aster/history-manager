(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./OptionsManager", "./PathGenerator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var OptionsManager = require("./OptionsManager");
    var PathGenerator = require("./PathGenerator");
    var BASE = window.location.href.split("#")[0] + "#";
    function base(value) {
        if (value != null) {
            BASE = value;
        }
        return BASE;
    }
    exports.base = base;
    function get() {
        return PathGenerator.prepare(OptionsManager.clearHref().split(BASE).slice(1).join(BASE));
    }
    exports.get = get;
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
            default: {
                break;
            }
        }
        return BASE + href;
    }
    exports.construct = construct;
});
