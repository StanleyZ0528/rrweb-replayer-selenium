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
        console.log("No Node is found");
        return;
    }
    const removeAttributes = (node) => {
        while (node.attributes.length > 0) {
            node.removeAttribute(node.attributes[0].name);
        }
    };
    const addAttributes = (node) => {
        for (const [key, value] of Object.entries(attributes)) {
            node.setAttribute(key, value);
        }
    }
}

function AddNode(event) {
    // Todo: Handle nextID, textNode's rrwebID
    console.log("Add Node:");
    console.log(event['tagName']);
    console.log(event['node']);
    console.log(event['parentId']);
    console.log(event['nextId']);
    console.log(event['node']['id']);
    const cssSelectorText = event['tagName'] + '[rrweb_id="' + event['parentId'].toString() + '"]';
    const node = document.querySelector(cssSelectorText);
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
        const newNode0 = document.createElement("span");
        newNode0.setAttribute("rrweb_id", event['node']['id']);
        const newNode = document.createTextNode(event['node']['textContent']);
        // newNode.setAttribute("rrweb_id", event['node']['id']);
        newNode0.appendChild(newNode);
        node.appendChild(newNode0);
    } else {
        console.log('Case not handled');
    }
}

function RemoveNode(event) {
    console.log("Remove Node:");
    console.log(event['tagName']);
    console.log(event['parentId']);
    console.log(event['id']);
    const cssSelectorText = event['tagName'] + '[rrweb_id="' + event['id'].toString() + '"]';
    console.log(cssSelectorText);
    const node = document.querySelector(cssSelectorText);
    if (node == null) {
        console.log("No Node is found");
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