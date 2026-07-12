# Changelog
All notable changes to this project will be documented in this file.

## [Unreleased]
[ ] first defined path of context become default href, if not already specified  
[ ] add "loaded" tag to routes  
[ ] overwrite route if going to new one when the current is not loaded yet  

## [3.4.0] - 12/07/2026
- refactor: centralize `popstate` handling in a single `Router` orchestrator; behaviour no longer depends on listener registration order
- fix: `NavigationLock` locks can now be stacked (a second `lock()` no longer hangs waiting on a lock already held)
- fix: refusing a non-forced `unlock()` no longer corrupts the lock state (leaves the lock intact instead of orphaning it)
- fix: monotonic lock ids, avoiding same-millisecond `Date.now()` collisions that drifted navigation on release
- chore: remove dead `WorkManager` module and leftover commented-out debug
- test: cross-platform test harness (read `BROWSER` case-consistently; bind the dev server on port 5000+ instead of privileged 81)
- chore(deps): bump `mocha` to 11; override transitive `serialize-javascript` (>=7.0.7) and `diff` (>=8.0.3) to patched versions — `npm audit` clean

## [3.3.0] - 15/11/2024
- fix #3

## [3.2.0] - 15/11/2024
- complete refactor

## [3.1.0] - 13/11/2024
- fix packages update

## [3.0.0] - 12/11/2024
- update packages

## [2.2.3] - 12/11/2024
- Describe tests using Mocha and Playwright

## [2.2.2] - 2021-09-22
- fix `Router.go` type hint

## [2.2.1] - 2021-09-22
- fix `Router.go` type hint

## [2.2.0] - 2021-09-22
- emit typescript declaration

## [2.1.2] - 2021-08-03
- always have trailing backslash in routes

## [2.1.1] - 2021-08-01
- fix location pathname in `Router`

## [2.1.0] - 2021-07-23
- avoid any setup on module import

## [2.0.0] - 2021-07-23
- export function `initEventListener` avoid side effect on module import

## [1.5.2] - 2021-07-10
- fix duplicate port in `LOCATION_BASE` in `URLMananager`

## [1.5.1] - 2021-06-29
- fix `URLManager.base` and `URLManager.get`

## [1.5.0] - 2021-06-29
- implement `HistoryManager.isStarted`

## [1.4.3] - 2021-04-08
- actually fix `URLManager.get` bug

## [1.4.2] - 2021-04-08
- fix `URLManager.get` bug

## [1.4.1] - 2021-04-08
- use full location pathname in `URLManager.construct`

## [1.4.0] - 2021-04-08
- allow not "#" base, using History API

## [1.3.0] - 2021-03-11
- add possibility to avoid auto href management (can skip context definition)
- fix bug in HistoryManager::go

## [1.2.1] - 2021-01-31
- fix NavigationLock.unlock not having instant effect
- fix ts warnings
- change "dist" structure
- edit entry points in "package.json"
- add "files" in "package.json"
- update dependencies
- add "ROADMAP.md" file

## [1.2.0] - 2020-11-17
- add `HistoryManager.getContextDefaultOf`
- add `Router.getContextDefaultOf`