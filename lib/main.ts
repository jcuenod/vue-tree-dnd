import { type Component } from 'vue'
import type {
  VueTreeDndProps,
  MoveMutation,
  TreeItem,
  TreeItemId
} from './env.js'
import VueTreeDnd from './VueTreeDnd.vue'

export default (VueTreeDnd as Component<VueTreeDndProps>)
export type {
  VueTreeDndProps,
  MoveMutation,
  TreeItem,
  TreeItemId
}
