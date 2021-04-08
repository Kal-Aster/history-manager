# Changelog
All notable changes to this project will be documented in this file.

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