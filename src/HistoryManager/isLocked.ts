import getInternalState from "./getInternalState";

export default function isLocked(): boolean {
    return getInternalState().works.some(w => w.locking);
}