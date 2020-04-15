const typescript = require("typescript");
const rimraf = require("rimraf");
const path = require("path");
const fs = require("fs");

let compilerOptions = {
    target: typescript.ScriptTarget.ES5,
    module: typescript.ModuleKind.UMD,
    lib: ["dom", "es2015"],
    removeComments: true,
    strict: true
};

const tsconfigPath = "./tsconfig.json";
if (fs.existsSync(tsconfigPath)) {
    const {
        config,
        error
    } = typescript.readConfigFile(tsconfigPath, path => fs.readFileSync(path, "utf-8"))
    if (error) throw error;

    const parsedOptions = typescript.parseJsonConfigFileContent(config, typescript.sys, path.dirname(tsconfigPath));
    if (!parsedOptions.errors.length) {
        compilerOptions = parsedOptions.options;
    }
}

let dist = path.join("dist");
if (fs.existsSync(dist)) {
    rimraf.sync(dist);
}
let libPath = path.join(dist, "test", "scripts", "lib");
{
    let current = null;
    libPath.split(path.sep).forEach(dir => {
        dir = current != null ? path.join(current, dir) : dir;
        fs.mkdirSync(dir);
        current = dir;
    });
}
fs.copyFileSync(path.join("node_modules", "requirejs", "require.js"), path.join(libPath, "require.js"));

let src = path.join("src");

(function walkDir(dir, onFile, onDir, skipDirs) {
    skipDirs = skipDirs || [];
    let dirs = Array.from(fs.readdirSync(dir));
    dirs.forEach(f => {
        let filepath = path.join(dir, f);
        let isDirectory = fs.statSync(filepath).isDirectory();
        if (isDirectory) {
            if (!skipDirs.some(function (dir) {
                    return dir === filepath;
            })) {
                onDir.call(null, filepath);
                walkDir(filepath, onFile, onDir, skipDirs);
            } else {
                console.log("Skipped dir", filepath);
            }
        } else {
            onFile.call(null, filepath);
        }
    });
})(src, function (filepath) {
    let parsed = path.parse(filepath);
    let dir = path.join(dist, path.relative(src, parsed.dir));
    switch (parsed.ext) {
        case ".ts": {
            if (!parsed.name.endsWith(".d")) {
                let stream = fs.createWriteStream(path.join(dir, parsed.name + ".js"), "utf-8");
                stream.write(typescript.transpileModule(fs.readFileSync(filepath, "utf-8"), {
                    compilerOptions
                }).outputText);
                stream.close();
            }
            break;
        }
        default: {
            fs.copyFileSync(filepath, path.join(dir, parsed.base));
        }
    }
}, function (dirpath) {
    dir = path.join(dist, path.relative(src, dirpath));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});