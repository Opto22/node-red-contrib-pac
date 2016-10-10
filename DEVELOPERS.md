# Node-RED for SNAP PAC

## Source Code

The code is written in [TypeScript](http://www.typescriptlang.org/) and then transpiled
into JavaScript. For more information on creating Node-RED nodes, see the
official [Creating Nodes Overview](http://nodered.org/docs/creating-nodes/).

The following instructions assume that development is done on a modern Linux system.

After cloning the Git repository, all further instructions assume that you are in the root
of the source directory, which is likely called  _node-red-contrib-pac_.

## Install Dependencies

After cloning the repository to your computer, you need to install the dependencies
by running:

```
npm install
```

Also, _grunt-cli_ must be installed:

```
sudo npm install -g grunt-cli
```

## Build

To build the JavaScript files from the TypeScript source, run:

```
grunt
```

You can also clean out all the output files with:

```
grunt clean
```

## Link Nodes

In order for your development version of the SNAP PAC nodes to be used by Node-RED, you
need to link your source directory into the local npm system. Run:

```
sudo npm link
```

## Tests

There are two types of tests you can run: with or without a PAC.

### Internal Tests without a PAC

To run just the internal unit tests without a PAC, run:

```
grunt test-internal
```

### All Tests

Running all tests requires the following:

 1. A PAC controller with:
    1. 9.5 or greater firmware.
    1. REST API configured for HTTP access, and at least one API key.
    1. Running the PAC Control Basic strategy named NodeRedTester, which is located in
       the _test/pac_ folder.
 1. A local copy of the _settings.json_ file.
    1. From within _ts/test/exernal_, copy _settings.json.tmpl_ to _settings.json_.
    1. Adjust the file to use your PAC's address and API key.

To run all the tests, run:

```
grunt test-all
```


