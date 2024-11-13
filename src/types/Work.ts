type Work = {
    finish(): void;
    beginFinish(): void;
    askFinish(): boolean;
    readonly finishing: boolean;
    readonly finished: boolean;
    readonly locking: boolean;
};
export default Work;