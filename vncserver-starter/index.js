const express = require('express');
const app = express();
const port = 8100;
const fs = require('fs');
const {execSync} = require("child_process");
const fs_promise = require('fs').promises;

app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.get('/webpage/:webpage', (req, res) => {
    function tryPort(display, webpageName) {
        const { exec } = require('child_process');
        if (display > 10) return;
        const bash_script = '~/.vnc/run.sh ' + display.toString() + ' ~/.vnc/xstartup_' + webpageName;
        console.log(bash_script);
	try {
            const {execSync} = require("child_process");
            const stdout = execSync(bash_script);
	} catch {
	    return tryPort(display+1, webpageName);
	}
        return display;
    }
    const webpageName = req.params.webpage;
    const displayNo = tryPort(2, webpageName);
    const portNo = 6080 + displayNo;
    const {execSync} = require("child_process");
    let ipAddr = execSync("hostname -I | awk '{print $1}'", { encoding: 'utf-8' });
    ipAddr = ipAddr.replace(/(\r\n|\n|\r)/gm, "");
    console.log(ipAddr);
    /*fs_promise.readFile(__dirname + "/index.html")
        .then(contents => {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);
            res.locals.port=port;
            res.write(contents);
            res.end();
        })
        .catch(err => {
            res.writeHead(500);
            res.end(err);
        });*/
    res.render(__dirname + "/index.html", {portNo: portNo, ipAddr: ipAddr})
})

app.listen(port, () => {
    console.log(`RRweb Recording Server listening on port ${port}`)
})
