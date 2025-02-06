import { type Component } from 'vue'

export type Position = 'LEFT' | 'RIGHT' | 'FIRST_CHILD' | 'LAST_CHILD'

export type TreeItemId = string | number
export interface TreeItem {
  id: TreeItemId
  expanded: boolean
  children: TreeItem[]
}
interface FlatTreeItem {
  id: ItemId
  expanded: boolean
  children: TreeItem[]
  __vue_dnd_tree_ancestors: ItemId[]
}

type DragStartEventHandler = (event: DragEvent, itemId: ItemId, depth: number) => void
type DragOverEventHandler = (event: DragEvent, itemId: ItemId) => void
type DragEndEventHandler = (event: DragEvent) => void

interface MoveMutationProposal {
  id: ItemId
  targetId: ItemId
  position: Position
  ghostIndent: number
}
type DropProposalSetterHandler = (proposal: MoveMutationProposal | null) => void

export interface MoveMutation {
  id: TreeItemId
  targetId: TreeItemId
  position: Position
}

export type PermitsDrop = (item: TreeItemId | undefined) => boolean

export interface TreeItemProps {
  item: TreeItem
  component: Component
  ancestors: TreeItemId[]
  depth: number
  deltaX: number
  isGhost: boolean
  locked: boolean
}
export interface VueTreeDndProps {
  modelValue: TreeItem[]
  component: Component
  permitsDrop?: PermitsDrop
  locked: boolean
}

// Unused, but for reference:
// export interface VueTreeDndEmits {
//   'move-node': [move: MoveMutation]
//   'update:modelValue': [tree: TreeItem[]]
// }
