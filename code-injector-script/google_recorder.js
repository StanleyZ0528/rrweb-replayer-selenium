var rrweb_js = document.createElement('script');

rrweb_js.setAttribute('src', 'https://cdn.jsdelivr.net/npm/rrweb@1.1.2/dist/record/rrweb-record.js');
document.head.appendChild(rrweb_js);

var rrweb_snapshot_js = document.createElement('script');

rrweb_snapshot_js.setAttribute('src', 'https://cdn.jsdelivr.net/gh/StanleyZ0528/rrweb-replayer-selenium@0.1.1/code-injector-script/rrweb_snapshot_custom.js');
document.head.appendChild(rrweb_snapshot_js);


let events = [];
let entire_events = [];
let interactions = [];

function takeSnapshot() {
    if (typeof rrwebSnapshot !== "undefined") {
        const [snap] = rrwebSnapshot.snapshot(document);
        const a = document.createElement("a");
        const content = JSON.stringify({ snap });
        a.href = URL.createObjectURL(new Blob([content]), {type: "text/plain"});
        a.download = "google_snapshot.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        setTimeout(takeSnapshot, 250);
    }
}

function waitForElement() {
    if (typeof rrwebRecord !== "undefined") {
        //variable exists, do what you want
        rrwebRecord({
            emit(event) {
                // push event into the events array
                const defaultLog = console.log["__rrweb_original__"] ? console.log["__rrweb_original__"] : console.log;
                defaultLog(event.data);
                events.push(event);
                entire_events.push(event);
                interactions.push(event.data.type);
            },
        });
    } else {
        setTimeout(waitForElement, 250);
    }
}

function save_events() {
    const a = document.createElement("a");
    const content = JSON.stringify({ entire_events });
    a.href = URL.createObjectURL(new Blob([content]), {type: "text/plain"});
    a.download = "google_events.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function send_events() {
    const content = JSON.stringify({ entire_events });
    fetch("http://localhost:4444", {
        method: 'POST',
        body: content,
    }).then((response) => {
        console.log(response)
    })
}

function logEvents() {
    console.log(events);
    events = [];
}
takeSnapshot();
waitForElement();
// save events every 10 seconds
setInterval(logEvents, 10 * 1000);