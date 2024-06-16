# NoExtra for Cartesi App Development

This is a fork of [Brunodo](https://github.com/Calindra/brunodo) project. Sprinkled with [Tikua](https://github.com/doiim/tikua).

It wraps the original binary of Nonodo, taking care of downloading the correct version of the binary for the current platform. As of now, it's not configurable and it downloads a fixed version of Nonodo. 

The difference to Brunodo is exposing the wrapper as a usable library. It's intended to help with integration tests and scripting when developing a front-end project.

Currently, it's implemented in pure JavaScript, but a TS version is planned. Also, it will be easier to add extra functionalities based on hardhat and foundry. 

The idea is to separate lingering dependencies from EVM development from Cartesi App development.

## Installation 

### Global

```shell
npm install -g @gbarros/noextra
```

### Local

```shell
npm install --save-dev @gbarros/noextra
yarn add --dev @gbarros/noextra
```


## Usage

### Global

```shell
npx nonodo
or 
nonodo
```

### Local

```js
import { nonodo, addressBook, getTikua } from "@gbarros/noextra";
...

nonodo.start();
const tikua = getTikua(abi); // returns a tikua object configured to use the local nonodo
nododo.stop();
console.log(addressBook()); // displays the address book as JSON object


```

Feel free to check out the examples folder or check the 'integration test' on [meme-backend](https://github.com/Mugen-Builders/memebet-backend) project.
