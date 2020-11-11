const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const multiInput = require("rollup-plugin-multi-input").default;
const nodeResolve = require("@rollup/plugin-node-resolve").default;

export default [
    {
        input: ["src/**/!(*.d.ts)"],
        plugins: [
            multiInput(),
            nodeResolve(),
            commonjs(),
            typescript()
        ],
        output: {
            dir: "dist/amd",
            format: "amd"
        }
    },
    {
        input: ["src/**/!(*.d.ts)"],
        plugins: [
            multiInput(),
            nodeResolve(),
            commonjs(),
            typescript()
        ],
        output: {
            dir: "dist/cjs",
            format: "cjs"
        }
    },
    {
        input: ["src/**/!(*.d.ts)"],
        plugins: [
            multiInput(),
            nodeResolve(),
            commonjs(),
            typescript()
        ],
        output: {
            dir: "dist/es",
            format: "es"
        }
    },
    {
        input: "src/index.ts",
        plugins: [
            commonjs(),
            typescript(),
            nodeResolve()
        ],
        output: {
            file: "dist/amd.js",
            format: "amd"
        }
    },
    {
        input: "src/index.ts",
        plugins: [
            commonjs(),
            typescript(),
            nodeResolve()
        ],
        output: {
            name: "historyManager",
            file: "dist/umd.js",
            format: "umd"
        }
    }
];