const rrweb_record_js = document.createElement('script');
rrweb_record_js.setAttribute('src',
    'https://cdn.jsdelivr.net/gh/StanleyZ0528/rrweb-replayer-selenium@latest/rrweb-scripts/rrweb_record.js');
document.head.appendChild(rrweb_record_js);

const rrweb_snapshot_js = document.createElement('script');
rrweb_snapshot_js.setAttribute('src',
    'https://cdn.jsdelivr.net/gh/StanleyZ0528/rrweb-replayer-selenium@latest/rrweb-scripts/rrweb_snapshot.js');
document.head.appendChild(rrweb_snapshot_js);

const recorder_port = 8001;

let events = [];
let entire_events = [];
let interactions = [];
let lastTimestamp = -1;
let user_session = -1;
let page_count = -1;
let server_on = false;
let first_load = true;
let lastSnapshot = {};
let snapshotCount = 0;
let checkSnapshot = false;
let metaData = {};
let start_timestamp = -1;
let connected = true;
let server_off = false;

let _native = {};
let _log = {};
_log.events = [];
_log.dates = [];
_log.localStorage = [];
_log.random = [];
_native.random = Math.random;
_native.setTimeout = setTimeout;
_native.setInterval = setInterval;
_native.Date = Date;

function takeSnapshot() {
    if (typeof rrwebSnapshot !== "undefined") {
        const [snap] = rrwebSnapshot.snapshot(document);
        const content = JSON.stringify({'snap': snap, 'user_session': user_session, 'page_count': page_count});
        fetch("http://localhost:" + recorder_port.toString(), {
            method: 'PUT',
            body: content
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
                    let time = Date.now();
                    if (time - lastTimestamp > 500) {
                        const [snap] = rrwebSnapshot.snapshot(document);
                        lastSnapshot = snap;
                        event['snap'] = snapshotCount;
                        if (entire_events[entire_events.length - 1].type === 3 &&
                            entire_events[entire_events.length - 1].data.source === 0) {
                            entire_events.pop();
                        }
                        checkSnapshot = true;
                        events.push(event);
                        entire_events.push(event);
                        interactions.push(event.data.type);
                        lastTimestamp = time;
                    }
                } else {
                    if (checkSnapshot && server_on) {
                        const snapshotContent = JSON.stringify({'lastSnapshot': lastSnapshot,
                            'user_session': user_session, 'page_count': page_count, 'snapshotCount': snapshotCount});
                        fetch("http://localhost:" + recorder_port.toString(), {
                            method: 'PUT',
                            body: snapshotContent
                        });
                        snapshotCount += 1;
                        console.log("Mutation as snapshot sent: " + snapshotCount.toString());
                    }
                    checkSnapshot = false;
                    events.push(event);
                    entire_events.push(event);
                    interactions.push(event.data.type);
                }
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

function addRecordBar() {
    const record_bar = document.createElement('div');
    record_bar.style.position = 'fixed';
    record_bar.style.backgroundColor = '#CFD8DC';
    record_bar.style.opacity = '0.8';
    record_bar.style.width = '100%';
    record_bar.style.height = '25px';
    record_bar.style.left = '5px';
    record_bar.style.top = '0px';
    record_bar.style.zIndex = '2147483647';
    record_bar.style.fontSize = 'medium';
    record_bar.style.fontWeight = 'bold';
    document.body.appendChild(record_bar);
    const counter = setInterval(function() {
        const now = new Date().getTime();
        const seconds = Math.floor((start_timestamp - now + 120000) / 1000);
        if (first_load) {
            record_bar.innerHTML = "Press alt+shift+s to start recording. Recording session will last for 120s."
        }
        else if (seconds > 0 && server_on) {
            record_bar.innerHTML = "Recording in progress: " + seconds + "s left. " +
                "Press alt+shift+k to end recording early.";
        } else {
            if (server_off) {
                record_bar.innerHTML = "Recording finished. Now you can close the page.";
            }
            if (server_on) {
                server_on = false;
                sendFinalData();
                server_off = true;
            }
            /*const time = Date.now();
            while ((Date.now() - time) < 2000) {
            }
            close();*/
        }
    }, 250);
}

function waitForConnection() {
    // Get status of the server to check whether it is on or not
    fetch("http://localhost:" + recorder_port.toString(), {
        method: 'POST',
        body: 'Server Status'
    }).then(response => response.text())
        .then(function(text) {
            if (text.startsWith("Server On")) {
                if (!connected) {
                    alert("Recording started");
                }
                connected = true;
                first_load = false;
                // const replaced = text.replace(/\D/g, '');
                const arr = text.split(/-/g).slice(1);
                user_session = arr[0];
                page_count = arr[1];
                start_timestamp = parseInt(arr[2]);
                server_on = true;
                console.log("User Session: " + user_session);
                console.log("Page Count: " + page_count);
                console.log("Start Timestamp: " + start_timestamp.toString())
                // Set initial metadata for the webpage
                setInitialMetaData();
                // Take a snapshot of the initial page
                takeSnapshot();
                // Start rrweb recording
                startRecord();
                window.addEventListener("beforeunload", (event) => {
                    if (!server_on) {
                        return true;
                    }
                    server_on = false;
                    sendFinalData();
                    const time = Date.now();
                    while ((Date.now() - time) < 1000) {
                    }
                    return true;
                });
                // Log events every 10 seconds
                setInterval(logEvents, 10 * 1000);
                // Neither keepalive nor sendBeacon is working to send back request on page unload
            } else {
                connected = false;
                setTimeout(waitForConnection, 250);
            }
        });
}

window.addEventListener('keydown', function(e){
    if (e.shiftKey && e.altKey && e.key.toLowerCase() === "s" && !server_on && first_load) {
        console.log("Shortcut Press detected");
        const now = new Date().getTime();
        const reqBody = 'Toggle Status-' + now.toString();
        fetch("http://localhost:" + recorder_port.toString(), {
            method: 'POST',
            body: reqBody
        }).then(response => response.text())
        .then(function(text) {
            console.log(text);
        });
        console.log("Toggle Session status finished");
    }
    if (e.shiftKey && e.altKey && e.key.toLowerCase() === "k" && server_on) {
        console.log("Shortcut Press detected");
        const now = new Date().getTime();
        const reqBody = 'Toggle Status-' + now.toString();
        fetch("http://localhost:" + recorder_port.toString(), {
            method: 'POST',
            body: reqBody
        }).then(response => response.text())
            .then(function(text) {
                console.log(text);
                if (text === "Server Off") {
                    sendFinalData();
                    server_off = true;
                    server_on = false;
                    alert("Finish Recording, wait a few seconds before you can leave the page")
                }
            });
        console.log("Toggle Session status finished");
    }
}, false);

function sendFinalData() {
    setFinalMetaData();
    const nondeterminism = JSON.stringify({'nondeterminism': _log,
        'user_session': user_session, 'page_count': page_count});
    const eventContent = JSON.stringify({'entire_events': entire_events,
        'user_session': user_session, 'page_count': page_count});
    const finalMetaData = JSON.stringify({'metaData': metaData,
        'user_session': user_session, 'page_count': page_count})
    fetch("http://localhost:" + recorder_port.toString(), {
        method: 'PUT',
        body: nondeterminism
    }).then((response) => {
        console.log(response);
    });
    fetch("http://localhost:" + recorder_port.toString(), {
        method: 'PUT',
        body: eventContent
    }).then((response) => {
        console.log(response);
    });
    fetch("http://localhost:" + recorder_port.toString(), {
        method: 'PUT',
        body: finalMetaData
    }).then((response) => {
        console.log(response);
    });
    console.log("Entire events sent");
}

function _Date(replaying, year, month, day, hours, minutes, seconds, ms) {
    const argsLen = arguments.length;
    let date;

    if (this instanceof Date) {
        // called as a constructor, return a Date instance
        if (argsLen < 2) {
            if (!replaying) {
                date = this._value = new _native.Date();
                _log.dates.push(_native.Date.parse(date));
            } else {
                this._value = new _native.Date(_log.dates.pop());
            }
        } else if (argsLen === 2) {
            this._value = new _native.Date(year);
        } else if (argsLen === 3) {
            this._value = new _native.Date(year, month);
        } else if (argsLen === 4) {
            this._value = new _native.Date(year, month, day);
        } else if (argsLen === 5) {
            this._value = new _native.Date(year, month, day, hours);
        } else if (argsLen === 6) {
            this._value = new _native.Date(year, month, day, hours, minutes);
        } else if (argsLen === 7) {
            this._value =
                new _native.Date(year, month, day, hours, minutes, seconds);
        } else {
            this._value =
                new _native.Date(year, month, day, hours, minutes, seconds, ms);
        }
        return this;
    } else {
        // called as a function, return the current time as a string
        if (!replaying) {
            date = _native.Date();
            _log.dates.push(_native.Date.parse(date));
        } else {
            date = (new _native.Date(_log.dates.pop())).toString();
        }
        return date;
    }
}

const global = window;

function capture_random() {
    const result = _native.random();
    _log.random.push(result);
    return result;
}

function getHandlerFn(type, fn, id) {
    return function () {
        _log.events.push({
            type: type,
            details: {
                id: id
            },
            time: _native.Date.now()
        });
        fn.apply(this, Array.prototype.slice.call(arguments));
    };
}

function capture_setTimeout(code, delay) {
    const args = Array.prototype.slice.call(arguments, 1);

    if (typeof code === 'string') {
        code = new Function(code);
    }

    return _native.setTimeout.apply(global, [
        getHandlerFn('setTimeout', code, capture_setTimeout.id++)
    ].concat(args));
}


function capture_setInterval(code, delay) {
    const args = Array.prototype.slice.call(arguments, 1);

    if (typeof code === 'string') {
        code = new Function(code);
    }

    return _native.setInterval.apply(global, [
        getHandlerFn('setInterval', code, capture_setInterval.id++)
    ].concat(args));
}

let prototypeMethods = Object.getOwnPropertyNames(global.Date.prototype);
let _Date_prototype = {};
prototypeMethods.forEach(function (method) {
    _Date_prototype[method] = function () {
        return this._value[method].
        apply(this._value, Array.prototype.slice.call(arguments));
    };
});

function capture_Date () {
    return _Date.
    apply(this, [false].concat(Array.prototype.slice.call(arguments)));
}

capture_Date.prototype = _Date_prototype;
capture_Date.UTC = global.Date.UTC.bind(global.Date);
capture_Date.parse = global.Date.parse.bind(global.Date);

capture_Date.now = function capture_Date_now () {
    const now = _native.Date.now();
    const date = new _native.Date(now);
    _log.dates.push(now);
    return now;
};

localStorage.__proto__ = Object.create(Storage.prototype);
localStorage.__proto__._getItem = localStorage.__proto__.getItem;
localStorage.__proto__.getItem = function(key) {
    const val = this._getItem(key);
    console.log("localstorage - key: " + key + " value: " + val);
    _log.localStorage.push({
        key: key,
        val: val
    })
    return val;
}

function setInitialMetaData() {
    metaData['url'] = window.location;
    metaData['userAgent'] = navigator.userAgent;
    metaData['initialTime'] = Date.now();
    metaData['title'] = document.title;
    metaData['initialWidth'] = (window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        (document.body && document.body.clientWidth));
    metaData['initialHeight'] = (window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        (document.body && document.body.clientHeight));
    metaData['initialLocalStorage'] = window.localStorage;
    metaData['initialCookie'] = document.cookie;
    metaData['userID'] = sessionStorage.getItem('SessionName');
    console.log(metaData);
}

function setFinalMetaData() {
    metaData['finalTime'] = Date.now();
    metaData['finalWidth'] = (window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        (document.body && document.body.clientWidth));
    metaData['finalHeight'] = (window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        (document.body && document.body.clientHeight));
    metaData['finalLocalStorage'] = window.localStorage;
    metaData['finalCookie'] = document.cookie;
    console.log(metaData);
}

capture_setInterval.id = 0;
capture_setTimeout.id = 0;
Math.random = capture_random;
setTimeout = capture_setTimeout;
setInterval = capture_setInterval;
Date = capture_Date;

// Add Recording Indicating Bar at the top
addRecordBar();
// Wait for connection to our recording server
waitForConnection();
