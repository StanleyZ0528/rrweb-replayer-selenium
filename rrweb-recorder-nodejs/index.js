const express = require('express');
const app = express();
const port = 8000;
const fs = require('fs');
const fs_promise = require('fs').promises;
global.sessionStart = false;
global.snapCounter = 0;
global.recordCounter = 0;
global.sessionCount = 0;
global.pageCounter = 0;

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
                res.write("Server On: Session " + global.sessionCount.toString());
                res.end();
                global.pageCounter += 1;
                console.log('Session already started...');
            } else {
                res.write("Server Off");
                res.end();
                console.log(`Session not started...`);
            }
        } else if (s === "Toggle Status") {
            global.sessionStart = !global.sessionStart;
            res.writeHead(200, {'Content-Type': 'text/plain'});
            if (global.sessionStart) {
                res.write("Server On");
                res.end();
                console.log('Start Session...');
                global.sessionCount += 1;
                global.snapCounter = 0;
                global.recordCounter = 0;
                global.pageCounter = 0;
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
            const dir = `results/user_session${user_session}`;
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
            const dir = `results/user_session${user_session}`;
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
            const dir = `results/user_session${user_session}`;
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
        } else {
            console.log("Unrecognized results received");
        }
        res.end();
    });
})

app.listen(port, () => {
    console.log(`RRweb Recording Server listening on port ${port}`)
})