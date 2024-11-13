/**
 * @author Giuliano Collacchioni @2020
 */
export type Lock = {
    readonly id: number;
    listen(listener: (event: Event) => void): void;
    unlisten(listener: (event: Event) => void): void;
    unlock(): void;
};
export declare function initEventListener(): () => void;
export declare function lock(): Promise<Lock>;
export declare function unlock(force?: boolean): boolean;
export declare function locked(): boolean;
