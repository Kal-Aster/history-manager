import Work from "./Work";

type LockingWork = Work & {
    readonly locking: true;
};
export default LockingWork;