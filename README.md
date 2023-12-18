<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
<!-- [![LinkedIn][linkedin-shield]][linkedin-url] -->

<a name="readme-top"></a>
<div align="center">
  <h1 align="center">Vue-Tree-Dnd</h3>

  <p align="center">
    Sortable drag-n-drop tree structure for Vue3 with no dependencies
    <br />
    <!-- <a href="https://github.com/jcuenod/vue-tree-dnd"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/jcuenod/vue-tree-dnd">View Demo</a>
    · -->
    <a href="https://github.com/jcuenod/vue-tree-dnd/issues">Report Bug</a>
    ·
    <a href="https://github.com/jcuenod/vue-tree-dnd/issues">Request Feature</a>
    ·
    <a href="https://jcuenod.github.io/vue-tree-dnd-examples/">Live Demo</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#usage">Usage</a></li>
        <li><a href="#api">API</a></li>
      </ul>
    </li>
    <!-- <li><a href="#roadmap">Roadmap</a></li> -->
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://jcuenod.github.io/vue-tree-dnd-examples/)

There are plenty of drag-n-drop libraries for Vue. None of them (that I found) support a file/folder-like structure that can create new levels of nesting. I created this library with this spec in mind:

* Support dynamic nesting
* Limit draggable options to what is possible
* Clearly indicate where items will be dropped
* Support collapsing nodes

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these simple example steps.

### Installation

To install, use your favorite package manager and do the equivalent of:

```sh
npm install -S vue-tree-dnd@latest
```

<!-- USAGE EXAMPLES -->
### Usage

In `Your.vue` file, you can import and use the component:

```vue
<template>
    <VueTreeDnd
        :component="MyTreeItemRenderer"
        :tree="tree"
        @move="moveHandler"
    />
</template>

<script setup>
import { ref } from 'vue'
import VueTreeDnd from 'vue-tree-dnd';
import MyTreeItemRenderer from './my-tree-item.vue'

const tree = ref([
    {
        id: 1,
        name: 'Item 1',
        children: [
            {
                id: 2,
                name: 'Item 2',
                children: [
                    {
                        id: 3,
                        name: 'Item 3',
                        children: []
                    }
                ]
            }
        ]
    }
])
const moveHandler = (event) => {
    console.log(event)
}
</script>
```


<!-- API -->
### API

#### Tree Data

Your `tree` data should conform to the following type:

```ts
type TreeItem = {
    id: number | string
    expanded?: boolean
    children: TreeItem[]
}
```

Apart from these properties, you may include any other additional data. This will be passed into the `ItemRenderer` component.

**Note**: The expanded property is optional and will default to `true`. It is also not two-way bound; changes will be reflected in the dnd tree, but changes in the dnd tree will not be pushed back.

#### Move Mutation

```ts
type MoveMutation = {
    id: number | string
    targetId: number | string
    position: 'LEFT' | 'RIGHT' | 'FIRST_CHILD' | 'LAST_CHILD'
}
```

#### VueTreeDnd

| **Prop** | **Type** | **Description** |
|--|--|--|
| component | `Component` (Vue) | Vue component that will render the TreeItem (i.e., `ItemRenderer`). The component will receive the relevant node in the tree (with its children) as a prop. |
| tree | `TreeItem` | The data to be displayed, conforming to the `TreeItem` type specified above. |
| locked | `boolean` | Whether the tree is locked. When `true`, nodes in the tree will not be draggable. |
| @move | `(event: MoveMutation) => void` | Handler for move mutation. Event will fire when node is dropped in a valid location. The syntax of the `event` data is given in `MoveMutation`. |


#### ItemRenderer

| **Prop** | **Type** | **Description** |
|--|--|--|
| item | `TreeItem` | The node in the tree that is being rendered. |
| depth | `number` | Depth of current node. It is `ItemRenderer`'s responsibility to manage indention. |
| expanded | `boolean` | Whether the node is expanded (or collapsed). It is `ItemRenderer`'s responsibility to manage expand/collapse. |
| setExpanded | `(value: boolean) => void` | Callback to control whether the node is collapsed or expanded. To toggle, call `setExpanded(!expanded)`. |

Your `ItemRenderer` will be draggable but may perform any other actions you wish. For example, you may want to add a button to delete the node. You can do this by adding a `delete` method to your `ItemRenderer` component and using `provide`/`inject` from the component that imports `vue-tree-dnd`.

For example:

```vue
<template>
    <div :style="{ paddingLeft: `${1.5 * depth}rem` }">
        <button @click="setExpanded(!expanded)">{{ expanded ? "▼" : "▶" }}</button>
        <span>{{ item.name }}</span>
        <button @click="delete">X</button>
    </div>
</template>

<script setup>
import { inject } from 'vue'
const props = defineProps(['item', 'depth', 'expanded'])
defineEmits(['setExpanded'])
const delete = () => {
    const deleteHandler = inject('delete')
    deleteHandler(props.item.id)
}
</script>
```



<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
<!-- ## Roadmap

- [x] Add Changelog
- [x] Add back to top links
- [ ] Add Additional Templates w/ Examples
- [ ] Add "components" document to easily copy & paste sections of the readme
- [ ] Multi-language Support
    - [ ] Chinese
    - [ ] Spanish

See the [open issues](https://github.com/jcuenod/vue-tree-dnd/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p> -->



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.md` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/jcuenod/vue-tree-dnd.svg?style=for-the-badge
[contributors-url]: https://github.com/jcuenod/vue-tree-dnd/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jcuenod/vue-tree-dnd.svg?style=for-the-badge
[forks-url]: https://github.com/jcuenod/vue-tree-dnd/network/members
[stars-shield]: https://img.shields.io/github/stars/jcuenod/vue-tree-dnd.svg?style=for-the-badge
[stars-url]: https://github.com/jcuenod/vue-tree-dnd/stargazers
[issues-shield]: https://img.shields.io/github/issues/jcuenod/vue-tree-dnd.svg?style=for-the-badge
[issues-url]: https://github.com/jcuenod/vue-tree-dnd/issues
[license-shield]: https://img.shields.io/github/license/jcuenod/vue-tree-dnd.svg?style=for-the-badge
[license-url]: https://github.com/jcuenod/vue-tree-dnd/blob/master/LICENSE.txt
[product-screenshot]: ./vue-tree-dnd-demo.gif
