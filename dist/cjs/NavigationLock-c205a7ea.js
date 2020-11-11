'use strict';

var tslib_es6 = require('./tslib.es6-088f17e5.js');
var OptionsManager = require('./OptionsManager-c87b8948.js');
var HistoryManager = require('./HistoryManager-35b063fe.js');

var locks = [];
var catchPopState = null;
window.addEventListener("popstate", function (event) {
    if (catchPopState == null) {
        return handlePopState();
    }
    event.stopImmediatePropagation();
    catchPopState();
}, true);
function onCatchPopState(onCatchPopState, once) {
    if (once === void 0) { once = false; }
    if (once) {
        var tmpOnCatchPopState_1 = onCatchPopState;
        onCatchPopState = function () {
            catchPopState = null;
            tmpOnCatchPopState_1();
        };
    }
    catchPopState = onCatchPopState;
}
function lock() {
    var delegate = new EventTarget();
    var id = Date.now();
    var historyLock;
    var promiseResolve;
    var promise = new Promise(function (resolve) {
        promiseResolve = resolve;
    });
    HistoryManager.onWorkFinished(function () {
        historyLock = HistoryManager.acquire();
        var lock = {
            lock: {
                get id() {
                    return id;
                },
                listen: function (listener) {
                    delegate.addEventListener("navigation", listener);
                },
                unlisten: function (listener) {
                    delegate.removeEventListener("navigation", listener);
                },
                unlock: function () {
                    if (!locks.length || historyLock.finishing) {
                        return;
                    }
                    promise.then(function () {
                        if (locks[locks.length - 1].lock.id === id) {
                            unlock();
                        }
                        else {
                            locks.some(function (lock, index) {
                                if (lock.lock.id === id) {
                                    locks.splice(index, 1)[0].release();
                                }
                                return false;
                            });
                        }
                    });
                }
            },
            fire: function () {
                var e = new Event("navigation", { cancelable: true });
                delegate.dispatchEvent(e);
                return e.defaultPrevented;
            },
            release: function () {
                historyLock.finish();
            },
            beginRelease: function (start_fn) {
                historyLock.beginFinish();
                promise.then(function () {
                    start_fn();
                });
            }
        };
        historyLock.askFinish = function () {
            if (!lock.fire()) {
                return false;
            }
            lock.lock.unlock();
            return true;
        };
        locks.push(lock);
        OptionsManager.goWith(OptionsManager.clearHref(), tslib_es6.__assign(tslib_es6.__assign({}, OptionsManager.get()), { locked: lock.lock.id })).then(function () {
            promiseResolve(lock.lock);
        });
    });
    return promise;
}
function unlock(force) {
    if (force === void 0) { force = true; }
    var wrapper = locks.splice(locks.length - 1, 1)[0];
    if (wrapper == null) {
        return true;
    }
    if (!force && !wrapper.fire()) {
        return false;
    }
    wrapper.beginRelease(function () {
        onCatchPopState(function () {
            wrapper.release();
        }, true);
        window.history.go(-1);
    });
    return true;
}
function locked() {
    return locks.length > 0;
}
var shouldUnlock = false;
function handlePopState() {
    if (locks.length === 0) {
        return;
    }
    var lockId = parseInt(OptionsManager.get().locked, 10);
    if (isNaN(lockId)) {
        shouldUnlock = true;
        window.history.go(1);
    }
    else {
        var lock_1 = locks[locks.length - 1];
        if (lockId === lock_1.lock.id) {
            if (shouldUnlock && lock_1.fire()) {
                unlock();
            }
            shouldUnlock = false;
            return;
        }
        else if (lockId > lock_1.lock.id) {
            window.history.go(-1);
        }
        else {
            shouldUnlock = true;
            window.history.go(1);
        }
    }
}

var NavigationLock = /*#__PURE__*/Object.freeze({
    __proto__: null,
    lock: lock,
    unlock: unlock,
    locked: locked
});

exports.NavigationLock = NavigationLock;
exports.lock = lock;
exports.locked = locked;
exports.unlock = unlock;
