function rebuildSnapshot(filename) {
    fetch(filename)
    .then(response => {return response.json();})
    .then(data => {
        console.log(data['snap']);
        let snap = {};
        if ('snap' in data) {
            snap = data['snap'];
        } else if ('lastSnapshot' in data) {
            snap = data['lastSnapshot'];
        }
        const rrweb_snapshot_js = document.createElement('script');
        rrweb_snapshot_js.setAttribute('src',
            'scripts/rrweb-snapshot.js');
        document.head.appendChild(rrweb_snapshot_js);
        const rrweb_record_js = document.createElement('script');
        rrweb_record_js.setAttribute('src',
            'scripts/rrweb.min.js');
        document.head.appendChild(rrweb_record_js);
        const snapshot = rrwebSnapshot.rebuild(snap, { doc: document })[0];
    })
    .catch(error => console.log('Error: ', error));
}

function rrwebReplay(filename) {
    fetch(filename)
        .then(response => {return response.json();})
        .then(data => {
            const events = data['entire_events'];
            console.log(events);
            const replay = new rrweb.Replayer(events);
            replay.play();
        })
        .catch(error => console.log('Error: ', error));
}