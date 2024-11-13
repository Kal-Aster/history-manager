import LockManager from "./LockManager";

type LockManagerWrapper = {
    lockManager: LockManager;
    fire(): boolean;
    release(): Promise<void>;
    beginRelease(): Promise<void>;
};
export default LockManagerWrapper;