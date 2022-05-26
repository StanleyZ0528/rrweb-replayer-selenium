const http = require("http");
const host = 'localhost';
const port = 8000;
const fs = require('fs');
const fs_promise = require('fs').promises;
global.sessionStart = false;
global.snapCounter = 0;
global.recordCounter = 0;

const requestListener = async function (req, res) {
    if (req.method === 'GET') {
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
    } else if (req.method === "POST") {
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
                    res.write("Server On");
                    res.end();
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
                } else {
                    res.write("Server Off");
                    res.end();
                    console.log(`End Session...`);
                }
            } else if (s !== "") {
                console.log("Beacon received")
            }
            else {
                console.error("Unrecognized message received");
            }
            console.log("Receiving data completed");
        });
    } else if (req.method === "PUT") {
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
            if (s.startsWith('{"entire_events":')) {
                global.recordCounter++;
                const path = `results/record${global.recordCounter}.json`;
                fs.writeFile(path, s, (err) => {
                    // In case of an error throw err.
                    if (err) throw err;
                });
            } else if (s.startsWith('{"snap":')) {
                global.snapCounter++;
                const path = `results/snapshot${global.snapCounter}.json`;
                fs.writeFile(path, s, (err) => {
                    // In case of an error throw err.
                    if (err) throw err;
                });
            } else {
                console.log("Unrecognized results received");
            }
        });
    } else {
        res.writeHead(405, {'Content-Type': 'text/plain'});
        res.end('Method Not Allowed\n');
        console.log('Method not handled...');
    }
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});