define(['exports', './tslib.es6-ee56af75', './OptionsManager-1b0e876e', './ContextManager-be867ae1'], function (exports, tslib_es6, OptionsManager, ContextManager) { 'use strict';

    var started = false;
    var works = [];
    var onworkfinished = [];
    function onWorkFinished(callback, context) {
        if (works.length === 0) {
            callback.call(context || null);
            return;
        }
        onworkfinished.push([callback, context || null]);
    }
    function createWork(locking) {
        if (locking === void 0) { locking = false; }
        var finished = false;
        var finishing = false;
        var work = {
            get locking() {
                return locking;
            },
            get finished() {
                return finished;
            },
            get finishing() {
                return finishing;
            },
            finish: function () {
                if (finished) {
                    return;
                }
                finished = true;
                finishing = false;
                var i = works.length - 1;
                for (; i >= 0; i--) {
                    if (works[i] === work) {
                        works.splice(i, 1);
                        break;
                    }
                }
                if (i >= 0 && works.length === 0) {
                    while (onworkfinished.length > 0 && works.length === 0) {
                        var _a = tslib_es6.__read(onworkfinished.shift(), 2), callback = _a[0], context = _a[1];
                        callback.call(context || window);
                    }
                }
            },
            beginFinish: function () {
                finishing = true;
            },
            askFinish: function () {
                return false;
            }
        };
        works.push(work);
        return work;
    }
    function acquire() {
        var lock = createWork(true);
        return lock;
    }
    function isLocked() {
        return works.some(function (w) { return w.locking; });
    }
    var catchPopState = null;
    window.addEventListener("popstate", function (event) {
        if (!started || isLocked()) {
            return;
        }
        if (catchPopState == null) {
            handlePopState();
            return;
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
    function goTo(href, replace) {
        if (replace === void 0) { replace = false; }
        href = ContextManager.construct(href);
        if (window.location.href === href) {
            window.dispatchEvent(new Event("popstate"));
            return;
        }
        if (replace) {
            window.location.replace(href);
        }
        else {
            window.location.assign(href);
        }
    }
    function addFront(frontHref) {
        if (frontHref === void 0) { frontHref = "next"; }
        var href = ContextManager.get();
        var work = createWork();
        return new Promise(function (resolve) {
            OptionsManager.goWith(ContextManager.construct(frontHref), { back: undefined, front: null })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState(resolve, true);
                window.history.go(-1);
            }); })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState(resolve, true);
                goTo(href, true);
            }); })
                .then(function () {
                work.finish();
                resolve();
            });
        });
    }
    function addBack(backHref) {
        if (backHref === void 0) { backHref = ""; }
        var href = ContextManager.get();
        var work = createWork();
        return new Promise(function (resolve) {
            (new Promise(function (resolve) {
                onCatchPopState(resolve, true);
                window.history.go(-1);
            }))
                .then(function () { return new Promise(function (resolve) {
                if (backHref) {
                    onCatchPopState(resolve, true);
                    goTo(backHref, true);
                }
                else {
                    resolve();
                }
            }); })
                .then(function () { return OptionsManager.set({ back: null, front: undefined }); })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState(resolve, true);
                goTo(href);
            }); })
                .then(function () {
                work.finish();
                resolve();
            });
        });
    }
    var hasBack = false;
    var contextManager = new ContextManager.ContextManager();
    function index() {
        return contextManager.index();
    }
    function getHREFAt(index) {
        return contextManager.get(index);
    }
    function setContext(context) {
        return contextManager.setContext(context);
    }
    function addContextPath(context, href, isFallback) {
        if (isFallback === void 0) { isFallback = false; }
        return contextManager.addContextPath(context, href, isFallback);
    }
    function setContextDefaultHref(context, href) {
        return contextManager.setContextDefaultHref(context, href);
    }
    function getContext(href) {
        if (href === void 0) { href = null; }
        if (href == null) {
            return contextManager.currentContext();
        }
        return contextManager.contextOf(href);
    }
    function getHREFs() {
        return contextManager.hrefs();
    }
    function tryUnlock() {
        var locksAsked = 0;
        for (var i = works.length - 1; i >= 0; i--) {
            var work = works[i];
            if (work.locking && !work.finishing) {
                if (!work.askFinish()) {
                    return -1;
                }
                locksAsked++;
            }
        }
        return locksAsked;
    }
    var workToRelease = null;
    function restore(context) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (_, reject) { reject(); });
        }
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        onWorkFinished(function () {
            var previousIndex = contextManager.index();
            if (contextManager.restore(context)) {
                var replace_1 = previousIndex >= contextManager.index();
                workToRelease = createWork();
                onWorkFinished(promiseResolve);
                var href_1 = contextManager.get();
                var hadBack_1 = hasBack;
                (new Promise(function (resolve) {
                    if (!replace_1 && !hasBack) {
                        onCatchPopState(resolve, true);
                        goTo(href_1);
                    }
                    else {
                        resolve();
                    }
                }))
                    .then(function () { return new Promise(function (resolve) {
                    var index = contextManager.index() - 1;
                    if (replace_1 && !hasBack) {
                        resolve();
                    }
                    else {
                        addBack(contextManager.get(index))
                            .then(function () {
                            hasBack = true;
                            resolve();
                        });
                    }
                }); })
                    .then(function () { return new Promise(function (resolve) {
                    if (hadBack_1 || replace_1) {
                        onCatchPopState(resolve, true);
                        goTo(href_1, true);
                    }
                    else {
                        resolve();
                    }
                }); })
                    .then(onlanded);
            }
            else {
                promiseResolve();
            }
        });
        return promise;
    }
    function assign(href) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (_, reject) { reject(); });
        }
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        onWorkFinished(function () {
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            goTo(href);
        });
        return promise;
    }
    var replacing = false;
    function replace(href) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (_, reject) { reject(); });
        }
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        onWorkFinished(function () {
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            goTo(href, replacing = true);
        });
        return promise;
    }
    function go(direction) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (resolve, reject) {
                reject();
            });
        }
        if (direction === 0) {
            throw new Error("direction must be different than 0");
        }
        direction = parseInt(direction, 10) + locksFinished;
        if (isNaN(direction)) {
            throw new Error("direction must be a number");
        }
        if (direction === 0) {
            return Promise.resolve();
        }
        var promiseResolve;
        var promise = new Promise(function (resolve, reject) { promiseResolve = resolve; });
        onWorkFinished(function () {
            var index = contextManager.index() + direction;
            if (index < 0 || index >= contextManager.length()) {
                return onlanded();
            }
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            if (direction > 0) {
                contextManager.index(index - 1);
                window.history.go(1);
            }
            else {
                contextManager.index(index + 1);
                window.history.go(-1);
            }
        });
        return promise;
    }
    function start(fallbackContext) {
        if (fallbackContext === void 0) { fallbackContext = contextManager.getContextNames()[0]; }
        var href = ContextManager.get();
        var context = contextManager.contextOf(href, false);
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        if (context == null) {
            if (!fallbackContext) {
                throw new Error("must define a fallback context");
            }
            var defaultHREF = contextManager.getDefaultOf(fallbackContext);
            if (defaultHREF == null) {
                throw new Error("must define a default href for the fallback context");
            }
            started = true;
            href = defaultHREF;
            workToRelease = createWork();
            onCatchPopState(function () { onlanded(); promiseResolve(); }, true);
            goTo(defaultHREF, true);
        }
        contextManager.insert(href);
        if (context != null) {
            started = true;
            onlanded();
            promiseResolve();
        }
        return promise;
    }
    function onlanded() {
        window.dispatchEvent(new Event("historylanded"));
        if (workToRelease != null) {
            var work = workToRelease;
            workToRelease = null;
            work.finish();
        }
    }
    function handlePopState() {
        var options = OptionsManager.get();
        if (options.locked) {
            onCatchPopState(function () {
                if (OptionsManager.get().locked) {
                    handlePopState();
                }
            }, true);
            window.history.go(-1);
            return;
        }
        if (options.front !== undefined) {
            var frontEvent = new Event("historyforward", { cancelable: true });
            window.dispatchEvent(frontEvent);
            if (frontEvent.defaultPrevented) {
                onCatchPopState(function () { return; }, true);
                window.history.go(-1);
                return;
            }
            var backHref = contextManager.get();
            var href_2 = contextManager.goForward();
            (new Promise(function (resolve) {
                if (hasBack) {
                    onCatchPopState(resolve, true);
                    window.history.go(-1);
                }
                else {
                    resolve();
                }
            }))
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState(resolve, true);
                goTo(href_2, true);
            }); })
                .then(addBack.bind(null, backHref))
                .then(function () { return new Promise(function (resolve) {
                if (contextManager.index() < contextManager.length() - 1) {
                    onCatchPopState(resolve, true);
                    addFront(contextManager.get(contextManager.index() + 1)).then(resolve);
                }
                else {
                    resolve();
                }
            }); })
                .then(function () {
                hasBack = true;
                onlanded();
            });
        }
        else if (options.back !== undefined) {
            var backEvent = new Event("historybackward", { cancelable: true });
            window.dispatchEvent(backEvent);
            if (backEvent.defaultPrevented) {
                onCatchPopState(function () { return; }, true);
                window.history.go(+1);
                return;
            }
            var frontHref = contextManager.get();
            var href_3 = contextManager.goBackward();
            (new Promise(function (resolve) {
                if (contextManager.index() > 0) {
                    onCatchPopState(resolve, true);
                    window.history.go(1);
                }
                else {
                    resolve();
                }
            })).then(function () { return new Promise(function (resolve) {
                onCatchPopState(resolve, true);
                goTo(href_3, true);
            }); })
                .then(addFront.bind(null, frontHref))
                .then(function () {
                hasBack = contextManager.index() > 0;
                onlanded();
            });
        }
        else {
            var href_4 = ContextManager.get();
            var backHref_1 = contextManager.get();
            if (href_4 === backHref_1) {
                return onlanded();
            }
            var replaced_1 = replacing;
            replacing = false;
            var willHaveBack_1 = hasBack || !replaced_1;
            contextManager.insert(href_4, replaced_1);
            (new Promise(function (resolve) {
                if (hasBack && !replaced_1) {
                    onCatchPopState(resolve, true);
                    window.history.go(-1);
                }
                else {
                    resolve();
                }
            }))
                .then(function () {
                if (replaced_1) {
                    return Promise.resolve();
                }
                return addBack(backHref_1);
            })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState(resolve, true);
                goTo(href_4, true);
            }); })
                .then(function () {
                hasBack = willHaveBack_1;
                onlanded();
            });
        }
    }

    var HistoryManager = /*#__PURE__*/Object.freeze({
        __proto__: null,
        onWorkFinished: onWorkFinished,
        acquire: acquire,
        addFront: addFront,
        addBack: addBack,
        index: index,
        getHREFAt: getHREFAt,
        setContext: setContext,
        addContextPath: addContextPath,
        setContextDefaultHref: setContextDefaultHref,
        getContext: getContext,
        getHREFs: getHREFs,
        restore: restore,
        assign: assign,
        replace: replace,
        go: go,
        start: start
    });

    exports.HistoryManager = HistoryManager;
    exports.acquire = acquire;
    exports.addContextPath = addContextPath;
    exports.assign = assign;
    exports.getContext = getContext;
    exports.getHREFAt = getHREFAt;
    exports.go = go;
    exports.index = index;
    exports.onWorkFinished = onWorkFinished;
    exports.replace = replace;
    exports.restore = restore;
    exports.setContext = setContext;
    exports.setContextDefaultHref = setContextDefaultHref;
    exports.start = start;

});
