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

export const clamp: (value: number, min: number, max: number) => number = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
