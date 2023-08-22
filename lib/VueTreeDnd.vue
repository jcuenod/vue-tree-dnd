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
  TreeItem,
  TreeItemId,
  VueTreeDndProps
} from './env'
import TreeNode from './TreeNode.vue'

const LEFT_OF_ROOT_ID: TreeItemId = '__vue-dnd-tree-root__'

const props = defineProps<VueTreeDndProps>()
const emit = defineEmits<{
  'move': [move: MoveMutation]
}>()

const flatTreeNodes = computed(() => {
  return Array.isArray(props.tree) && props.tree.length > 0
    ? getFlatTreeWithAncestors(props.tree)
    : []
})
const flatTreeIds = computed<TreeItemId[]>(() => flatTreeNodes.value.map((node: TreeItem) => node.id))
const getPreviousNodeId: (nodeId: TreeItemId) => TreeItemId = (nodeId: TreeItemId) => {
  const index = flatTreeIds.value.findIndex(id => id === nodeId)
  return index === 0
    ? LEFT_OF_ROOT_ID
    : flatTreeIds.value[index - 1]
}

const expansions = ref<ExpandedNodes>({})
watch(() => flatTreeIds, () => {
  expansions.value = Object.fromEntries(flatTreeIds.value.map((id: TreeItemId) => [id, expansions.value?.[id] ?? true]))
}, { immediate: true })
provide('expansions', expansions)

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
const dragOverMouseHandler: (event: DragEvent) => void = (event: DragEvent) => {
  if ((event.dataTransfer?.getData('mouseX')) == null) {
    throw new Error('VueTreeDnd has not correctly set mouseX')
  }
  const originX = parseInt(event.dataTransfer?.getData('mouseX'))
  deltaX.value = +event.clientX - originX
}
onMounted(() => { document.addEventListener('dragover', dragOverMouseHandler) })
onUnmounted(() => { document.removeEventListener('dragover', dragOverMouseHandler) })

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
      offsetIndent: 0
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

  const { offsetIndent, ...proposal } = dropProposal.value
  emit('move', proposal)
}

const dragstart: DragStartEventHandler = (event: DragEvent, itemId: TreeItemId) => {
  event.dataTransfer?.setData('mouseX', event.clientX.toString())
  dragItemId.value = itemId
  setDropTarget(getPreviousNodeId(itemId))
}
provide<DragStartEventHandler>('dragstart', dragstart)

const dragover: DragOverEventHandler = (event: DragEvent, itemId: TreeItemId) => {
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
        draggable="true"
        @dragstart.stop="dragstart($event, node.id)"
      />
    </template>
  </div>
</template>
