function ChangeNode(event) {
    console.log("Change Node:");
    console.log(event['tagName']);
    const attributes = event['attributes'];
    console.log(attributes);
    console.log(event['id']);
    const cssSelectorText = event['tagName'] + '[rrweb_id="' + event['id'].toString() + '"]';
    console.log(cssSelectorText);
    const node = document.querySelector(cssSelectorText);
    if (node == null) {
        console.warn("No Node is found");
        return;
    }
    /*const removeAttributes = (node) => {
        while (node.attributes.length > 0) {
            node.removeAttribute(node.attributes[0].name);
        }
    };*/
    const addAttributes = (node) => {
        for (const [key, value] of Object.entries(attributes)) {
            node.setAttribute(key, value);
        }
    }
}

function AddNode(event) {
    // Todo: Handle nextID, textNode's rrwebID
    console.log("Add Node:");
    console.log(event['node']);
    console.log(event['parentId']);
    console.log(event['nextId']);
    console.log(event['node']['id']);
    let node = null
    if (!('tagName' in event)) {
        const cssSelectorText = event['ancestorTagName'] + '[rrweb_id="' + event['ancestorId'].toString() + '"]';
        node = document.querySelector(cssSelectorText);
        if (node == null) {
            console.warn("No node is found");
            return;
        }
        for (let _i = 0, _a = Array.from(node.childNodes); _i < _a.length; _i++) {
            let c = _a[_i];
            if (c.nodeType === node.TEXT_NODE && c.textContent == event['textContent']) {
                node = c;
                break;
            }
        }
    }
    const cssSelectorText = event['tagName'] + '[rrweb_id="' + event['parentId'].toString() + '"]';
    node = document.querySelector(cssSelectorText);
    if (node == null) {
        console.warn("No node is found");
        return;
    }
    if ('tagName' in event['node']) {
        const newNode = document.createElement(event['node']['tagName']);
        newNode.setAttribute("rrweb_id", event['node']['id']);
        if ('attributes' in event['node']){
            const addAttributes = (newNode, event) => {
                for (const [key, value] of Object.entries(event['node']['attributes'])) {
                    newNode.setAttribute(key, value);
                }
            }
        }
        node.appendChild(newNode);
    } else if ('textContent' in event['node']) {
        /*const newNode0 = document.createElement("span");
        newNode0.setAttribute("rrweb_id", event['node']['id']);*/
        const newNode = document.createTextNode(event['node']['textContent']);
        // newNode0.appendChild(newNode);
        node.appendChild(newNode);
    } else {
        console.warn('Case not handled');
    }
}

function RemoveNode(event) {
    console.log("Remove Node:");
    console.log(event['tagName']);
    console.log(event['parentId']);
    console.log(event['id']);
    if (event['tagName'] === "") {
        const cssSelectorText = event['parentTagName'] + '[rrweb_id="' + event['parentId'].toString() + '"]';
        const node = document.querySelector(cssSelectorText);
        if (node == null) {
            console.warn("No node is found");
            return;
        }
        for (let _i = 0, _a = Array.from(node.childNodes); _i < _a.length; _i++) {
            let c = _a[_i];
            if (c.nodeType === node.TEXT_NODE) {
                node.removeChild(c);
                break;
            }
        }
        return;
    }
    const cssSelectorText = event['tagName'] + '[rrweb_id="' + event['id'].toString() + '"]';
    console.log(cssSelectorText);
    const node = document.querySelector(cssSelectorText);
    if (node == null) {
        console.warn("No Node is found");
        return;
    }
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
    node.parentNode.removeChild(node);
}

function ForbidRedirect() {
    window.addEventListener("beforeunload", (event) => {
        event.returnValue = 'Are you sure you want to leave?';
    });
}