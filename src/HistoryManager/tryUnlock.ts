import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

export default function tryUnlock(
    { works }: InternalHistoryManagerState
) {
    let locksAsked: number = 0;
    for (let i: number = works.length - 1; i >= 0; i--) {
        const work = works[i];
        if (!work.locking || work.finishing) {
            continue;
        }
        if (!work.askFinish()) {
            throw new Error("Unlock rejected");
        }
        locksAsked++;
    }
    return locksAsked;
}