Object.defineProperty(exports, "__esModule", { value: true });
var immer_1 = require("immer");
var isArray = Array.isArray;
/**
 * **Mutate** an object/array by reverting the given patch
 *
 * You must treat the return value as the new state, in case the
 * given patch has an empty path.
 */
function revertPatch(base, patch) {
    var path = patch.path;
    if (path.length == 0) {
        if (patch.op !== 'replace') {
            throw Error('Invalid patch: Path cannot be empty in "add" or "remove" patches');
        }
        return patch.origValue;
    }
    // Find the affected object/array
    var target = base;
    for (var i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
        if (!target || typeof target !== 'object') {
            throw Error('Cannot revert patch. Path does not resolve: ' + JSON.stringify(path));
        }
    }
    // Revert the change
    var prop = path[path.length - 1];
    if (patch.op != 'add') {
        if (patch.op == 'replace') {
            if (isArray(target) && prop == 'length') {
                throw Error('Patches cannot set "length" of an array');
            }
        }
        // Revert a "remove" operation (on an array)
        else if (isArray(target)) {
            var index_1 = Number(prop);
            if (!Number.isNaN(index_1)) {
                if (index_1 == 0) {
                    target.unshift(patch.origValue);
                    return target;
                }
                if (index_1 == target.length) {
                    target.push(patch.origValue);
                    return target;
                }
                if (index_1 > 0 && index_1 < target.length) {
                    target.splice(index_1, 0, patch.origValue);
                    return target;
                }
            }
        }
        // Revert a property assignment
        if (patch.op == 'remove'
            ? !isArray(target) && prop in target
            : target[prop] !== patch.value) {
            throw Error("Cannot apply patch. Target's current value doesn't match the patch's value");
        }
        target[prop] = patch.origValue;
        return target;
    }
    // Assert `patch.value` is the current value
    var index;
    var value;
    if (isArray(target)) {
        index = prop == '-' ? target.length - 1 : Number(prop);
        if (Number.isNaN(index) || index < 0 || index >= target.length) {
            index = undefined;
            value = target[prop];
        }
        else {
            value = target[index];
        }
    }
    else {
        value = target[prop];
    }
    if (value !== patch.value) {
        throw Error("Cannot revert patch. Target's current value doesn't match the patch's value");
    }
    // Revert the "add" operation
    switch (index) {
        case undefined:
            delete target[prop];
            break;
        case 0:
            target.shift();
            break;
        case target.length - 1:
            target.pop();
            break;
        default:
            target.splice(index, 1);
    }
    return target;
}
exports.revertPatch = revertPatch;
/**
 * Generate the exact opposite of a given patch
 */
function generateInversePatch(patch) {
    var path = patch.path;
    if (patch.op == 'add')
        return { op: 'remove', path: path, origValue: patch.value };
    if (patch.op == 'remove')
        return { op: 'add', path: path, value: patch.origValue };
    return {
        op: 'replace',
        path: path,
        value: patch.origValue,
        origValue: patch.value,
    };
}
exports.generateInversePatch = generateInversePatch;
/**
 * Create an undo/redo function pair that manages a patch history
 * and **mutates** any object/array you pass in.
 *
 * To add patches later, just call `history.push` like normal.
 */
function createPatchHistory(history) {
    if (history === void 0) { history = []; }
    var undone = [];
    return {
        /** Array of reverted patches, from oldest to newest */
        undone: undone,
        /** Array of applied patches, from oldest to newest */
        history: history,
        /** Revert the newest patch in `history` (if one exists) */
        undo: function (base, n) {
            if (n === void 0) { n = 1; }
            var patch;
            while (--n >= 0 && (patch = history.pop())) {
                undone.push(patch);
                base = revertPatch(base, patch);
            }
            return base;
        },
        /** Apply the newest patch in `undone` (if one exists) */
        redo: function (base, n) {
            if (n === void 0) { n = 1; }
            var patch;
            while (--n >= 0 && (patch = undone.pop())) {
                history.push(patch);
                base = immer_1.applyPatch(base, patch);
            }
            return base;
        },
    };
}
exports.createPatchHistory = createPatchHistory;
