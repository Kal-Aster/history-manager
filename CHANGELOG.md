# Changelog
All notable changes to this project will be documented in this file.

## [Unreleased]
[ ] fix #3  
[ ] first defined path of context become default href, if not already specified  
[ ] add "loaded" tag to routes  
[ ] overwrite route if going to new one when the current is not loaded yet  

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