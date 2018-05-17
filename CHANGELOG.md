# Node-RED for Opto 22 Control Engines

### 1.1.0

May 18, 2018

 * The nodes now support both _groov_ EPIC and SNAP PAC control engines.


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

