function rebuildSnapshot(filename) {
    fetch(filename)
    .then(response => {return response.json();})
    .then(data => {
        console.log(data['snap']);
        const snapshot = rrwebSnapshot.rebuild(data['snap'], { doc: document })[0];
        const rrweb_record_js = document.createElement('script');
        rrweb_record_js.setAttribute('src',
            'https://cdn.jsdelivr.net/npm/rrweb@1.1.3/dist/rrweb.min.js');
        document.head.appendChild(rrweb_record_js);
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