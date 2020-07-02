import resolveNode from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";

const plugins = [
    resolveNode(),
    typescript(),
    commonjs()
];

export default [
    {
        input: [
            "src/index.ts",
            "src/ContextManager.ts",
            "src/HistoryManager.ts",
            "src/NavigationLock.ts",
            "src/OptionsManager.ts",
            "src/PathGenerator.ts",
            "src/Router.ts",
            "src/URLManager.ts",
            "src/WorkManager.ts",
        ],
        output: [
            {
                dir: "dist/module.amd",
                format: "amd",
                sourcemap: true
            }
        ],
        plugins
    },
    {
        input: [
            "src/index.ts"
        ],
        output: [
            {
                file: "dist/bundle/history-manager.js",
                format: "amd",
                sourcemap: true
            }
        ],
        plugins
    }
];
