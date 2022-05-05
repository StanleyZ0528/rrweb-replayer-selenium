const rrweb_record_js = document.createElement('script');
rrweb_record_js.setAttribute('src',
    'https://cdn.jsdelivr.net/npm/rrweb@1.1.2/dist/record/rrweb-record.js');
document.head.appendChild(rrweb_record_js);

const rrweb_snapshot_js = document.createElement('script');
rrweb_snapshot_js.setAttribute('src',
    'https://cdn.jsdelivr.net/gh/StanleyZ0528/rrweb-replayer-selenium@0.1.1/code-injector-script/rrweb_snapshot_custom.js');
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
            method: 'POST',
            body: content,
        }).then((response) => {
            console.log(response)
        });
    } else {
        setTimeout(takeSnapshot, 250);
    }
}

function startRecord() {
    if (typeof rrwebRecord !== "undefined") {
        rrwebRecord({
            emit(event) {
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
        method: 'GET'
    }).then(response => response.text())
    .then(function(text) {
        console.log(text);
        if (text == "Server On") {
            // Take a snapshot of the initial page
            takeSnapshot();
            // Start rrweb recording
            startRecord();
            window.addEventListener("beforeunload", (event) => {
                const eventContent = JSON.stringify({entire_events});
                console.log(eventContent)
                fetch("http://localhost:8000", {
                    method: 'POST',
                    body: eventContent,
                }).then((response) => {
                    console.log(response)
                });
                const time = Date.now();
                while ((Date.now() - time) < 1500) {
                }
                return true;
                // event.returnValue = 'Are you sure you want to leave?';
            });
            // Log events every 10 seconds
            setInterval(logEvents, 10 * 1000);
            // Todo: neither keepalive nor sendBeacon is working to send back request on page unload
            /*document.addEventListener('visibilitychange', function sendEvents() {
                if (document.visibilityState === 'hidden') {
                    const content = JSON.stringify({entire_events});
                    navigator.sendBeacon("http://localhost:8000", content);
                }
            });*/
        } else {
            setTimeout(waitForConnection, 250);
        }
    });
}

waitForConnection();