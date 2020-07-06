const rollup = require('rollup');
const resolve = require("resolve");
const path = require("path");

exports.default = function externalizer(options) {
    options = {
        full: true,
        ...options
    };
    let importedNodeModules = Object.create(null);
    let toImportNodeModules = Object.create(null);
    let getModuleIdFromResolved = resolved => {
        let result;
        if (Object.entries(importedNodeModules).some(([id, r]) => {
                if (r === resolved) {
                    result = id;
                    return true;
                }
                return false;
            })) {
            return result;
        }
        if (Object.entries(toImportNodeModules).some(([id, r]) => {
                if (r === resolved) {
                    result = id;
                    return true;
                }
                return false;
            })) {
            return result;
        }
        return null;
    };
    let commonjsHelpers = null;
    let name = "externalizer";
    let outputdir;
    let isLib = false;
    let libDir;
    let rollupInputOptions;
    let rollupOutputOptions;
    let self = {
        name,
        options(options) {
            rollupInputOptions = options;
        },
        async resolveId(id, source) {
            if (source == null || id.endsWith("?commonjs-proxy") || id.endsWith("?commonjs-external")) {
                return null;
            }
            if (id.substr(1) === "commonjsHelpers.js") {
                return null;
                if (commonjsHelpers != null) {
                    id = "../" + commonjsHelpers;
                    // from second loop of lib it passes wrong commonjsHelpers (not relative to the current file)
                    // if (isLib) {
                    //     console.log(this.getModuleInfo(source), path.resolve(libDir, commonjsHelpers));
                    // }
                    return {
                        id,
                        external: true
                    };
                }
                return null;
            }
            let match = id.match(/^(.+)\.riot(\?.*)?/);
            if (match != null) {
                id = match[1] + (match[2] || "");
            }
            if (!(/(.[.]?[\\\/])/).test(id)) {
                let resolved = options.full ? resolve.sync(id) : null;
                if (resolved && path.isAbsolute(resolved)) {
                    if (toImportNodeModules[id] == null) {
                        toImportNodeModules[id + "/index"] = resolved;
                    }
                    if (isLib) {
                        id = path.relative(path.dirname(getModuleIdFromResolved(source)), id).replace(/\\/g, "/");
                    } else {
                        let base = ".";
                        Object.entries(rollupInputOptions.input).some(([input_id, input_src]) => {
                            if (path.resolve(input_src) !== path.resolve(source)) {
                                return false;
                            }
                            base = "./" + path.join(path.dirname(path.relative(path.dirname(input_id), id)), "lib").replace(/\\/g, "/");
                            return true;
                        });
                        id = base + "/" + id;
                    }
                    id += "/index";
                }
                // console.log(" \"" +  id + "\" is external relative to \"" + source + "\"");
            } else if (isLib) {
                let resolved = await this.resolve(source);
                if (resolved && !resolved.external) {
                    // console.log(path.resolve(path.dirname(source), id));
                    let parent = getModuleIdFromResolved(source);
                    if (parent != null) {
                        toImportNodeModules[path.join(path.dirname(parent), id)] = path.join(path.dirname(source), id);
                    } else {
                        console.log("should load local \"" + id + "\" relative to \"" + source + "\"");
                    }
                }
            }
            return {
                id,
                external: true
            };
        },
        outputPlugin: {
            name,
            generateBundle(options) {
                rollupOutputOptions = options;
            },
            async writeBundle(options, bundle) {
                if (bundle == null) {
                    bundle = options;
                    options = undefined;
                }
                options = options || rollupOutputOptions;
                Object.entries(bundle).some(([filename, info]) => {
                    if (Object.keys(info.modules).some(m => {
                            return m.substr(1) === "commonjsHelpers.js";
                        })) {
                        commonjsHelpers = filename;
                        return true;
                    }
                    return false;
                });
                if (Object.keys(toImportNodeModules).length === 0) {
                    return;
                }
                isLib = true;
                if (libDir == null) {
                    libDir = path.join(outputdir == null ? (outputdir = options.dir) : outputdir, "lib");
                }
                let input = toImportNodeModules; // {};
                // toImportNodeModules.forEach(module => {
                //     let resolved = resolve.sync(module);
                //     if (resolved == null) {
                //         return;
                //     }
                //     input[module + "/index"] = resolved;
                // });
                // toImportNodeModules = [];
                importedNodeModules = {
                    ...importedNodeModules,
                    ...toImportNodeModules
                };
                toImportNodeModules = Object.create(null);
                // console.log(input);
                await rollup.rollup({
                        input,
                        plugins: rollupInputOptions.plugins
                    })
                    .then(bundle => {

                        // console.log(bundle.watchFiles); // an array of file names this bundle depends on
                        return bundle.write({
                            dir: libDir,
                            format: "amd",
                            plugins: options.plugins
                        });
                    })
            }
        }
    };
    return self;
}