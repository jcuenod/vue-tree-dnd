<script setup lang="ts">
import {
  inject,
  computed,
  watch,
  type ComputedRef,
  type Ref
} from 'vue'
import type {
  DragStartEventHandler,
  DragOverEventHandler,
  DropProposalSetterHandler,
  ExpandedNodes,
  MoveMutationProposal,
  TreeItem,
  TreeItemId,
  TreeItemProps
} from './env'
import { clamp } from './utils'

const props = defineProps<TreeItemProps>()
if (props.item === undefined) {
  throw new Error('item is required')
}
if (props.item?.id === null) {
  throw new Error('item.id is required')
}
if (props.item?.children === null) {
  throw new Error('item.children is required')
}
if (props.component === undefined) {
  throw new Error('component is required')
}

const expansions = inject<Ref<ExpandedNodes>>('expansions')
if (expansions === undefined) {
  throw new Error('VueTreeDnd has not provided `expansions` (This is probably a VueTreeDnd bug!)')
}
const expanded = computed(() => expansions.value?.[props.item?.id] ?? true)
const setExpanded: (expanded: boolean) => void = (expanded: boolean) => {
  expansions.value = {
    ...expansions.value,
    [props.item?.id]: expanded
  }
}

const dropTarget = inject<ComputedRef<TreeItemId>>('dropTarget')
const dragItem = inject<ComputedRef<TreeItem | undefined>>('dragItem')
const injectedDragstart = inject<DragStartEventHandler>('dragstart')
const dragstart: DragStartEventHandler = (event: DragEvent, id: TreeItemId, depth: number) => {
  if (injectedDragstart === undefined) {
    throw new Error('VueTreeDnd has not been provided')
  }
  injectedDragstart(event, id, depth)
}
const injectedDragover = inject<DragOverEventHandler>('dragover')
const dragover: DragOverEventHandler = (event: DragEvent, id: TreeItemId) => {
  if (injectedDragover === undefined) {
    throw new Error('VueTreeDnd has not been provided')
  }
  injectedDragover(event, id)
}

const possibleMoveMutations = computed<MoveMutationProposal[]>(() => {
  if ((dragItem?.value) == null) {
    return []
  }
  const dragItemId = dragItem.value.id

  // If we have expanded children, node must be first child (no other options)
  // If we are a leaf/collapsed, node can be sibling or child (must be last if collapsed)
  // If we are the last child, node can also move up to ancestors
  if (props.item.children.filter(node => node.id !== dragItemId).length > 0 && expanded.value) {
    return [{ id: dragItemId, targetId: props.item.id, position: 'FIRST_CHILD', ghostIndent: props.depth + 1 }]
  }
  const getOffsetIndent: (index: number) => number = (index: number) => props.depth - (props.ancestors.length - index)
  return [
    ...props.ancestors.map<MoveMutationProposal>((targetId, index) => ({
      id: dragItemId, targetId, position: 'RIGHT', ghostIndent: getOffsetIndent(index)
    })),
    { id: dragItemId, targetId: props.item.id, position: 'RIGHT', ghostIndent: props.depth },
    { id: dragItemId, targetId: props.item.id, position: 'LAST_CHILD', ghostIndent: props.depth + 1 }
  ]
})
const ghostIndent = computed(() => {
  const minOffset = Math.min(...possibleMoveMutations.value.map(m => m.ghostIndent))
  const maxOffset = Math.max(...possibleMoveMutations.value.map(m => m.ghostIndent))
  return clamp(props.deltaX, minOffset, maxOffset)
})

const injectedSetDropProposal = inject<DropProposalSetterHandler>('setDropProposal')
const setDropProposal: DropProposalSetterHandler = (proposal: MoveMutationProposal) => {
  if (injectedSetDropProposal === undefined) {
    throw new Error('VueTreeDnd has not been provided')
  }
  injectedSetDropProposal(proposal)
}
watch([dropTarget, possibleMoveMutations, ghostIndent], () => {
  if (dropTarget === undefined || dropTarget?.value === null) {
    return
  }
  if (dropTarget.value === props.item.id) {
    const impliedMoveMutation = possibleMoveMutations.value.find(m => m.ghostIndent === ghostIndent.value)
    if (impliedMoveMutation == null) {
      throw new Error(`Could not find impliedMoveMutation for ghostIndent ${ghostIndent.value}`)
    }
    setDropProposal(impliedMoveMutation)
  }
})

const dragStyle = {
  position: 'absolute',
  opacity: 0,
  pointerEvents: 'none'
}
const isBeingDraggedStyle = computed(() => dragItem?.value?.id === props.item.id && !props.isGhost ? dragStyle : {})
</script>

<template>
  <a
    href="javascript:;"
    style="color: inherit; text-decoration: none"
    :style="isBeingDraggedStyle"
  >
    <!-- Display actual node -->
    <div
      style="display: flex; flex-direction: row; align-items: center;"
      @dragover="dragover($event, item.id)"
    >
      <component
        :is="component"
        :item="item"
        :depth="depth"
        :expanded="expanded"
        @set-expanded="setExpanded"
      />
    </div>

    <!-- Display ghost (if this TreeNode is not the ghost) -->
    <div
      v-if="dropTarget === item.id && !isGhost && dragItem !== undefined"
      style="display: flex; flex-direction: row; align-items: center; opacity: 0.3; pointer-events: none;"
    >
      <TreeNode
        :item="dragItem"
        :component="component"
        :ancestors="[]"
        :drop-target="dropTarget"
        :depth="ghostIndent"
        :delta-x="deltaX"
        :is-ghost="true"
        :locked="locked"
      />
    </div>

    <!-- Display children if expanded -->
    <!-- TODO: replacing v-show with v-if produces inexplicable errors -->
    <TreeNode
      v-for="(node, index) in item?.children || []"
      v-show="expanded"
      :key="node.id"
      :item="node"
      :component="component"
      :ancestors="index === (item.children.length - 1) || (index === (item.children.length - 2) && dragItem?.id === item?.children[item.children.length - 1]?.id) ? [...ancestors, item.id] : []"
      :drop-target="dropTarget"
      :depth="depth + 1"
      :delta-x="deltaX"
      :is-ghost="isGhost"
      :locked="locked"
      :draggable="!locked"
      @dragstart.stop="dragstart($event, node.id, depth + 1)"
    />
  </a>
</template>
