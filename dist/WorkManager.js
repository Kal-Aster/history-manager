var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var locks = [];
    function lock(locking_fn) {
        var released = false;
        var releasing = false;
        var onrelease = [];
        var promise;
        var lock = {
            get released() {
                return released;
            },
            get releasing() {
                return releasing;
            },
            release: function () {
                if (released) {
                    return;
                }
                released = true;
                releasing = false;
                var i = locks.length - 1;
                for (; i >= 0; i--) {
                    if (locks[i] === lock) {
                        locks.splice(i, 1);
                        break;
                    }
                }
                if (i >= 0) {
                    onrelease.forEach(function (_a) {
                        var _b = __read(_a, 2), callback = _b[0], context = _b[1];
                        callback.call(context || null);
                    });
                }
            },
            beginRelease: function (start_fn) {
                releasing = true;
                start_fn();
            },
            onrelease: function (callback, context) {
                if (context === void 0) { context = null; }
                onrelease.push([callback, context || null]);
            }
        };
        return promise = new Promise(function (resolve) {
            ondone(function () {
                var result = locking_fn.call(lock, lock);
                locks.push(lock);
                if (result !== false && result !== void 0) {
                    lock.release();
                }
                resolve(lock);
            });
        });
    }
    exports.lock = lock;
    function locked() {
        return locks.length > 0 && locks.every(function (lock) { return !lock.releasing && !lock.released; });
    }
    exports.locked = locked;
    var currentWork = -1;
    var working = 0;
    var ondoneCallbacks = [];
    function completeWork() {
        if (currentWork === -1) {
            return;
        }
        if (--working === 0) {
            currentWork = -1;
            while (ondoneCallbacks.length && currentWork === -1) {
                var _a = __read(ondoneCallbacks.shift(), 2), callback = _a[0], context = _a[1];
                callback.call(context || null);
            }
        }
    }
    function ondoneWork(fn, context, workId) {
        if (currentWork !== -1 && currentWork !== workId) {
            ondoneCallbacks.push([fn, context || null]);
            return;
        }
        fn.call(context || null);
    }
    function startWork(start_fn, id) {
        if (id === void 0) { id = Date.now(); }
        if (locked()) {
            console.error("navigation is locked");
            return -1;
        }
        var completed = false;
        ondoneWork(function () {
            currentWork = id;
            working++;
            start_fn(function () {
                if (completed) {
                    return;
                }
                completed = true;
                completeWork();
            }, id);
        }, null, id);
        return id;
    }
    exports.startWork = startWork;
    function ondone(fn, context) {
        if (working) {
            ondoneCallbacks.push([fn, context || null]);
            return;
        }
        fn.call(context || null);
    }
    exports.ondone = ondone;
});
