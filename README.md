# Twitter API

Script that use Twitter API to get users followers

## How to use

### 1. Node.js and NPM
Make sure you have the latest version of Node.js installed on you machine.
You can download Node.js here: https://nodejs.org/
Node.js comes with NPM


### 2. Clone or Download this project.


### 3. Install project dependecies
- Open Terminal
- Navigate to the folder you saved this project.
- execute: `npm init`

### 4. Run
In the folder's project, run: `node index`

### 5. Define the users you want to get the data from.
There are 3 ways to do this.

#### a. config files
Use the file the screen_names.json to set a list of users.
e.g ["user1","user2"]

#### b. Inline command
You can override the config file passing the users names directly
e.g `node index --users:"user1,user2"`

#### c. Runtime
If the config file is empty and no names is passed for executuon, the app will ask you to set a Twitter screen_name to collect their followers
e.g user1,user2

### 6. Results
Results are saved on the folder results.

