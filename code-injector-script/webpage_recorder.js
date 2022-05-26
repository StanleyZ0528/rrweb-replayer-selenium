const rrweb_record_js = document.createElement('script');
rrweb_record_js.setAttribute('src',
    'https://cdn.jsdelivr.net/npm/rrweb@1.1.3/dist/record/rrweb-record.js');
document.head.appendChild(rrweb_record_js);

const rrweb_snapshot_js = document.createElement('script');
rrweb_snapshot_js.setAttribute('src',
    'https://cdn.jsdelivr.net/gh/StanleyZ0528/rrweb-replayer-selenium@0.2.0/rrweb-replayer-nodejs/scripts/rrweb_snapshot_custom.js');
document.head.appendChild(rrweb_snapshot_js);

let events = [];
let entire_events = [];
let interactions = [];

function takeSnapshot() {
    if (typeof rrwebSnapshot !== "undefined") {
        const [snap] = rrwebSnapshot.snapshot(document);
        const content = JSON.stringify({ snap });
        console.log(content);
        fetch("http://localhost:8000", {
            method: 'PUT',
            body: content,
        }).then((response) => {
            console.log(response)
        });
    } else {
        setTimeout(takeSnapshot, 250);
    }
}

function startRecord() {
    if (typeof rrwebRecord !== "undefined" && typeof rrwebSnapshot !== "undefined") {
        rrwebRecord({
            emit(event) {
                if (event.type === 3 &&
                    event.data.source === 0 ||
                    event.type === 2) {
                    const [snap] = rrwebSnapshot.snapshot(document);
                    event.data['snap'] = snap;
                    if (entire_events[entire_events.length - 1].type === 3 &&
                        entire_events[entire_events.length - 1].data.source === 0) {
                        entire_events.pop();
                    }
                }
                events.push(event);
                entire_events.push(event);
                interactions.push(event.data.type);
            },
        });
    } else {
        setTimeout(startRecord, 250);
    }
}

function logEvents() {
    // Log events for the past 10 secs
    console.log(events);
    events = [];
}

function waitForConnection() {
    // Get status of the server to check whether it is on or not
    fetch("http://localhost:8000", {
        method: 'POST',
        body: 'Server Status'
    }).then(response => response.text())
        .then(function(text) {
            console.log(text);
            if (text == "Server On") {
                // Take a snapshot of the initial page
                takeSnapshot();
                // Start rrweb recording
                startRecord();
                window.addEventListener("beforeunload", (event) => {
                    // navigator.sendBeacon("http://localhost:8000", "Beacon Test")
                    const eventContent = JSON.stringify({entire_events});
                    // console.log(eventContent)
                    fetch("http://localhost:8000", {
                        method: 'PUT',
                        body: eventContent
                    }).then((response) => {
                        console.log(response);
                    });
                    const time = Date.now();
                    while ((Date.now() - time) < 5000) {
                    }
                    event.returnValue = "Data transfer failed";
                    return "Data transfer failed";
                });
                // Log events every 10 seconds
                setInterval(logEvents, 10 * 1000);
                // Neither keepalive nor sendBeacon is working to send back request on page unload
            } else {
                setTimeout(waitForConnection, 250);
            }
        });
}

window.addEventListener('keydown', function(e){
    if (e.shiftKey && e.altKey && e.key.toLowerCase() === "s") {
        console.log("Shortcut Press detected");
        fetch("http://localhost:8000", {
            method: 'POST',
            body: 'Toggle Status'
        }).then(response => response.text())
        .then(function(text) {
            console.log(text);
        });
        console.log("Toggle Session status finished");
    }
}, false);
waitForConnection();