const express = require('express');
const app = express();
const port = parseInt(process.argv.slice(2)[0]);
const fs = require('fs');
const fs_promise = require('fs').promises;
if (!fs.existsSync('results/count.txt')) {
    console.log("Creating new file to save user session count...");
    fs.writeFileSync('results/count.txt', "0");
    global.sessionCount = 0;
    console.log("User session Count: " + global.sessionCount.toString());
} else {
    console.log("Getting user session count...");
    const data = fs.readFileSync('results/count.txt',
        {encoding:'utf8', flag:'r'});
    global.sessionCount = parseInt(data);
    console.log("User session Count: " + global.sessionCount.toString());
}
global.sessionStart = false;
global.snapCounter = 0;
global.recordCounter = 0;
global.pageCounter = 0;
global.sessionTimeMap = new Map();

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
                    + global.pageCounter.toString() + "-" + global.sessionTimeMap.get(global.sessionCount));
                res.end();
                global.pageCounter += 1;
                console.log('Session already started...');
            } else {
                res.write("Server Off");
                res.end();
                console.log(`Session not started...`);
            }
        } else if (s.startsWith("Toggle Status")) {
            global.sessionStart = !global.sessionStart;
            const arr = s.split(/-/g).slice(1);
            const start_timestamp = arr[0];
            console.log(start_timestamp);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            if (global.sessionStart) {
                res.write("Server On-" + start_timestamp.toString());
                res.end();
                console.log('Start Session...');
                const data = fs.readFileSync('results/count.txt',
                    {encoding:'utf8', flag:'r'});
                global.sessionCount = parseInt(data) + 1;
                fs.writeFileSync('results/count.txt', global.sessionCount.toString());
                global.sessionTimeMap.set(global.sessionCount, start_timestamp);
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
            const dir = `results/user_session${user_session}`;
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
            const dir = `results/user_session${user_session}`;
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