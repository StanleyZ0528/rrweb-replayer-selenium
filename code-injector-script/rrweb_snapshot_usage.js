// Type your JavaScript code here.
var rrweb_snapshot_js = document.createElement('script');

rrweb_snapshot_js.setAttribute('src', 'https://cdn.jsdelivr.net/npm/rrweb-snapshot@1.1.13/dist/rrweb-snapshot.js');
document.head.appendChild(rrweb_snapshot_js);

function takeSnapshot() {
    if (typeof rrwebSnapshot !== "undefined") {
        const [snap] = rrwebSnapshot.snapshot(document);
        const iframe = document.createElement('iframe');
        iframe.setAttribute('width', document.body.clientWidth)
        iframe.setAttribute('height', document.body.clientHeight)
        iframe.style.transform = 'scale(0.8)'; // mini-me
        document.body.appendChild(iframe);
        // magic here! rebuild in a new iframe
        const rebuildNode = rrwebSnapshot.rebuild(snap, { doc: iframe.contentDocument })[0];
        iframe.contentDocument.querySelector('center').clientHeight;
    } else {
        setTimeout(takeSnapshot, 250);
    }
}

takeSnapshot();