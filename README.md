![](http://rafaelthca.github.io/aimaraJS/images/aimarajs2.png)
###  Pure Javascript TreeView Component

This javascript component was created as a response to other TreeView components that did not satisfied my project requirements.

The main objective of this component is to be able to dinamically add and remove nodes from the tree as fast as possible and also offer features to interact with the tree.

[Component First Usage](https://github.com/rafaelthca/aimaraJS/wiki/Usage)

[Complete Example](http://rafaelthca.github.io/aimaraJS/Example.html)

## Features

* Create an initial tree structure and render it;
* Add and remove nodes in real time, when the tree is already rendered;
* Display nodes with icons;
* Custom events when nodes are opened and closed;
* Optional modern event listeners and filtering;
* Context menus for nodes.

## Production build

The package exposes the historical source file at `lib/Aimara.js` and a
minified browser build at `dist/Aimara.min.js`.

```sh
npm install
npm run build
```

Use the minified build in production pages:

```html
<link rel="stylesheet" href="css/Aimara.css" />
<script src="dist/Aimara.min.js"></script>
```

The build is generated with esbuild and also writes
`dist/Aimara.min.js.map` for production debugging.

## Bundler usage

AimaraJS can also be imported from Webpack, Vite, Rollup or another bundler:

```js
import createTree, { createTree as createAimaraTree } from 'aimarajs';
import 'aimarajs/css/Aimara.css';

var tree = createTree('div_tree', null, null);
```

CommonJS consumers can use either form:

```js
const createTree = require('aimarajs');
const { createTree: createAimaraTree } = require('aimarajs');
```

When bundling an application, copy only the image icons your application passes
to `createNode` or context menus. AimaraJS internal controls are drawn by CSS.

## Historical API

Existing code keeps working with the historical three arguments:

```js
var tree = createTree('div_tree', 'white', context_menu);
var node = tree.createNode('Text', false, 'images/star.png', null, null, 'context1');
node.createChildNode('Child', false, 'images/folder.png', null, 'context1');
tree.drawTree();
```

The public API remains compatible with existing projects:

```js
createTree(divId, backgroundColor, contextMenu);
tree.createNode(text, expanded, icon, parentNode, tag, contextMenuKey);
tree.drawTree();
tree.expandTree();
tree.collapseTree();
tree.selectNode(node);
tree.removeNode(node);
tree.removeChildNodes(node);

node.createChildNode(text, expanded, icon, tag, contextMenuKey);
node.toggleNode();
node.expandNode();
node.collapseNode();
node.expandSubtree();
node.collapseSubtree();
node.setText(text);
node.removeNode();
```

Historical callbacks are still supported:

```js
tree.nodeBeforeOpenEvent = function(node) {};
tree.nodeAfterOpenEvent = function(node) {};
tree.nodeBeforeCloseEvent = function(node) {};
tree.nodeAfterCloseEvent = function(node) {};
```

## Modern options

`createTree` also accepts an optional fourth argument:

```js
var tree = createTree('div_tree', 'white', context_menu, {
  theme: 'light',
  animate: false,
  allowHtmlLabels: true
});
```

Default options:

```js
{
  theme: 'light',
  animate: false,
  allowHtmlLabels: true
}
```

Available options:

| Option | Default | Notes |
| --- | --- | --- |
| `theme` | `'light'` | Use `'light'`, `'dark'` or `'auto'`. |
| `animate` | `false` | Enables light transitions while respecting `prefers-reduced-motion`. |
| `allowHtmlLabels` | `true` | Keeps historical `innerHTML` labels. Set to `false` to insert labels as text. |
| `name` | `null` | Optional root tree ID. The first tree still uses the historical `tree` ID by default. |

For compatibility, the first tree keeps the historical root ID `tree` and node
IDs such as `node_0`. Additional trees receive unique IDs like
`aimara_tree_2` to avoid collisions on pages with multiple instances. You can
opt in to an explicit root ID with `name: 'my_tree'`.

## Themes

`theme` can be `light`, `dark` or `auto`. The `auto` theme follows the user's
`prefers-color-scheme` setting. Pass `null` as the historical background color
when you want the CSS theme background to control tree line rendering:

```js
var tree = createTree('div_tree', null, context_menu, {
  theme: 'auto'
});

tree.setTheme('dark');
tree.setTheme('light');
tree.setTheme('auto');
```

## Animations

`animate` enables light visual transitions for hover, selection and individual
node open/close actions. It remains disabled by default for backwards
compatibility and respects `prefers-reduced-motion: reduce`.

```js
var tree = createTree('div_tree', 'white', context_menu, {
  animate: true
});

tree.setAnimations(false);
tree.setAnimations(true);
```

## Modern events and filtering

Modern listeners can be registered alongside historical callbacks:

```js
tree.on('select', function(node) {});
tree.on('beforeOpen', function(node) {});
tree.on('afterOpen', function(node) {});
tree.on('beforeClose', function(node) {});
tree.on('afterClose', function(node) {});
```

Trees can also be filtered without losing the original expansion state:

```js
tree.filter('query');
tree.clearFilter();
```

## Compatibility notes

Existing three-argument `createTree` calls do not need to change. New options
are optional and default to the historical behavior whenever possible. Node and
menu icon paths are kept exactly as provided, so keep passing the paths your app
already uses.

Labels still allow HTML by default for compatibility with older examples. If
labels contain untrusted user input, prefer `allowHtmlLabels: false`.

## License

Copyright (c) 2026 Zacharie Monnet

Licensed under the Apache License, Version 2.0

Based on the work of Rafael Castro [Github](https://github.com/rafaelthca/aimaraJS)
