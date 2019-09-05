/// <reference types="node" />
import childProcess = require('child_process');
import { DepGraph } from 'dependency-graph';
declare type Dict<T> = {
    [key: string]: T;
};
/**
 * Get all of the lerna package paths.
 */
export declare function getLernaPaths(basePath?: string): string[];
/**
 * Get all of the core package paths.
 */
export declare function getCorePaths(): string[];
/**
 * Write a package.json if necessary.
 *
 * @param data - The package data.
 *
 * @oaram pkgJsonPath - The path to the package.json file.
 *
 * @returns Whether the file has changed.
 */
export declare function writePackageData(pkgJsonPath: string, data: any): boolean;
/**
 * Read a json file.
 */
export declare function readJSONFile(filePath: string): any;
/**
 * Write a json file.
 */
export declare function writeJSONFile(filePath: string, data: any): boolean;
/**
 *
 * Call a command, checking its status.
 */
export declare function checkStatus(cmd: string): number;
/**
 * Get the current version of JupyterLab
 */
export declare function getPythonVersion(): string;
/**
 * Get the current version of a package
 */
export declare function getJSVersion(pkg: string): any;
/**
 * Pre-bump.
 */
export declare function prebump(): void;
/**
 * Post-bump.
 */
export declare function postbump(): void;
/**
 * Run a command with terminal output.
 *
 * @param cmd - The command to run.
 */
export declare function run(cmd: string, options?: childProcess.ExecSyncOptions, quiet?: boolean): string;
/**
 * Get a graph that has all of the package data for the local packages and their
 * first order dependencies.
 */
export declare function getPackageGraph(): DepGraph<Dict<any>>;
/**
 * Ensure the given path uses '/' as path separator.
 */
export declare function ensureUnixPathSep(source: string): string;
export {};
