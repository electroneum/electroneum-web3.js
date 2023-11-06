<p align="center">
  <img src="assets/logo/web3js.jpg" width="500" alt="web3.js" />
</p>

# web3-types

![ES Version](https://img.shields.io/badge/ES-2020-yellow)
![Node Version](https://img.shields.io/badge/node-14.x-green)
[![NPM Package][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

This is a sub-package of [@etn-sc/web3.js][repo].

`@etn-sc/web3-types` contains the common data structures and interfaces used in [web3.js][repo].

## Installation

You can install the package using [NPM](https://www.npmjs.com/package/@etn-sc/web3-types)

### Using NPM

```bash
npm install @etn-sc/web3-types
```

## Getting Started

-   :writing_hand: If you have questions [submit an issue](https://github.com/electroneum/electroneum-web3.js/issues/new)

## Prerequisites

-   :gear: [NodeJS](https://nodejs.org/) (LTS/Fermium)
-   :toolbox: [Yarn](https://yarnpkg.com/)/[Lerna](https://lerna.js.org/)

## Package.json Scripts

| Script           | Description                                        |
| ---------------- | -------------------------------------------------- |
| clean            | Uses `rimraf` to remove `dist/`                    |
| build            | Uses `tsc` to build package and dependent packages |
| lint             | Uses `eslint` to lint package                      |
| lint:fix         | Uses `eslint` to check and fix any warnings        |
| format           | Uses `prettier` to format the code                 |
| test             | Uses `jest` to run unit tests                      |
| test:integration | Uses `jest` to run tests under `/test/integration` |
| test:unit        | Uses `jest` to run tests under `/test/unit`        |

[docs]: https://docs.web3js.org/
[repo]: https://github.com/electroneum/electroneum-web3.js/tree/4.x/packages/web3-types
[npm-image]: https://img.shields.io/github/package-json/v/web3/web3.js/4.x?filename=packages%2Fweb3-types%2Fpackage.json
[npm-url]: https://npmjs.org/package/@etn-sc/web3-types
[downloads-image]: https://img.shields.io/npm/dm/web3-types?label=npm%20downloads
