import { isProxy, isReactive, isRef, toRaw } from 'vue'
import type { TreeItem, TreeItemId, FlatTreeItem } from './env'

export const getFlatTreeWithAncestors: (nodes: TreeItem[]) => FlatTreeItem[] = (nodes: TreeItem[]) => {
  const result: FlatTreeItem[] = []

  const traverse: (node: TreeItem, parentIds?: TreeItemId[]) => void = (node: TreeItem, parentIds: TreeItemId[] = []) => {
    result.push({
      ...node,
      __vue_dnd_tree_ancestors: parentIds
    })
    for (const child of node.children) {
      traverse(child, [...parentIds, node.id])
    }
  }

  nodes.forEach(node => { traverse(node) })
  return result
}

export function deepToRaw<T extends Record<string, any>> (sourceObj: T): T {
  const objectIterator = (input: any): any => {
    if (Array.isArray(input)) {
      return input.map((item) => objectIterator(item))
    }
    if (isRef(input) || isReactive(input) || isProxy(input)) {
      return objectIterator(toRaw(input))
    }
    if (Boolean(input) && typeof input === 'object') {
      return Object.keys(input).reduce<Record<string, any>>((acc, key) => {
        acc[key] = objectIterator(input[key])
        return acc
      }, {})
    }
    return input
  }
  return objectIterator(sourceObj)
}
