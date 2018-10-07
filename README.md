# immer-undo v0.1.0

Revert any number of [immer][1] patches.

[1]: https://github.com/mweststrate/immer

&nbsp;

### `revertPatch(base, patch)`

**Mutate** the given object/array by reversing the given patch.

Errors are thrown when patches are reverted in the wrong order.

```ts
import { Patch } from 'immer'
import { revertPatch } from 'immer-undo'

// Revert a single patch
let state = revertPatch(
  { a: 1 },
  {
    op: 'remove',
    path: ['b'],
    origValue: 1,
  }
)
state.b == 1 // => true

// Revert all patches using `reduceRight`
let history: Patch[] = [
  { op: 'add', path: ['a'], value: 1 },
  { op: 'replace', path: ['a'], value: 2, origValue: 1 },
]
state = history.reduceRight(revertPatch, { a: 2 })
'a' in state // => false
```

&nbsp;

### `createPatchHistory(history)`

Creates an `undo`/`redo` function pair for managing patch history.

```ts
import { createPatchHistory } from 'immer-undo'

let { history, undo, redo } = createPatchHistory()
history.push({ op: 'add', path: ['a'], value: 1 })

let state = { a: 1 }
state = undo(state)
'a' in state // => false

state = redo(state)
state.a == 1 // => true
```

**Tip:** Pass a number to `undo`/`redo` to undo/redo many patches at once.

&nbsp;

### `generateInversePatch(patch)`

Generate a new patch that's the exact opposite of the given patch.

```ts
import { generateInversePatch } from 'immer-undo'

let patch = generateInversePatch({ op: 'add', path: ['a'], value: 1 })
patch.op == 'remove'
patch.path[0] == 'a'
patch.origValue == 1
```
