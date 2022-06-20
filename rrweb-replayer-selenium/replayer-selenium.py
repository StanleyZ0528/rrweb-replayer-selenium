import subprocess
import time
import multiprocessing

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import warnings
from os.path import exists
import json


# Start a nodejs webpage for replay
def runServer():
    print('Starting server...\n')
    subprocess.run(["node", '../rrweb-replayer-nodejs/index.js'])
    print('Done running server...')


class EventReader:
    def __init__(self, path, user_session):
        # Use subprocess to start a localhost webpage for replay
        self.server = multiprocessing.Process(target=runServer)
        self.server.start()
        # Disable webSecurity option for replay
        options = Options()
        options.add_argument('--disable-web-security')
        # Using Chrome to do the replay for now
        self.driver = webdriver.Chrome(options=options)
        self.action = webdriver.ActionChains(self.driver)
        # Path to rrweb recording result
        self.path = path
        # Which user session to replay
        self.user_session = user_session
        # Path to create a file that will be temporarily used to recreate snapshot
        self.writePath = path + 'snapshot.json'
        # Save the timestamp of the previous incremental event
        self.lastTimestamp = -1
        # A dictionary that maps rrweb_id to element node
        self.element_dict = {}
        # Current page number
        self.currentPage = 0
        # Current snapshot number
        self.currentSnapshot = 0
        # Count the mutation event number
        self.mutationCounter = 0
        # source of the previous URL
        self.lastSource = ""
        self.lastSnap = {}
        self.newSnapshot = False

    def main(self):
        while True:
            # Load the path for the set of recorded events
            recordPath = self.path + "record" + str(self.currentPage) + ".json"
            print(recordPath)
            if not exists(recordPath):
                break
            with open(recordPath, 'r') as f:
                fileData = json.load(f)
            pairs = fileData.items()
            for key, events in pairs:
                for event in events:
                    eventType = event['type']
                    if eventType == 0:  # DomContentLoaded
                        self.handle_domContentLoaded(event)
                    elif eventType == 1:  # Load
                        self.handle_load(event)
                    elif eventType == 2:  # FullSnapshot
                        self.handle_snapshot(event)
                    elif eventType == 3:  # IncrementalSnapshot
                        self.handle_incrementalSnapshot(event)
                        timestamp = event['timestamp']
                        # if self.lastTimestamp != -1:
                        #     time.sleep((timestamp - self.lastTimestamp) / 1000)
                        self.lastTimestamp = timestamp
                    elif eventType == 4:  # Meta
                        self.handle_meta(event)
                    elif eventType == 5:  # Custom
                        print(event['data'])
                    else:
                        raise ValueError('Unexpected eventType')
                    print(self.driver.current_url)
                    # Replay server running on port 5000
                    if self.driver.current_url != "http://localhost:5000/":
                        break
                break
            # Save the timestamp of the previous incremental event
            # self.lastTimestamp = -1
            # A dictionary that maps rrweb_id to element node
            self.element_dict = {}
            print("Page" + str(self.currentPage) + " finished")
            self.mutationCounter = 0
            self.currentPage += 1
            time.sleep(1)
        time.sleep(5)
        self.driver.close()
        self.server.terminate()

    def handle_domContentLoaded(self, event):
        print("Handling DomContentLoaded Event...")
        print(event)
        return

    def handle_load(self, event):
        print("Handling Load Event...")
        print(event)
        return

    # Load the dictionary of all DOM nodes indexed by rrweb id for locating elements
    def loadDict_recursive(self, currNode):
        if 'childNodes' not in currNode:
            return
        for node in currNode['childNodes']:
            self.loadDict_recursive(node)
            node_copy = dict(node)
            if 'childNodes' in node_copy:
                del node_copy['childNodes']
            self.element_dict[node_copy['id']] = node_copy
            # For textNode since there is no tagName, save the id of its parent node
            if 'tagName' not in node_copy and 'textContent' in node_copy:
                self.element_dict[node_copy['id']]['parentId'] = currNode['id']
        return

    def handle_snapshot(self, event):
        print("Handling Snapshot Event...")
        snapshotPath = "results/user_session" + str(self.user_session) + "/snapshot" + str(self.currentSnapshot) \
                       + ".json"
        print(snapshotPath)
        snapshotFilePath = self.path + "snapshot" + str(self.currentSnapshot) + ".json"
        self.currentSnapshot += 1
        with open(snapshotFilePath, 'r') as f:
            fileData = json.load(f)
        pairs = fileData.items()
        self.element_dict = {}
        for key, events in pairs:
            self.loadDict_recursive(events)
        self.driver.execute_script("rebuildSnapshot('" + snapshotPath + "');")
        # self.driver.execute_script("ForbidRedirect();")
        time.sleep(.5)

    def handle_mutation_as_snapshot(self, data):
        print("Handling Mutation Event as Snapshot")
        # self.lastSnap = data['snap']
        # snapshot = {"snap": self.lastSnap}
        # with open(self.writePath, 'w') as f:
        #     json.dump(snapshot, f, ensure_ascii=False)
        # self.newSnapshot = False
        snapshotPath = "results/user_session" + str(self.user_session) + "/lastSnapshot" + str(self.currentPage) + \
                       "_" + str(self.mutationCounter) + ".json"
        print(snapshotPath)
        self.driver.execute_script("rebuildSnapshot('" + snapshotPath + "');")
        # Check if mutation event changes the previous snapshot
        snapshotFilePath = self.path + "lastSnapshot" + str(self.currentPage) + "_" + str(self.mutationCounter) + ".json"
        print(snapshotFilePath)
        with open(snapshotFilePath, 'r') as f:
            fileData = json.load(f)
        pairs = fileData.items()
        self.element_dict = {}
        for key, events in pairs:
            self.loadDict_recursive(events)
            break
        newSource = self.driver.page_source
        if newSource != self.lastSource:
            print("Mutation occurs: " + str(self.mutationCounter))
            # self.element_dict = {}
            # self.loadDict_recursive(self.lastSnap)
        else:
            warnings.warn("No mutation from snapshot:" + str(self.mutationCounter))
        self.mutationCounter += 1
        self.lastSource = newSource

    def rebuild_snapshot(self):
        snapshotPath = "results/user_session" + str(self.user_session) + "/snapshot.json"
        self.driver.execute_script("rebuildSnapshot('" + snapshotPath + "');")
        # Check if mutation event changes the previous snapshot
        newSource = self.driver.page_source
        if newSource != self.lastSource:
            print("Mutation occurs: " + str(self.mutationCounter))
            self.element_dict = {}
            self.loadDict_recursive(self.lastSnap)
        else:
            warnings.warn("No mutation from snapshot:" + str(self.mutationCounter))
        self.mutationCounter += 1
        self.lastSource = newSource
        self.newSnapshot = False

    def handle_incrementalSnapshot(self, event):
        print("Handling IncrementalSnapshot Event...")
        data = event['data']
        timestamp = event['timestamp']
        source = data['source']
        if source == 0:  # Mutation
            self.handle_mutation_as_snapshot(data)
        elif source == 1:  # MouseMove
            self.mouseMove_handler(data)
        elif source == 2:  # MouseInteraction
            self.mouseInteraction_handler(data)
        elif source == 3:  # Scroll
            self.scroll_handler(data)
        elif source == 4:  # ViewportSize
            self.viewportSize_handler(data)
        elif source == 5:  # Input
            self.input_handler(data)
        elif source == 6:  # TouchMove
            self.touchMove_handler(data)
        elif source == 7:  # MediaInteraction
            self.mediaInteraction_handler(data)
        elif source == 8:  # StyleSheetRule
            self.styleSheetRule_handler(data)
        elif source == 9:  # CanvasMutation
            self.canvasMutation_handler(data)
        elif source == 10:  # Font
            self.font_handler(data)
        elif source == 11:  # Log
            self.log_handler(data)
        elif source == 12:  # Drag
            self.drag_handler(data)
        elif source == 13:  # StyleDeclaration
            self.styleDeclaration_handler(data)
        else:
            raise ValueError("Unknown source for Incremental Snapshot")

    def handle_meta(self, event):
        print("Handling Meta Event...")
        print(event)
        data = event['data']
        href = data['href']
        width = data['width']
        height = data['height']
        # self.driver.get(href)
        self.driver.get("http://localhost:5000")
        self.driver.set_window_size(width, height)
        time.sleep(.5)

    # def addNode_recursive(self, currNode, parentId):
    #     if 'childNodes' not in currNode:
    #         return
    #     node_list = []
    #     for node in currNode['childNodes']:
    #         node_list.append(node)
    #         node_copy = dict(node)
    #         if 'childNodes' in node_copy:
    #             del node_copy['childNodes']
    #         if 'tagName' not in node and 'textContent' not in node:
    #             continue
    #         print("Add Node:")
    #         if 'tagName' not in node and 'textContent' in node:
    #             node_copy['parentId'] = currNode['id']
    #         self.element_dict[node_copy['id']] = node_copy
    #         print(self.element_dict[node_copy['id']])
    #         print(parentId)
    #         print(self.element_dict[parentId])
    #         aNodeInfo = {'node': node_copy, 'parentId': currNode['id'], 'nextId': None}
    #         if 'tagName' in self.element_dict[currNode['id']]:
    #             aNodeInfo['tagName'] = self.element_dict[currNode['id']]['tagName']
    #         elif 'parentId' in self.element_dict[currNode['id']]:
    #             aNodeInfo['ancestorTagName'] = \
    #                 self.element_dict[self.element_dict[currNode['id']]['parentId']]['tagName']
    #             aNodeInfo['ancestorId'] = self.element_dict[self.element_dict[currNode['id']]['parentId']]
    #             aNodeInfo['textContent'] = self.element_dict[currNode['id']['textContent']]
    #         else:
    #             warnings.warn("Can not find parent of adding node")
    #             return
    #         print(self.element_dict[parentId])
    #         print(aNodeInfo)
    #         print("AddNode({})".format(json.dumps(aNodeInfo)))
    #         self.driver.execute_script("AddNode({})".format(json.dumps(aNodeInfo)))
    #     for node in node_list:
    #         self.addNode_recursive(node, currNode['id'])
    #     return
    #
    # def mutation_handler(self, data):
    #     print("Incremental Snapshot: Handling Mutation")
    #     # print(data)
    #     texts = data['texts']
    #     attributes = data['attributes']
    #     removes = data['removes']
    #     adds = data['adds']
    #     if adds:
    #         for i in adds:
    #             node = i['node']
    #             self.loadDict_recursive(node)
    #             node_copy = dict(node)
    #             if 'childNodes' in node_copy:
    #                 del node_copy['childNodes']
    #             if 'tagName' not in node and 'textContent' not in node:
    #                 continue
    #             print("Add Node:")
    #             if 'tagName' not in node and 'textContent' in node:
    #                 node_copy['parentId'] = i['parentId']
    #             self.element_dict[node_copy['id']] = node_copy
    #             print(self.element_dict[node_copy['id']])
    #             parentId = i['parentId']
    #             print(parentId)
    #             print(self.element_dict[parentId])
    #             aNodeInfo = {'node': node_copy, 'parentId': parentId, 'nextId': None}
    #             if 'tagName' in self.element_dict[parentId]:
    #                 aNodeInfo['tagName'] = self.element_dict[parentId]['tagName']
    #             elif 'parentId' in self.element_dict[parentId]:
    #                 aNodeInfo['ancestorTagName'] = \
    #                     self.element_dict[self.element_dict[parentId]['parentId']]['tagName']
    #                 aNodeInfo['ancestorId'] = self.element_dict[self.element_dict[parentId]['parentId']]
    #                 aNodeInfo['textContent'] = self.element_dict[parentId]['textContent']
    #             else:
    #                 warnings.warn("Can not find parent of adding node")
    #                 return
    #             print(self.element_dict[parentId])
    #             print(aNodeInfo)
    #             print("AddNode({})".format(json.dumps(aNodeInfo)))
    #             self.driver.execute_script("AddNode({})".format(json.dumps(aNodeInfo)))
    #             self.addNode_recursive(node, i['parentId'])
    #
    #     if attributes:
    #         for i in attributes:
    #             print(i)
    #             if i['id'] not in self.element_dict or 'tagName' not in i:
    #                 continue
    #             print(self.element_dict[i['id']])
    #             for key, value in i['attributes'].items():
    #                 if 'attributes' not in self.element_dict[i['id']]:
    #                     self.element_dict[i['id']]['attributes'] = {}
    #                 self.element_dict[i['id']]['attributes'][key] = value
    #             print("Change Node:")
    #             print(self.element_dict[i['id']])
    #             cNodeInfo = dict(i)
    #             cNodeInfo['tagName'] = self.element_dict[i['id']]['tagName']
    #             print(cNodeInfo)
    #             print("ChangeNode({})".format(json.dumps(cNodeInfo)))
    #             self.driver.execute_script("ChangeNode({})".format(json.dumps(cNodeInfo)))
    #
    #     if removes:
    #         for i in removes:
    #             if i['id'] not in self.element_dict:
    #                 continue
    #             print("Delete Node:")
    #             print(self.element_dict[i['id']])
    #             rNodeInfo = dict(i)
    #             if 'tagName' in self.element_dict[i['id']]:
    #                 rNodeInfo['tagName'] = self.element_dict[i['id']]['tagName']
    #             else:
    #                 if 'tagName' not in self.element_dict[i['parentId']]:
    #                     del self.element_dict[i['id']]
    #                     continue
    #                 rNodeInfo['tagName'] = ""
    #                 rNodeInfo['parentTagName'] = self.element_dict[i['parentId']]['tagName']
    #             del self.element_dict[i['id']]
    #             print(rNodeInfo)
    #             print("RemoveNode({})".format(json.dumps(rNodeInfo)))
    #             self.driver.execute_script("RemoveNode({})".format(json.dumps(rNodeInfo)))
    #     return

    def apply_style(self, element, s):
        self.driver.execute_script("arguments[0].setAttribute('style', arguments[1]);", element, s)

    def mouseMove_handler(self, data):
        print("Incremental Snapshot: Handling Mouse Move")
        positions = data['positions']
        for position in [positions[0], positions[-1]]:
            position_x = position['x']
            position_y = position['y']
            position_id = position['id']
            element = self.getElementById(position_id)
            if element is None and self.newSnapshot is True:
                self.rebuild_snapshot()
                element = self.getElementById(position_id)
                print("No element is found, ignore mouse move")
                continue
            if element is None:
                warnings.warn("No element is found, ignore mouse move")
                continue
            print("Element found:")
            print(element)
            # original_style = element.get_attribute('style')
            # # Highlight the element that the mouse is currently hovering above
            # self.apply_style(element, "border: 3px solid red;")
            # time.sleep(.2)
            # self.apply_style(element, original_style)
            try:
                self.action.move_to_element(element).perform()
            except:
                print("Can't move to this element")
        return

    def mouseInteraction_handler(self, data):
        print("Incremental Snapshot: Handling Mouse Interaction")
        print(data)
        interactionType = data['type']
        position_id = data['id']
        element = self.getElementById(position_id)
        if element is None and self.newSnapshot is True:
            self.rebuild_snapshot()
            element = self.getElementById(position_id)
            print("No element is found, ignore mouse interaction")
            return
        if element is None:
            print("No element is found, ignore mouse interaction")
            return
        original_style = element.get_attribute('style')
        self.apply_style(element, "border: 3px solid red;")
        time.sleep(.2)
        self.apply_style(element, original_style)
        return
        if interactionType == 0:  # Mouse Up
            print("Mouse Up")
            self.action.move_to_element(element)
            self.action.release().perform()
        elif interactionType == 1:  # Mouse Down
            print("Mouse Down")
            self.action.move_to_element(element)
            self.action.click_and_hold().perform()
        elif interactionType == 2:  # Click
            print("Click")
            self.action.move_to_element(element)
            self.action.click().perform()
        elif interactionType == 3:  # ContextMenu
            print("ContextMenu")
            self.action.context_click().perform()
        elif interactionType == 4:  # Double Click
            print("Double Click")
            self.action.double_click().perform()
        elif interactionType == 5:  # Focus
            print("Focus")
            self.action.move_to_element(element)
            self.action.click().perform()
        elif interactionType == 6:  # Blur
            print("Blur")
            self.driver.execute_script("document.activeElement ? document.activeElement.blur() : 0")
        # Touch moves are not currently handled
        elif interactionType == 7:  # Touch Start
            print("Touch Start")
        elif interactionType == 8:  # TouchMove Departed
            print("TouchMove Departed")
        elif interactionType == 9:  # Touch End
            print("Touch End")
        elif interactionType == 10:  # Touch Cancel
            print("Touch Cancel")
        else:
            raise ValueError("Unrecognized mouse interation type")
        return

    def scroll_handler(self, data):
        print("Incremental Snapshot: Handling Scroll")
        scroll_to_x = data['x']
        scroll_to_y = data['y']
        self.driver.execute_script("window.scrollTo(" + str(scroll_to_x) + ", " + str(scroll_to_y) + ");")
        return

    def viewportSize_handler(self, data):
        print("Incremental Snapshot: Handling ViewPostSize")
        viewport_width = data['width']
        viewport_height = data['height']
        self.driver.set_window_size(viewport_width, viewport_height)
        return

    def input_handler(self, data):
        print("Incremental Snapshot: Handling Input")
        input_text = data['text']
        input_isChecked = data['isChecked']
        input_id = data['id']
        element = self.getElementById(input_id)
        if element is None:
            warnings.warn("Cannot decide where to input")
            return
        print("Element found:")
        print(element)
        if 'attributes' in self.element_dict[input_id] and 'type' in self.element_dict[input_id]['attributes'] and \
                self.element_dict[input_id]['attributes']['type'] == 'hidden':
            print("Do not need to handle hidden input")
            return
        self.driver.execute_script("arguments[0].value=arguments[1]", element, input_text)

    def touchMove_handler(self, data):
        print("Incremental Snapshot: Handling Touch Move")
        return

    def mediaInteraction_handler(self, data):
        print("Incremental Snapshot: Handling Media Interaction")
        media_type = data['type']
        media_id = data['id']
        media_currentTime = data['currentTime']  # Optional
        media_volume = data['volume']  # Optional
        muted = data['muted']  # Optional
        return

    def styleSheetRule_handler(self, data):
        print("Incremental Snapshot: Handling StyleSheetRule")
        return

    def canvasMutation_handler(self, data):
        print("Incremental Snapshot: Handling Canvas Mutation")
        return

    def font_handler(self, data):
        print("Incremental Snapshot: Handling Font")
        return

    def log_handler(self, data):
        print("Incremental Snapshot: Handling Log")
        return

    def drag_handler(self, data):
        print("Incremental Snapshot: Handling Drag")
        positions = data['positions']
        position_id_from = positions[0]['id']
        element_from = self.getElementById(position_id_from)
        if element_from is None:
            print("From element is not found, ignore drag")
        position_id_to = positions[-1]['id']
        element_to = self.getElementById(position_id_to)
        if element_to is None:
            print("To element is not found, ignore drag")
            return
        self.action.drag_and_drop(element_from, element_to)
        # Todo: use self.action.drag_and_drop() instead
        return

    def styleDeclaration_handler(self, data):
        print("Incremental Snapshot: Handling Style Declaration")
        return

    def getElementById(self, currId):
        print("The information of the element trying to find:")
        if currId not in self.element_dict:
            warnings.warn("Can not find element in the dictionary")
            return None
        element_info = self.element_dict[currId]
        print(element_info)
        while 'tagName' not in element_info:
            if 'parentId' not in element_info:
                warnings.warn("Can not locate this element")
                return None
            element_info = self.element_dict[element_info['parentId']]
            print("Getting parent node of text node:")
            print(element_info)
        # CssSelector text that is going to be used
        cssSelectorText = element_info['tagName'] + '[rrweb_id="' + str(element_info['id']) + '"]'
        print(cssSelectorText)
        elements_found_rrwebId = self.driver.find_elements(By.CSS_SELECTOR, cssSelectorText)
        if len(elements_found_rrwebId) == 0:
            warnings.warn("No Element is found")
            return None
        if len(elements_found_rrwebId) > 1:
            warnings.warn("Multiple elements are found by the locator")
            print(elements_found_rrwebId)
            return elements_found_rrwebId[0]
        return elements_found_rrwebId[0]


user_session_to_replay = 1
eventReadInstance = EventReader('../rrweb-replayer-nodejs/results/user_session' + str(user_session_to_replay) + '/',
                                user_session_to_replay)
eventReadInstance.main()
