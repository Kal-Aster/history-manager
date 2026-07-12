# history-manager

A small, dependency‑light client‑side router built directly on top of the
browser **History API** (`pushState`/`popstate`). It adds the pieces a single
page application actually needs on top of raw history:

- **path routing** with named parameters (powered by `path-to-regexp`)
- **contexts** — named groups of routes with their own default and fallback paths
- **navigation locks** — trap the back button to guard unsaved work or modal flows
- **redirections**, query‑string helpers and multiple independent sub‑routers
- works both in **hash mode** (`#/path`) and in **clean‑URL mode** (`/path`, via the History API)

Navigation is fully **serialized through an internal work queue**, so `go`,
`lock`/`unlock` and `popstate` never interleave in surprising ways.

## Installation

```sh
npm install history-manager
```

The package ships two builds:

| build | file | format |
| ----- | ---- | ------ |
| ES module | `dist/index.es.js` | `es` |
| UMD (browser global `historyManager`) | `dist/index.js` | `umd` |

```js
// ES module
import { Router } from "history-manager";
```

```html
<!-- UMD: exposes window.historyManager -->
<script src="history-manager/dist/index.js"></script>
<script>
    const { Router } = window.historyManager;
</script>
```

## Quick start

```js
import { Router } from "history-manager";

// 1. declare routes: a path pattern -> a callback
Router.route("/user/:id", (location, keymap) => {
    console.log("user page", keymap.get("id"), location.href);
});
Router.route("/me", location => {
    console.log("my profile");
});

// 2. (optional) group routes into a context
Router.setContext({
    name: "profile",
    paths: [
        { path: "me" },
        { path: "user/:id", fallback: true } // used when the context can't be resolved
    ],
    default: "me" // where the context lands by default
});

// 3. start the router (registers the popstate listener and emits the current route)
await Router.start("profile");

// 4. navigate
await Router.go("/user/12");   // push a new url
await Router.go(-1);           // go back one entry, like history.back()
```

By default urls are hash‑based (`https://app/#/user/12`). To use clean urls via
the History API, set the base to `/` before starting:

```js
Router.setBase("/");
await Router.start();
// -> https://app/user/12
```

## Core concepts

### Routes

A route pairs a path pattern with a callback. Patterns use
[`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) syntax, so
`:name` segments become named parameters.

```js
Router.route("/product/:category/:id", (location, keymap, redirection) => {
    keymap.get("category"); // matched param
    keymap.get("id");
    location.getQueryParam("ref"); // read the query string
});
```

The callback receives:

| argument | type | description |
| -------- | ---- | ----------- |
| `location` | `Location` | the resolved location (see below) |
| `keymap` | `Map<string, any>` | matched path parameters |
| `redirection` | `{ location, keymap } \| null` | set when the route was reached through a redirection |

Remove a route with `Router.unroute(path)`.

### The `Location` object

Every callback (and `Router.getLocation()`) gives you a `Location`:

```ts
type Location = {
    href: string;
    pathname: string;
    hash: string;
    query: string;
    parsedQuery: any;

    hasQueryParam(param: string): boolean;
    getQueryParam(param: string): string | null | undefined;
    addQueryParam(param: string, value: string | null): void;
    removeQueryParam(param: string): void;

    hrefIf(go: string): string; // resolve a relative navigation without performing it
};
```

### Contexts

A **context** is a named set of paths with a default landing url and optional
fallbacks. Contexts let you preserve "where the user was" across sections of the
app (e.g. keep the current profile when jumping between tabs) and recover
gracefully when a url can't be matched.

```js
Router.setContext({
    name: "search",
    paths: [{ path: "search" }],
    default: "search?recent"
});

Router.getContext();                 // context of the current url
Router.restoreContext("search");     // navigate back to a context's last/known url
Router.getContextDefaultOf("search");// "search?recent"
```

You can also build contexts incrementally:

```js
Router.addContextPath("profile", "user/:id", /* isFallback */ true);
Router.setContextDefaultHref("profile", "me");
```

### Navigation locks

A lock traps the back button. This is useful to protect a form with unsaved
changes or to keep a modal/flow open until it is explicitly dismissed.

```js
const lock = await Router.lock();

Router.isLocked(); // true
```

By default a lock is **hard**: back navigation is trapped and a non‑forced
`unlock()` is refused. Only a forced unlock releases it.

```js
await Router.unlock();       // force = true (default) -> always releases
await Router.unlock(false);  // cooperative -> refused by a hard lock, returns false
```

To make a lock **cooperative**, attach a listener. When a release is attempted
(a non‑forced `unlock`, or the trapped back button), the listener receives a
`cancelable` `"navigation"` event. **Call `event.preventDefault()` to approve
the release**; do nothing to keep the lock held.

```js
lock.listen(event => {
    if (userConfirmedLeaving()) {
        event.preventDefault(); // approve: allow the release / navigation
    }
    // otherwise the lock stays active
});

// You can also release through the returned manager:
lock.unlock();
```

> Note the inverted convention: on the lock's `"navigation"` event
> `preventDefault()` means *approve*, not *veto*.

Locks are **stacked LIFO**: locking three times requires three unlocks to fully
release, and a balanced lock/unlock sequence always lands back on the original
url.

### Redirections

```js
Router.redirect("/old-page", "/new-page");
Router.unredirect("/old-page");
```

### Query parameters

```js
await Router.setQueryParam("tab", "settings", { emit: true });
await Router.setQueryParam("tab", undefined, { emit: true }); // remove it
```

### Sub‑routers

`Router` is the main instance. Create additional independent routers with the
same routing API when you need isolated route tables (e.g. per‑widget):

```js
const widgetRouter = Router.create();
widgetRouter.route("/panel/:name", location => { /* ... */ });
```

## API reference (`Router`)

| method | description |
| ------ | ----------- |
| `route(path, cb)` / `unroute(path)` | register / remove a route |
| `redirect(path, to)` / `unredirect(path)` | register / remove a redirection |
| `setContext({ name, paths, default })` | declare a context |
| `addContextPath(context, href, isFallback?)` | add a path to a context |
| `setContextDefaultHref(context, href)` | set a context's default url |
| `getContext(href?)` / `getContextDefaultOf(context)` | inspect contexts |
| `restoreContext(context)` | navigate to a context |
| `start(startingContext?)` | register listeners and emit the current route |
| `go(direction, { emit?, replace? })` | navigate to a url (`string`) or by delta (`number`) |
| `setQueryParam(param, value, { emit, replace? })` | add/remove a query param and navigate |
| `getLocation()` / `getLocationAt(index)` / `index()` | inspect the current / historic location |
| `emit(emitOnlyMain?)` | re‑run the matching route callbacks for the current url |
| `lock()` / `unlock(force = true)` / `isLocked()` | navigation locks |
| `getBase()` / `setBase(base)` | read / set the url base (`"/"` for clean urls) |
| `create()` | create an independent sub‑router |

The package also exports the lower‑level building blocks the `Router` is built
on: `HistoryManager`, `NavigationLock`, `ContextManager`, `OptionsManager`,
`PathGenerator` and `URLManager`.

## Events

The router dispatches a couple of `window` events you can hook into:

- **`historylanded`** — fired after a navigation has fully settled (used, for
  example, to await a `history.back()` completing).
- **`router:going`** — a `cancelable` `CustomEvent` fired before a navigation;
  call `preventDefault()` to abort it.

## Development

```sh
npm run build        # bundle with rollup into dist/
npm test             # run the Playwright + Mocha suite on chromium, firefox and webkit
npm run test:manual  # serve the manual test page for interactive checking
```

Tests drive a real browser through Playwright against an Express dev server, so
the full History API behaviour (including `popstate` and the back‑button traps)
is exercised end to end.

## License

[MIT](./LICENSE) © Giuliano Collacchioni
