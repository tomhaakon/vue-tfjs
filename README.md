# Vue 3 + Typescript + Vite

This template should help get you started developing with Vue 3 and Typescript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are shimmed to be a generic Vue component type by default. In most cases this is fine if you don't really care about component prop types outside of templates. However, if you wish to get actual prop types in `.vue` imports (for example to get props validation when using manual `h(...)` calls), you can enable Volar's `.vue` type support plugin by running `Volar: Switch TS Plugin on/off` from VSCode command palette.

1. `@jridgewell/sourcemap-codec`: This is a module for encoding/decoding the VLQ-based sourcemap format used by the Mozilla source-map library.
2. `@tensorflow-models/coco-ssd`: This is a TensorFlow.js model that can detect objects in images using the COCO-SSD model.
3. `@tensorflow/tfjs`, `@tensorflow/tfjs-backend-cpu`, and `@tensorflow/tfjs-backend-webgl`: These are TensorFlow.js libraries that allow for machine learning in JavaScript.
4. `@types/jsdom`: This provides TypeScript definitions for JSDOM, a JavaScript-based implementation of core web standards.
5. `@vue/test-utils`: This is a set of utility functions aimed to simplify testing Vue.js components.
6. `@vue/tsconfig`: This is a shareable TSConfig for Vue.js projects.
7. `jsdom`: This is a JavaScript-based implementation of core web standards, primarily for use with Node.js.
8. `pinia`: This is a state management library for Vue.js applications.
9. `start-server-and-test`: This is a tool to start a server, wait for a URL, then run a test command.
10. `vue`: This is the Vue.js library, a framework for building user interfaces.
11. `vue-router`: This is the official router for Vue.js.

In the `devDependencies`:

1. `@vitejs/plugin-vue`: This is a Vite plugin that provides Vue.js support.
2. `autoprefixer`: This is a tool to parse CSS and add vendor prefixes to CSS rules.
3. `postcss`: This is a tool for transforming styles with JavaScript plugins.
4. `tailwindcss`: This is a utility-first CSS framework.
5. `typescript`: This is the TypeScript language itself.
6. `vite`: This is a build tool that aims to provide a faster and leaner development experience for modern web projects.
