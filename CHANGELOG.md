# Node-RED for PAC Control

### 1.1.4

October 21, 2020

 * Message Queue improvements:
   * Added a device option for when the mesage queue is full: "When full, message queue should [drop-old | reject-new] messages."
     * Existing device configurations will be set to "reject-new", which was the existing behavior. New device configurations
       will be set to the default of "drop-old".
   * Don't add warnings to the log when the message queue is full.
   * Stop showing the queue count in each node. It was too confusing, since it only 
     reflected the count when the node was last updated.

### 1.1.3

October 19, 2020

 * Don't flood the log with identical error messages coming from a single node.
   This mostly helps with an ongoing issue, such as an offline device or a misconfigured node.

### 1.1.2

October 2, 2020

 * Improved error messages for a few common certificate problems.

### 1.1.1

May 27, 2020

 * Removed the "Public Key" option from the communication settings.
   The name was incorrect and it was never supported.
 * Add Groov RIO support for CA certs being in the system's store
 * Fix #1: A msg.payload of null will result in crash
 * Documentation fixes and improvements.

### 1.1.0

May 18, 2018

 * The nodes now support both _groov_ EPIC and SNAP PAC controllers running a PAC Control strategy.


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

