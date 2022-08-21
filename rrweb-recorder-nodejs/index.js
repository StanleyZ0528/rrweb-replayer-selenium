const express = require('express');
const app = express();
const port = parseInt(process.argv.slice(2)[0]);
// Proxy port number is always 920 smaller than recorder port (see startup script)
const proxy_port = port - 920;
const fs = require('fs');
const {execSync} = require("child_process");
const fs_promise = require('fs').promises;
if (!fs.existsSync(__dirname + '/results/count.txt')) {
    console.log("Creating new file to save user session count...");
    fs.writeFileSync('results/count.txt', "1");
    global.sessionCount = 1;
    console.log("User session Count: " + global.sessionCount.toString());
} else {
    console.log("Getting user session count...");
    const data = fs.readFileSync(__dirname + '/results/count.txt',
        {encoding:'utf8', flag:'r'});
    global.sessionCount = parseInt(data) + 1;
    fs.writeFileSync(__dirname + '/results/count.txt', global.sessionCount.toString());
    console.log("User session Count: " + global.sessionCount.toString());
}
global.sessionStart = false;
global.snapCounter = 0;
global.recordCounter = 0;
global.pageCounter = 0;
global.sessionTime = 0;
global.startTime = 0;
global.sessionCheck = true;

app.get('/', (req, res) => {
    fs_promise.readFile(__dirname + "/index.html")
        .then(contents => {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);
            res.end(contents);
        })
        .catch(err => {
            res.writeHead(500);
            res.end(err);
            return;
        });
})

app.post('/', (req, res) => {
    console.log('Handling Post...');
    let body = [];
    req.on('error', (err) => {
        console.error(err);
    }).on('data', function(chunk) {
        console.log("Receiving body data chunk...");
        body.push(chunk);
    }).on('end', () => {
        const s = body.join("");
        if (s === "Server Status") {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            if (global.sessionStart) {
                res.write("Server On: Session-" + global.sessionCount.toString() + "-"
                    + global.pageCounter.toString() + "-" + global.sessionTime);
                res.end();
                global.pageCounter += 1;
                console.log('Session already started...');
            } else {
                res.write("Server Off");
                res.end();
                console.log(`Session not started...`);
            }
        } else if (s.startsWith("Toggle Status")) {
            const arr = s.split(/-/g).slice(1);
            const start_timestamp = arr[0];
            console.log(start_timestamp);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            if (!global.sessionStart && global.sessionCheck) {
                global.sessionStart = !global.sessionStart;
                global.sessionCheck = false;
                res.write("Server On-" + start_timestamp.toString());
                res.end();
                console.log('Start Session...');
                global.sessionTime = start_timestamp;
                global.startTime = new Date().getTime();

                const time = Date.now();
                while ((Date.now() - time) < 2000) {
                }
                const proxy = setInterval(function() {
                    const now = new Date().getTime();
                    const seconds = Math.floor((global.startTime - now + 123000) / 1000);
                    if (seconds < 0 || global.sessionStart == false) {
                        const {execSync} = require("child_process");
                        const stdout = execSync("fuser -n tcp -k -2 " + proxy_port.toString());
                    }
                }, 1000);
            } else {
                res.write("Server Off");
                res.end();
                console.log(`End Session...`);
            }
        } else {
            console.error("Unrecognized message received");
            res.end();
        }
        console.log("Receiving data completed");
    });
});

app.put('/', (req, res) => {
    // PUT request is to receive snapshot events and recorder results
    console.log('Handling Put...');
    let body = [];
    req.on('error', (err) => {
        console.error(err);
    }).on('data', function(chunk) {
        console.log("Receiving body data chunk...");
        body.push(chunk);
    }).on('end', () => {
        const s = body.join("");
        console.log(s.slice(0, 20))
        const object = JSON.parse(s);
        const user_session = object['user_session'];
        const page_count = object['page_count'];
        console.log(user_session)
        console.log(page_count)
        if (s.startsWith('{"entire_events":')) {
            const fs = require('fs');
            const dir = __dirname + `/results/user_session${user_session}`;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            const path = dir + `/record${page_count}.json`;
            fs.writeFile(path, s, (err) => {
                // In case of an error throw err.
                if (err) throw err;
            });
        } else if (s.startsWith('{"snap":')) {
            const fs = require('fs');
            const dir = __dirname + `/results/user_session${user_session}`;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            global.snapCounter++;
            const path = dir + `/snapshot${page_count}.json`;
            fs.writeFile(path, s, (err) => {
                // In case of an error throw err.
                if (err) throw err;
            });
        } else if (s.startsWith('{"lastSnapshot":')) {
            const fs = require('fs');
            const dir = __dirname + `/results/user_session${user_session}`;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            const snapshotCount = object['snapshotCount'];
            console.log(snapshotCount);
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            const path = dir + `/lastSnapshot${page_count}_${snapshotCount}.json`;
            fs.writeFile(path, s, (err) => {
                // In case of an error throw err.
                if (err) throw err;
            });
        } else if (s.startsWith('{"nondeterminism":')){
            const fs = require('fs');
            const dir = __dirname + `/results/user_session${user_session}`;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            const path = dir + `/nondeterminism${page_count}.json`;
            fs.writeFile(path, s, (err) => {
                // In case of an error throw err.
                if (err) throw err;
            });
        } else if (s.startsWith('{"metaData":')){
            const fs = require('fs');
            const dir = __dirname + `/results/user_session${user_session}`;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            const path = dir + `/metaData${page_count}.json`;
            fs.writeFile(path, s, (err) => {
                // In case of an error throw err.
                if (err) throw err;
            });
        } else {
            console.log("Unrecognized results received");
        }
        res.end();
    });
})

app.listen(port, () => {
    console.log(`RRweb Recording Server listening on port ${port}`)
})