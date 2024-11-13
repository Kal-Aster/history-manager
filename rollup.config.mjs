import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

import { nodeResolve } from "@rollup/plugin-node-resolve";

export default [
    {
        input: "src/index.ts",
        plugins: [
            nodeResolve(),
            typescript({
                declaration: true,
                declarationDir: "dist"
            }),
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