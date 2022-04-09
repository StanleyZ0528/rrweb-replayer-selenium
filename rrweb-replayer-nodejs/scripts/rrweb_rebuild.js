async function rebuildSnapshot(filename) {
    fetch(filename)
    .then(response => {return response.json();})
    .then(data => {
        console.log(data['snap']);
        rrwebSnapshot.rebuild(data['snap'], { doc: document })[0];
    })
    .catch(error => console.log('Error: ', error));
}
