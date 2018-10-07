import { applyPatch, Patch } from 'immer'

const { isArray } = Array

/**
 * **Mutate** an object/array by reverting the given patch
 *
 * You must treat the return value as the new state, in case the
 * given patch has an empty path.
 */
export function revertPatch(base: any, patch: Patch): any {
  let { path } = patch

  if (path.length == 0) {
    if (patch.op !== 'replace') {
      throw Error(
        'Invalid patch: Path cannot be empty in "add" or "remove" patches'
      )
    }
    return patch.origValue
  }

  // Find the affected object/array
  let target = base
  for (let i = 0; i < path.length - 1; i++) {
    target = target[path[i]]
    if (!target || typeof target !== 'object') {
      throw Error(
        'Cannot revert patch. Path does not resolve: ' + JSON.stringify(path)
      )
    }
  }

  // Revert the change
  let prop = path[path.length - 1]
  if (patch.op != 'add') {
    if (patch.op == 'replace') {
      if (isArray(target) && prop == 'length') {
        throw Error('Patches cannot set "length" of an array')
      }
    }

    // Revert a "remove" operation (on an array)
    else if (isArray(target)) {
      let index = Number(prop)
      if (!Number.isNaN(index)) {
        if (index == 0) {
          target.unshift(patch.origValue)
          return target
        }
        if (index == target.length) {
          target.push(patch.origValue)
          return target
        }
        if (index > 0 && index < target.length) {
          target.splice(index, 0, patch.origValue)
          return target
        }
      }
    }

    // Revert a property assignment
    if (
      patch.op == 'remove'
        ? !isArray(target) && prop in target
        : target[prop] !== patch.value
    ) {
      throw Error(
        "Cannot apply patch. Target's current value doesn't match the patch's value"
      )
    }
    target[prop] = patch.origValue
    return target
  }

  // Assert `patch.value` is the current value
  let index: number | undefined
  let value: any
  if (isArray(target)) {
    index = prop == '-' ? target.length - 1 : Number(prop)
    if (Number.isNaN(index) || index < 0 || index >= target.length) {
      index = undefined
      value = target[prop as any]
    } else {
      value = target[index]
    }
  } else {
    value = target[prop]
  }
  if (value !== patch.value) {
    throw Error(
      "Cannot revert patch. Target's current value doesn't match the patch's value"
    )
  }

  // Revert the "add" operation
  switch (index) {
    case undefined:
      delete target[prop]
      break

    case 0:
      target.shift()
      break

    case target.length - 1:
      target.pop()
      break

    default:
      target.splice(index, 1)
  }
  return target
}

/**
 * Generate the exact opposite of a given patch
 */
export function generateInversePatch(patch: Patch): any {
  let { path } = patch
  if (patch.op == 'add') return { op: 'remove', path, origValue: patch.value }
  if (patch.op == 'remove') return { op: 'add', path, value: patch.origValue }
  return {
    op: 'replace',
    path,
    value: patch.origValue,
    origValue: patch.value,
  }
}

/**
 * Create an undo/redo function pair that manages a patch history
 * and **mutates** any object/array you pass in.
 *
 * To add patches later, just call `history.push` like normal.
 */
export function createPatchHistory(history: Patch[] = []) {
  let undone: Patch[] = []
  return {
    /** Array of reverted patches, from oldest to newest */
    undone,
    /** Array of applied patches, from oldest to newest */
    history,
    /** Revert the newest patch in `history` (if one exists) */
    undo(base: any, n: number = 1) {
      let patch: Patch | undefined
      while (--n >= 0 && (patch = history.pop())) {
        undone.push(patch)
        base = revertPatch(base, patch)
      }
      return base
    },
    /** Apply the newest patch in `undone` (if one exists) */
    redo(base: any, n: number = 1) {
      let patch: Patch | undefined
      while (--n >= 0 && (patch = undone.pop())) {
        history.push(patch)
        base = applyPatch(base, patch)
      }
      return base
    },
  }
}
