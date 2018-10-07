import { Patch } from 'immer';
/**
 * **Mutate** an object/array by reverting the given patch
 *
 * You must treat the return value as the new state, in case the
 * given patch has an empty path.
 */
export declare function revertPatch(base: any, patch: Patch): any;
/**
 * Generate the exact opposite of a given patch
 */
export declare function generateInversePatch(patch: Patch): any;
/**
 * Create an undo/redo function pair that manages a patch history
 * and **mutates** any object/array you pass in.
 *
 * To add patches later, just call `history.push` like normal.
 */
export declare function createPatchHistory(history?: Patch[]): {
    /** Array of reverted patches, from oldest to newest */
    undone: Patch[];
    /** Array of applied patches, from oldest to newest */
    history: Patch[];
    /** Revert the newest patch in `history` (if one exists) */
    undo(base: any, n?: number): any;
    /** Apply the newest patch in `undone` (if one exists) */
    redo(base: any, n?: number): any;
};
