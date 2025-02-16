<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch
} from 'vue'
import {
  deepToRaw,
  getFlatTreeWithAncestors
} from './utils'
import type {
  DragStartEventHandler,
  DragOverEventHandler,
  DragEndEventHandler,
  DropProposalSetterHandler,
  FlatTreeItem,
  MoveMutation,
  MoveMutationProposal,
  TreeItemId,
  VueTreeDndProps,
  TreeItem
} from './env'
import TreeNode from './TreeNode.vue'

const LEFT_OF_ROOT_ID: TreeItemId = '__vue-dnd-tree-root__'

const props = defineProps<VueTreeDndProps>()
const emit = defineEmits<{
  'move': [move: MoveMutation]
  'update:modelValue': [tree: TreeItem[]]
}>()

const flatTreeNodes = ref<FlatTreeItem[]>([])
const flatTreeIds = ref<TreeItemId[]>([])
const getNodeById: (id: TreeItemId) => FlatTreeItem | undefined = (id: TreeItemId) => {
  return flatTreeNodes.value.find((node: FlatTreeItem) => node.id === id)
}
watch(() => props.modelValue, () => {
  flatTreeNodes.value = getFlatTreeWithAncestors(props.modelValue)
  flatTreeIds.value = flatTreeNodes.value.map(({ id }) => id)
}, { immediate: true })

provide('permitsDrop', props.permitsDrop ?? (() => true))
provide('getParent', (nodeId: TreeItemId) => {
  const node = getNodeById(nodeId)
  if (node === undefined) {
    return undefined
  }
  return node.__vue_dnd_tree_ancestors?.[node.__vue_dnd_tree_ancestors.length - 1]
})

provide('setExpanded', (expanded: boolean, treeItemId: TreeItemId) => {
  const clonedTree = structuredClone(deepToRaw(props.modelValue))
  const traverse: (node: TreeItem) => void = (node: TreeItem) => {
    if (node.id === treeItemId) {
      node.expanded = expanded
    }
    if (node.children !== undefined) {
      node.children.forEach(traverse)
    }
  }
  clonedTree.forEach(traverse)
  emit('update:modelValue', clonedTree)
})

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
  return parentIds.some((parentId: TreeItemId) => !((getNodeById(parentId)?.expanded) ?? false))
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

const dropProposal = ref<MoveMutationProposal | null>(null)
const setDropProposal: DropProposalSetterHandler = (proposal) => {
  dropProposal.value = proposal
}
provide('setDropProposal', setDropProposal)

watch(dropTarget, () => {
  if (dropTarget.value === LEFT_OF_ROOT_ID) {
    if (dragItemId.value === null) {
      throw new Error('dragItemId.value is null')
    }
    if (props.permitsDrop !== undefined && !props.permitsDrop(undefined)) {
      return
    }
    setDropProposal({
      id: dragItemId.value,
      targetId: props.modelValue[0].id,
      position: 'LEFT',
      ghostIndent: 0
    })
  }
})

// --------------------------------- DRAG EVENTS ---------------------------------

const dragend: DragEndEventHandler = () => {
  dropTarget.value = null
  dragItemId.value = null

  if (dropProposal.value == null) {
    return
  }

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
      v-for="node in modelValue || []"
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
