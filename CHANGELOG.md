# Node-RED for SNAP PAC

### 1.0.2

October 21, 2016

 * Minor changes to the keywords describing the package.


### 1.0.1

October 17, 2016

 * Read node:
   * Added option to specify on which ```msg``` property that the response will be placed.
   * Added option to allow the topic to be set within the Read node.

 * Read and Write nodes:
   * SSL certificate files can now be specified by just a filename, not only
     a full path. If using just a filename, it will load from a directory
     named 'certs' inside the Node-RED user's directory. For example, 
     _/home/user/.node-red/certs/filename.crt_.
   * Added a timeout of 30 seconds. This affects the nodes once they're connected to the PAC.


### 1.0.0

July 21, 2016

 * Initial Release 

