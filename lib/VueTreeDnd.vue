<script setup lang="ts">
import {
  computed,
  provide,
  ref,
  watch,
  onMounted,
  onUnmounted
} from 'vue'
import { getFlatTreeWithAncestors } from './utils'
import type {
  DragStartEventHandler,
  DragOverEventHandler,
  DragEndEventHandler,
  DropProposalSetterHandler,
  ExpandedNodes,
  FlatTreeItem,
  MoveMutation,
  MoveMutationProposal,
  TreeItemId,
  VueTreeDndProps
} from './env'
import TreeNode from './TreeNode.vue'

const LEFT_OF_ROOT_ID: TreeItemId = '__vue-dnd-tree-root__'

const props = defineProps<VueTreeDndProps>()
const emit = defineEmits<{
  'move': [move: MoveMutation]
}>()

const flatTreeNodes = ref<FlatTreeItem[]>([])
const flatTreeIds = ref<TreeItemId[]>([])
const expansions = ref<ExpandedNodes>({})
const getDefaultExpanded: (id: TreeItemId) => boolean = (id: TreeItemId) => {
  const node = flatTreeNodes.value.find(
    (node: FlatTreeItem) => node.id === id
  )
  if (node !== undefined && 'expanded' in node && typeof node.expanded === 'boolean') {
    return node.expanded
  }
  if (expansions.value?.[id]) {
    return expansions.value[id]
  }
  return true
}
watch(() => props.tree, () => {
  flatTreeNodes.value = getFlatTreeWithAncestors(props.tree)
  flatTreeIds.value = flatTreeNodes.value.map(({ id }) => id)
  expansions.value = Object.fromEntries(
    flatTreeIds.value.map((id: TreeItemId) =>
      [id, getDefaultExpanded(id)]
    )
  )
}, { immediate: true })
provide('expansions', expansions)

const getPreviousNodeId: (nodeId: TreeItemId) => TreeItemId = (nodeId: TreeItemId) => {
  const index = flatTreeIds.value.findIndex(id => id === nodeId)
  return index === 0
    ? LEFT_OF_ROOT_ID
    : flatTreeIds.value[index - 1]
}

const isSomeParentCollapsed: (targetId: TreeItemId) => boolean = (targetId: TreeItemId) => {
  if (targetId === LEFT_OF_ROOT_ID) {
    return false
  }
  const targetNode = flatTreeNodes.value.find((node: FlatTreeItem) => node.id === targetId)

  if (targetNode === undefined) {
    throw new Error(`targetId ${targetId} not found in flatTreeNodes`)
  }

  const parentIds = targetNode.__vue_dnd_tree_ancestors
  return parentIds.some((parentId: TreeItemId) => !expansions.value?.[parentId])
}

const deltaX = ref(0)
const dragOverDeltaXCalculator: (event: DragEvent) => void = (event: DragEvent) => {
  event.preventDefault()
  if (dragdata.value === null) {
    throw new Error('VueTreeDnd has not correctly set dataTransfer data (missing)')
  }

  const { initialX, initialDepth } = dragdata.value
  const xd = Math.round((+event.clientX - initialX) / 20)
  deltaX.value = initialDepth + xd
}
onMounted(() => { document.addEventListener('dragover', dragOverDeltaXCalculator) })
onUnmounted(() => { document.removeEventListener('dragover', dragOverDeltaXCalculator) })

const dragItemId = ref<TreeItemId | null>(null)
const dragItem = computed(() => flatTreeNodes.value.find((node: FlatTreeItem) => node.id === dragItemId.value))
provide('dragItem', dragItem)

const dragItemDescendantIdSet = computed(() => {
  if (dragItem.value === undefined) {
    return new Set()
  }
  return new Set(getFlatTreeWithAncestors([dragItem.value]).map((node: FlatTreeItem) => node.id))
})

const dropTarget = ref<TreeItemId | null>(null)
const setDropTarget: (targetId: TreeItemId) => void = (targetId: TreeItemId) => {
  if (dragItemDescendantIdSet.value.has(targetId) || isSomeParentCollapsed(targetId)) {
    setDropTarget(getPreviousNodeId(targetId))
    return
  }
  dropTarget.value = targetId
}
provide('dropTarget', dropTarget)
provide('setDropTarget', setDropTarget)

const dropProposal = ref<MoveMutationProposal | null>(null)
const setDropProposal: DropProposalSetterHandler = (proposal: MoveMutationProposal) => {
  dropProposal.value = proposal
}
provide('setDropProposal', setDropProposal)

watch(dropTarget, () => {
  if (dropTarget.value === LEFT_OF_ROOT_ID) {
    if (dragItemId.value === null) {
      throw new Error('dragItemId.value is null')
    }
    setDropProposal({
      id: dragItemId.value,
      targetId: props.tree[0].id,
      position: 'LEFT',
      ghostIndent: 0
    })
  }
})

// --------------------------------- DRAG EVENTS ---------------------------------

const dragend: DragEndEventHandler = () => {
  if (dropProposal.value == null) {
    return
  }
  dropTarget.value = null
  dragItemId.value = null

  const { ghostIndent, ...proposal } = dropProposal.value

  if (proposal.id === proposal.targetId) {
    // No-op
    return
  }
  emit('move', proposal)
}

const dragImage = new Image()
type DragEventData = {
  initialX: number
  initialDepth: number
} | null
const dragdata = ref<DragEventData>(null)
const dragstart: DragStartEventHandler = (event: DragEvent, itemId: TreeItemId, depth: number) => {
  if (event.dataTransfer !== null) {
    event.dataTransfer.dropEffect = 'none'
    event.dataTransfer.effectAllowed = 'none'
    event.dataTransfer.setDragImage(dragImage, 0, 0)
  }
  // Putting this in a timeout is necessary for Chrome.
  setTimeout(() => {
    dragItemId.value = itemId
    dragdata.value = {
      initialX: event.clientX,
      initialDepth: depth
    }
    setDropTarget(getPreviousNodeId(itemId))
  }, 0)
}
provide<DragStartEventHandler>('dragstart', dragstart)

const dragover: DragOverEventHandler = (event: DragEvent, itemId: TreeItemId) => {
  event.preventDefault()
  const previousNodeId = getPreviousNodeId(itemId)
  if (dragItemId.value === itemId) {
    setDropTarget(previousNodeId); return
  }
  setDropTarget(event.offsetY < (event.target as HTMLElement).clientHeight / 2
    ? previousNodeId
    : itemId)
}
provide<DragOverEventHandler>('dragover', dragover)
</script>

<template>
  <div @dragend="dragend">
    <div
      v-if="dropTarget === LEFT_OF_ROOT_ID && dragItem !== undefined"
      style="
        display: flex;
        flex-direction: row;
        align-items: center;
        opacity: 0.3;
        pointer-events: none;
      "
    >
      <TreeNode
        :item="dragItem"
        :component="component"
        :ancestors="[]"
        :depth="0"
        :delta-x="deltaX"
        :is-ghost="true"
        :locked="locked"
      />
    </div>
    <template
      v-for="node in tree || []"
      :key="node.id"
    >
      <TreeNode
        :item="node"
        :component="component"
        :ancestors="[]"
        :depth="0"
        :drop-target="dropTarget"
        :delta-x="deltaX"
        :is-ghost="false"
        :locked="locked"
        :draggable="!locked"
        @dragstart.stop="dragstart($event, node.id, 0)"
      />
    </template>
  </div>
</template>
