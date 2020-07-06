const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const multiInput = require("rollup-plugin-multi-input").default;
const externalizer = require("./externalizer").default;
const nodeResolve = require("@rollup/plugin-node-resolve").default;

let externalizerFull = externalizer();
let externalizerLib = externalizer({ full: false });
let externalizerLibCJS = externalizer({ full: false });
let externalizerLibES = externalizer({ full: false });

export default [
    {
        input: ["src/**/!(*.d.ts)"],
        plugins: [
            multiInput(),
            externalizerFull,
            commonjs(),
            typescript()
        ],
        output: {
            dir: "dist/amd.full",
            format: "amd",
            plugins: [externalizerFull.outputPlugin]
        }
    },
    {
        input: ["src/**/!(*.d.ts)"],
        plugins: [
            multiInput(),
            externalizerLib,
            commonjs(),
            typescript()
        ],
        output: {
            dir: "dist/amd",
            format: "amd",
            plugins: [externalizerLib.outputPlugin]
        }
    },
    {
        input: ["src/**/!(*.d.ts)"],
        plugins: [
            multiInput(),
            externalizerLibCJS,
            commonjs(),
            typescript()
        ],
        output: {
            dir: "dist/cjs",
            format: "cjs",
            plugins: [externalizerLibCJS.outputPlugin]
        }
    },
    {
        input: ["src/**/!(*.d.ts)"],
        plugins: [
            multiInput(),
            externalizerLibES,
            commonjs(),
            typescript()
        ],
        output: {
            dir: "dist/es",
            format: "es",
            plugins: [externalizerLibES.outputPlugin]
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
            file: "dist/amd.bundled.js",
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
            file: "dist/umd.bundled.js",
            format: "umd"
        }
    }
];