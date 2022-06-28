const rrweb_record_js = document.createElement('script');
rrweb_record_js.setAttribute('src',
    'https://cdn.jsdelivr.net/npm/rrweb@1.1.3/dist/record/rrweb-record.js');
document.head.appendChild(rrweb_record_js);

const rrweb_snapshot_js = document.createElement('script');
rrweb_snapshot_js.setAttribute('src',
    'https://cdn.jsdelivr.net/gh/StanleyZ0528/rrweb-replayer-selenium@0.2.0/rrweb-replayer-nodejs/scripts/rrweb_snapshot_custom.js');
document.head.appendChild(rrweb_snapshot_js);

const reanimator_js = document.createElement('script');
reanimator_js.setAttribute('src',
    'https://cdn.jsdelivr.net/gh/lawnsea/WaterfallEngineering/reanimator/dist/reanimator.js')
document.head.appendChild(reanimator_js);

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
        console.log(content);
        fetch("http://localhost:8000", {
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
                    if (time - lastTimestamp > 1000) {
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
                        fetch("http://localhost:8000", {
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

function waitForConnection() {
    // Get status of the server to check whether it is on or not
    fetch("http://localhost:8000", {
        method: 'POST',
        body: 'Server Status'
    }).then(response => response.text())
        .then(function(text) {
            console.log(text);
            if (text.startsWith("Server On")) {
                if (!first_load) {
                    alert("Recording started");
                }
                // const replaced = text.replace(/\D/g, '');
                const arr = text.split(/-/g).slice(1);
                user_session = arr[0];
                page_count = arr[1];
                server_on = true;
                console.log(user_session);
                console.log(page_count);
                // Take a snapshot of the initial page
                takeSnapshot();
                // Start rrweb recording
                startRecord();
                window.addEventListener("beforeunload", (event) => {
                    // navigator.sendBeacon("http://localhost:8000", "Beacon Test")
                    if (!server_on) {
                        return true;
                    }
                    server_on = false;
                    const nondeterminism = JSON.stringify({'nondeterminism': _log,
                        'user_session': user_session, 'page_count': page_count});
                    const eventContent = JSON.stringify({'entire_events': entire_events,
                        'user_session': user_session, 'page_count': page_count});
                    // console.log(eventContent)
                    fetch("http://localhost:8000", {
                        method: 'PUT',
                        body: nondeterminism
                    });
                    // console.log(eventContent)
                    fetch("http://localhost:8000", {
                        method: 'PUT',
                        body: eventContent
                    });
                    console.log("Entire events sent");
                    const time = Date.now();
                    while ((Date.now() - time) < 2000) {
                    }
                    return true;
                });
                // Log events every 10 seconds
                setInterval(logEvents, 10 * 1000);
                // Neither keepalive nor sendBeacon is working to send back request on page unload
            } else {
                if (first_load) {
                    first_load = false;
                    alert("Connected to the recorder server, press alt+shift+s to start recording")
                }
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
            if (text === "Server Off") {
                const nondeterminism = JSON.stringify({'nondeterminism': _log,
                    'user_session': user_session, 'page_count': page_count});
                // console.log(eventContent)
                fetch("http://localhost:8000", {
                    method: 'PUT',
                    body: nondeterminism
                });
                const eventContent = JSON.stringify({'entire_events': entire_events, 'user_session': user_session,
                    'page_count': page_count});
                // console.log(eventContent)
                fetch("http://localhost:8000", {
                    method: 'PUT',
                    body: eventContent
                }).then((response) => {
                    console.log(response);
                });
                server_on = false;
                alert("Finish Recording, wait a few seconds before you can leave the page")
            }
        });
        console.log("Toggle Session status finished");
    }
}, false);

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
    console.log(result);
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
        console.log({
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
    console.log("Date: "+date.getDate()+
        "/"+(date.getMonth()+1)+
        "/"+date.getFullYear()+
        " "+date.getHours()+
        ":"+date.getMinutes()+
        ":"+date.getSeconds());
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

capture_setInterval.id = 0;
capture_setTimeout.id = 0;
Math.random = capture_random;
setTimeout = capture_setTimeout;
setInterval = capture_setInterval;
Date = capture_Date;

waitForConnection();
