<script setup lang="ts">
import {
  inject,
  computed,
  watch,
  type ComputedRef
} from 'vue'
import type {
  DragStartEventHandler,
  DragOverEventHandler,
  DropProposalSetterHandler,
  MoveMutationProposal,
  TreeItem,
  TreeItemId,
  TreeItemProps,
  Position
} from './env'

const props = defineProps<TreeItemProps>()
// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
if (!props.item) {
  throw new Error('item is required')
}
if (!(typeof props.item?.id === 'string') || props.item.id === '') {
  throw new Error('item.id is required')
}
if (!Array.isArray(props.item?.children)) {
  throw new Error('item.children array is required')
}
if (!('expanded' in props.item)) {
  throw new Error('item.expanded is required')
}
// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
if (!props.component) {
  throw new Error('component is required')
}

const permitsDrop = inject<(item: TreeItemId) => boolean>('permitsDrop', () => true)

const getParent = inject<(nodeId: TreeItemId) => TreeItemId | undefined>('getParent', () => {
  throw new Error('getParent has not been provided')
})

const setExpanded = inject<(expanded: boolean, treeItemId: TreeItemId) => void>('setExpanded', () => {
  throw new Error('setExpanded has not been provided')
})
const scopedSetExpanded: (expanded: boolean) => void = (expanded: boolean) => {
  setExpanded(expanded, props.item.id)
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

const possibleMoveMutationsFilter: (mutation: MoveMutationProposal) => boolean = (mutation: MoveMutationProposal) => {
  if (mutation.id === mutation.targetId) {
    return false
  }
  const getActualTargetId: (m: MoveMutationProposal) => TreeItemId = (mutation: MoveMutationProposal) => {
    switch (mutation.position) {
      case 'LEFT':
        return getParent(mutation.targetId)
      case 'RIGHT':
        return getParent(mutation.targetId)
      case 'FIRST_CHILD':
        return mutation.targetId
      case 'LAST_CHILD':
        return mutation.targetId
    }
    throw new Error(`Unexpected position ${mutation.position as Position}`)
  }
  return permitsDrop(getActualTargetId(mutation))
}

const possibleMoveMutations = computed<MoveMutationProposal[]>(() => {
  if ((dragItem?.value) == null) {
    return []
  }
  const dragItemId = dragItem.value.id

  const possibleMoveMutationsList: () => MoveMutationProposal[] = () => {
    // If we have expanded children, node must be first child (no other options)
    // If we are a leaf/collapsed, node can be sibling or child (must be last if collapsed)
    // If we are the last child, node can also move up to ancestors
    // (ancestors is only set on the last child [with asterisks to account for the dragged node])
    if (props.item.children.filter(node => node.id !== dragItemId).length > 0 && props.item.expanded) {
      return [{ id: dragItemId, targetId: props.item.id, position: 'FIRST_CHILD' as Position, ghostIndent: props.depth + 1 }]
    }
    const getOffsetIndent: (index: number) => number = (index: number) => props.depth - (props.ancestors.length - index)
    return [
      ...props.ancestors.map<MoveMutationProposal>((targetId, index) => ({
        id: dragItemId, targetId, position: 'RIGHT' as Position, ghostIndent: getOffsetIndent(index)
      })),
      { id: dragItemId, targetId: props.item.id, position: 'RIGHT' as Position, ghostIndent: props.depth },
      { id: dragItemId, targetId: props.item.id, position: 'LAST_CHILD' as Position, ghostIndent: props.depth + 1 }
    ]
  }
  return possibleMoveMutationsList().filter(possibleMoveMutationsFilter)
})
const ghostIndent = computed(() => {
  const sortedMutationsByDistanceFromDeltaX = possibleMoveMutations.value.slice(0)
    .sort((a, b) => Math.abs(props.deltaX - a.ghostIndent) - Math.abs(props.deltaX - b.ghostIndent))
  return sortedMutationsByDistanceFromDeltaX?.[0]?.ghostIndent ?? null
})

const injectedSetDropProposal = inject<DropProposalSetterHandler>('setDropProposal')
const setDropProposal: DropProposalSetterHandler = (proposal) => {
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
    const impliedMoveMutation = possibleMoveMutations.value.sort((a, b) => Math.abs(a.ghostIndent - ghostIndent.value) - Math.abs(b.ghostIndent - ghostIndent.value))?.[0]
    setDropProposal(impliedMoveMutation ?? null)
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
        :expanded="item.expanded"
        @set-expanded="scopedSetExpanded"
      />
    </div>

    <!-- Display ghost (if this TreeNode is not the ghost) -->
    <div
      v-if="dropTarget === item.id && !isGhost && dragItem !== undefined && ghostIndent !== null"
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
      v-show="item.expanded"
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
