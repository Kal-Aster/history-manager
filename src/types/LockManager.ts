type LockManager = {
    readonly id: number,
    listen(listener: (event: Event) => void): void;
    unlisten(listener: (event: Event) => void): void;
    unlock(): void;
};
export default LockManager;