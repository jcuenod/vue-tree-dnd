import { type Component } from 'vue'

export type Position = 'LEFT' | 'RIGHT' | 'FIRST_CHILD' | 'LAST_CHILD'

export type TreeItemId = string | number
export interface TreeItem {
  id: TreeItemId
  children: TreeItem[]
}
interface FlatTreeItem {
  id: ItemId
  children: TreeItem[]
  __vue_dnd_tree_ancestors: ItemId[]
}

type ExpandedNodes = {
  [key in ItemId]: boolean
}

type DragStartEventHandler = (event: DragEvent, itemId: ItemId) => void
type DragOverEventHandler = (event: DragEvent, itemId: ItemId) => void
type DragEndEventHandler = (event: DragEvent) => void

interface MoveMutationProposal {
  id: ItemId
  targetId: ItemId
  position: Position
  offsetIndent: number
}
type DropProposalSetterHandler = (proposal: MoveMutationProposal) => void

export interface MoveMutation {
  id: TreeItemId
  targetId: TreeItemId
  position: Position
}

export interface TreeItemProps {
  item: TreeItem
  component: Component
  ancestors: TreeItemId[]
  depth: number
  deltaX: number
  isGhost: boolean
}
export interface VueTreeDndProps {
  tree: TreeItem[]
  component: Component
}

export interface VueTreeDndEmits {
  'move-node': [move: MoveMutation]
}
