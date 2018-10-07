import { applyPatch, Patch } from 'immer'
import { createPatchHistory, generateInversePatch, revertPatch } from '../index'

describe('revertPatch()', () => {
  describe('objects', () => {
    it('reverts object "add" patches', () => {
      let state = { a: 1 }
      revertPatch(state, {
        op: 'add',
        path: ['a'],
        value: 1,
      })
      expect(state).toEqual({})
    })
    it('reverts object "remove" patches', () => {
      let state = {}
      revertPatch(state, {
        op: 'remove',
        path: ['a'],
        origValue: 1,
      })
      expect(state).toEqual({ a: 1 })
    })
    it('reverts object "replace" patches', () => {
      let state = { a: 2 }
      revertPatch(state, {
        op: 'replace',
        path: ['a'],
        value: 2,
        origValue: 1,
      })
      expect(state).toEqual({ a: 1 })
    })
    it('throws if an "add" patch value is not the current value', () => {
      expect(() => {
        revertPatch(
          { a: 1 },
          {
            op: 'add',
            path: ['a'],
            value: 2, // should be 1
          }
        )
      }).toThrowErrorMatchingSnapshot()
    })
    it('throws if a "replace" patch value is not the current value', () => {
      expect(() => {
        revertPatch(
          { a: 1 },
          {
            op: 'replace',
            path: ['a'],
            value: 2, // should be 1
            origValue: 0,
          }
        )
      }).toThrowErrorMatchingSnapshot()
    })
    it('throws if a "remove" patch path is not missing', () => {
      expect(() => {
        // when `a` still exists
        revertPatch(
          { a: 1 },
          {
            op: 'remove',
            path: ['a'],
            origValue: 1,
          }
        )
      }).toThrowErrorMatchingSnapshot()
    })
  })
  describe('arrays', () => {
    it('reverts array "add" patches', () => {
      let state = [1]
      revertPatch(state, {
        op: 'add',
        path: [0],
        value: 1,
      })
      expect(state).toEqual([])
    })
    it('reverts array "remove" patches', () => {
      let state: any[] = []
      revertPatch(state, {
        op: 'remove',
        path: [0],
        origValue: 1,
      })
      expect(state).toEqual([1])
    })
    it('reverts array "replace" patches', () => {
      let state = [1]
      revertPatch(state, {
        op: 'replace',
        path: [0],
        value: 1,
        origValue: 0,
      })
      expect(state).toEqual([0])
    })
    it('reverts array "-" patches', () => {
      let state = [1, 2]
      revertPatch(state, {
        op: 'add',
        path: ['-'],
        value: 2,
      })
      expect(state).toEqual([1])
    })
    it('throws if a "replace" patch tries to set the "length" property of an array', () => {
      expect(() => {
        revertPatch([1], {
          op: 'replace',
          path: ['length'],
          value: 1,
          origValue: 3,
        })
      }).toThrowErrorMatchingSnapshot()
    })
    it('throws if an "add" patch value is not the current value', () => {
      expect(() => {
        revertPatch([1], {
          op: 'add',
          path: [0],
          value: 2, // should be 1
        })
      }).toThrowErrorMatchingSnapshot()
    })
    it('throws if a "replace" patch value is not the current value', () => {
      expect(() => {
        revertPatch([1], {
          op: 'replace',
          path: [0],
          value: 2, // should be 1
          origValue: 0,
        })
      }).toThrowErrorMatchingSnapshot()
    })
  })
  it('supports deep property paths', () => {
    let state = { a: { b: { c: 1 } }, q: [[1]] }
    revertPatch(state, {
      op: 'replace',
      path: ['a', 'b', 'c'],
      value: 1,
      origValue: 0,
    })
    expect(state.a).toEqual({
      b: { c: 0 },
    })
    revertPatch(state, {
      op: 'remove',
      path: ['q', 0, 1],
      origValue: 2,
    })
    expect(state.q).toEqual([[1, 2]])
  })
  it('works with Array.prototype.reduceRight', () => {
    let patches: Patch[] = [
      { op: 'add', path: ['a'], value: 1 },
      { op: 'replace', path: ['a'], value: 2, origValue: 1 },
    ]
    let state = { a: 2 }
    state = patches.reduceRight(revertPatch, state)
    expect(state).toEqual({})

    // Use `reduce` to re-apply the reverted patches
    state = patches.reduce(applyPatch, state)
    expect(state).toEqual({ a: 2 })
  })
  it('supports "replace" patches with an empty path', () => {
    expect(
      revertPatch(0, {
        op: 'replace',
        path: [],
        value: 0,
        origValue: 1,
      })
    ).toBe(1)
  })
  it('throws if an "add" patch has an empty path', () => {
    expect(() => {
      revertPatch([], {
        op: 'add',
        path: [],
        value: 1,
      })
    }).toThrowErrorMatchingSnapshot()
  })
  it('throws if an "remove" patch has an empty path', () => {
    expect(() => {
      revertPatch([], {
        op: 'remove',
        path: [],
        origValue: 1,
      })
    }).toThrowErrorMatchingSnapshot()
  })
  it('throws if the path cannot be resolved', () => {
    expect(() => {
      revertPatch(
        {},
        {
          op: 'add',
          path: ['a', 'b'],
          value: 1,
        }
      )
    }).toThrowErrorMatchingSnapshot()
  })
})

describe('generateInversePatch()', () => {
  it('generates "add" patches from "remove" patches', () => {
    expect(
      generateInversePatch({
        op: 'remove',
        path: ['a'],
        origValue: 1,
      })
    ).toMatchSnapshot()
  })
  it('generates "remove" patches from "add" patches', () => {
    expect(
      generateInversePatch({
        op: 'add',
        path: ['a'],
        value: 1,
      })
    ).toMatchSnapshot()
  })
  it('swaps `value` and `origValue` of "replace" patches', () => {
    expect(
      generateInversePatch({
        op: 'replace',
        path: [],
        value: 1,
        origValue: 2,
      })
    ).toMatchSnapshot()
  })
})

describe('createPatchHistory()', () => {
  it('lets you undo and redo patches', () => {
    let { undo, redo, undone } = createPatchHistory([
      { op: 'add', path: ['a'], value: 1 },
    ])

    let state = { a: 1 }
    expect(undo(state)).toBe(state)
    expect(undone.length).toBe(1)
    expect(state).toEqual({})

    expect(redo(state)).toBe(state)
    expect(undone.length).toBe(0)
    expect(state).toEqual({ a: 1 })
  })
  it('lets you add patches at any time', () => {
    let { history, undo, redo } = createPatchHistory()
    let state = { a: 1 }
    history.push({ op: 'remove', path: ['b'], origValue: 1 })
    undo(state)
    expect(state).toEqual({ a: 1, b: 1 })
    redo(state)
    expect(state).toEqual({ a: 1 })
  })
  it('lets you undo/redo many patches in one call', () => {
    let { undo, redo } = createPatchHistory([
      { op: 'add', path: ['a'], value: 1 },
      { op: 'remove', path: ['b'], origValue: 1 },
    ])
    let state = { a: 1 }
    undo(state, 2)
    expect(state).toEqual({ b: 1 })
    redo(state, 2)
    expect(state).toEqual({ a: 1 })
  })
  it('cannot undo when the history is empty', () => {
    let { undo } = createPatchHistory()
    let state = { a: 1 }
    undo(state, 100)
    expect(state).toEqual({ a: 1 })
  })
  it('cannot redo when no patches have been undone', () => {
    let { redo } = createPatchHistory()
    let state = { a: 1 }
    redo(state, 100)
    expect(state).toEqual({ a: 1 })
  })
  it('works with arrays', () => {
    let { undo, redo } = createPatchHistory([
      { op: 'add', path: [0], value: 1 },
      { op: 'remove', path: [1], origValue: 2 },
    ])
    let state = [1]
    undo(state)
    expect(state).toEqual([1, 2])
    undo(state)
    expect(state).toEqual([2])
    redo(state, 2)
    expect(state).toEqual([1])
  })
  it('works with primitive values', () => {
    let { undo, redo } = createPatchHistory([
      { op: 'replace', path: [], value: 1, origValue: 0 },
      { op: 'replace', path: [], value: 2, origValue: 1 },
    ])
    let state = 2
    expect((state = undo(state))).toBe(1)
    expect((state = undo(state))).toBe(0)
    expect((state = redo(state))).toBe(1)
    expect((state = redo(state))).toBe(2)
  })
})
