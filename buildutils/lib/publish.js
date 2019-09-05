"use strict";
/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const path = __importStar(require("path"));
const update_dist_tag_1 = require("./update-dist-tag");
const utils = __importStar(require("./utils"));
// Specify the program signature.
commander_1.default
    .description('Publish the JS packages and prep the Python package')
    .option('--skip-build', 'Skip the clean and build step (if there was a network error during a JS publish')
    .action(async (options) => {
    // Make sure we are logged in.
    if (utils.checkStatus('npm whoami') !== 0) {
        console.error('Please run `npm login`');
    }
    // Optionally clean and build the python packages.
    if (!options.skipBuild) {
        // Ensure a clean state.
        utils.run('npm run clean:slate');
    }
    // Publish JS to the appropriate tag.
    const curr = utils.getPythonVersion();
    if (curr.indexOf('rc') === -1 && curr.indexOf('a') === -1) {
        utils.run('lerna publish from-package -m "Publish"');
    }
    else {
        utils.run('lerna publish from-package --npm-tag=next -m "Publish"');
    }
    // Fix up any tagging issues.
    const basePath = path.resolve('.');
    const paths = utils.getLernaPaths(basePath).sort();
    const cmds = await Promise.all(paths.map(update_dist_tag_1.handlePackage));
    cmds.forEach(cmdList => {
        cmdList.forEach(cmd => {
            utils.run(cmd);
        });
    });
    // Update core mode.  This cannot be done until the JS packages are
    // released.
    utils.run('node buildutils/lib/update-core-mode.js');
    // Make the Python release.
    utils.run('python setup.py sdist');
    utils.run('python setup.py bdist_wheel');
    utils.run('python -m pip install -U twine');
    utils.run('twine check dist/*');
    // Prompt the user to finalize.
    console.log('*'.repeat(40));
    console.log('Ready to publish!');
    console.log('Run these command when ready:');
    console.log(`git tag v${curr}`);
    console.log(`git commit -am "Publish ${curr}"`);
    console.log('twine upload dist/*');
});
commander_1.default.parse(process.argv);
//# sourceMappingURL=publish.js.map