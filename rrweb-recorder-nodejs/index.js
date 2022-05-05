const http = require("http");
const host = 'localhost';
const port = 8000;
const fs = require('fs');
global.sessionStart = true;
global.counter = 0;

const requestListener = async function (req, res) {
    /*fs.readFile(__dirname + "/index.html")
        .then(contents => {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);
            res.end(contents);
        })
        .catch(err => {
            res.writeHead(500);
            res.end(err);
            return;
        });*/
    if (req.method === 'GET') {
        console.log('Handling Get...');
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
    } else if (req.method == "POST") {
        console.log('Handling Post...');
        global.counter++;
        const path = global.counter % 2 == 1 ? `results/snapshot${Math.floor((global.counter + 1) / 2)}.json` :
            `results/record${Math.floor((global.counter + 1) / 2)}.json`;
        req.on('data', function(chunk) {
            console.log("Receiving body data chunk...");
            // console.log(chunk.toString());
            fs.appendFile(path, chunk, (err) => {
                // In case of an error throw err.
                if (err) throw err;
            });
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