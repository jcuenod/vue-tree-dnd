import { type Component } from 'vue'
import type { VueTreeDndProps } from './env.js'
import VueTreeDnd from './VueTreeDnd.vue'

export default (VueTreeDnd as Component<VueTreeDndProps>)
export type {
  VueTreeDndProps
}
