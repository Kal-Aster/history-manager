const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-ts');

const {nodeResolve} = require("@rollup/plugin-node-resolve");

export default [
    {
        input: "src/index.ts",
        plugins: [
            nodeResolve(),
            typescript(),
            commonjs()
        ],
        output: [
            {
                file: "dist/index.js",
                format: "umd",
                name: "historyManager"
            },
            {
                file: "dist/index.es.js",
                format: "es"
            }
        ]
    }
];