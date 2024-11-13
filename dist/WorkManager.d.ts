interface ILock {
    release(): void;
    beginRelease(start_fn: () => void): void;
    readonly releasing: boolean;
    readonly released: boolean;
    onrelease<T>(callback: (this: T) => void, context?: T): void;
}
export declare function lock(locking_fn: (this: ILock, lock: ILock) => boolean | void): Promise<ILock>;
export declare function locked(): boolean;
export declare function startWork(start_fn: (complete: () => void, id: number) => void, id?: number): number;
export declare function ondone<T>(fn: (this: T) => void, context?: T): void;
export {};
