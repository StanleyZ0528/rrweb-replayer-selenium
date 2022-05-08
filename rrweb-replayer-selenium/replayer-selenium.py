import json
import subprocess
from threading import Thread
import time
import multiprocessing

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from Naked.toolshed.shell import execute_js
import warnings
from os.path import exists
from selenium.webdriver.common.touch_actions import TouchActions


# Start a nodejs webpage for replay
def runServer():
    print('Starting server...\n')
    subprocess.run(["node", '../rrweb-replayer-nodejs/index.js'])
    print('Done running server...')


class EventReader:
    def __init__(self, path):
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
        # Save the timestamp of the previous incremental event
        self.lastTimestamp = -1
        # A dictionary that maps rrweb_id to element node
        self.element_dict = {}
        # Initialize the position of the mouse to (0, 0)
        self.previousX = 0
        self.previousY = 0
        self.currentPage = 0

    def main(self):
        while True:
            self.currentPage += 1
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
                        if self.lastTimestamp != -1:
                            time.sleep((timestamp - self.lastTimestamp) / 1000)
                        self.lastTimestamp = timestamp
                    elif eventType == 4:  # Meta
                        self.handle_meta(event)
                    elif eventType == 5:  # Custom
                        print(event['data'])
                    else:
                        raise ValueError('Unexpected eventType')
                    print(self.driver.current_url)
                    if self.driver.current_url != "http://localhost:5000/":
                        break
            # Save the timestamp of the previous incremental event
            # self.lastTimestamp = -1
            # A dictionary that maps rrweb_id to element node
            self.element_dict = {}
            # Initialize the position of the mouse to (0, 0)
            # self.previousX = 0
            # self.previousY = 0
            print("Page" + str(self.currentPage) + " finished")
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

    def loadDict_recursive(self, currNode):
        if 'childNodes' not in currNode:
            return
        for node in currNode['childNodes']:
            self.loadDict_recursive(node)
            if 'childNodes' in node:
                del node['childNodes']
            self.element_dict[node['id']] = node
        return

    def handle_snapshot(self, event):
        print("Handling Snapshot Event...")
        node_data = event['data']['node']
        node_data_string = json.dumps(node_data)
        # print(node_data_string)
        # f = open("~/Desktop/Projects/rrweb-replayer-selenium/simple-server/results/fullSnapshot.json", "w")
        # f.write(node_data_string)
        # f.close()
        self.loadDict_recursive(node_data)
        snapshotPath = "results/snapshot" + str(self.currentPage) + ".json"
        print(snapshotPath)
        self.driver.execute_script("rebuildSnapshot('" + snapshotPath + "');")
        # elements_found_id = self.driver.find_element(By.ID, "rrweb_rebuild_button")
        # self.action.move_to_element(elements_found_id).perform()
        # self.action.click().perform()
        self.driver.execute_script("ForbidRedirect();")
        time.sleep(.5)
        # print("Element Dictionary:")
        # print(self.element_dict)

    def handle_incrementalSnapshot(self, event):
        print("Handling IncrementalSnapshot Event...")
        data = event['data']
        timestamp = event['timestamp']
        source = data['source']
        print(event)
        if source == 0:  # Mutation
            self.mutation_handler(data)
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

    def mutation_handler(self, data):
        print("Incremental Snapshot: Handling Mutation")
        print(data)
        texts = data['texts']
        attributes = data['attributes']
        removes = data['removes']
        adds = data['adds']
        if adds:
            for i in adds:
                node = i['node']
                self.loadDict_recursive(node)
                if 'childNodes' in node:
                    del node['childNodes']
                print("Add Node:")
                if 'tagName' not in node:
                    node['tagName'] = 'span'
                self.element_dict[node['id']] = node
                print(self.element_dict[node['id']])
                aNodeInfo = dict(i)
                aNodeInfo['tagName'] = self.element_dict[i['parentId']]['tagName']
                print(self.element_dict[i['parentId']])
                print(aNodeInfo)
                print("AddNode({})".format(json.dumps(aNodeInfo)))
                self.driver.execute_script("AddNode({})".format(json.dumps(aNodeInfo)))

        if attributes:
            for i in attributes:
                for key, value in i['attributes'].items():
                    self.element_dict[i['id']]['attributes'][key] = value
                print("Change Node:")
                print(self.element_dict[i['id']])
                cNodeInfo = dict(i)
                cNodeInfo['tagName'] = self.element_dict[i['id']]['tagName']
                print(cNodeInfo)
                print("ChangeNode({})".format(json.dumps(cNodeInfo)))
                self.driver.execute_script("ChangeNode({})".format(json.dumps(cNodeInfo)))

        if removes:
            for i in removes:
                print("Delete Node:")
                print(self.element_dict[i['id']])
                rNodeInfo = dict(i)
                rNodeInfo['tagName'] = self.element_dict[i['id']]['tagName']
                del self.element_dict[i['id']]
                print(rNodeInfo)
                print("RemoveNode({})".format(json.dumps(rNodeInfo)))
                self.driver.execute_script("RemoveNode({})".format(json.dumps(rNodeInfo)))
        return

    def apply_style(self, element, s):
        self.driver.execute_script("arguments[0].setAttribute('style', arguments[1]);",
                                   element, s)

    def mouseMove_handler(self, data):
        print("Incremental Snapshot: Handling Mouse Move")
        positions = data['positions']
        for position in [positions[0], positions[-1]]:
            position_x = position['x']
            position_y = position['y']
            position_id = position['id']
            elements_found = self.getElementById(position_id)
            print("Elements found:")
            print(elements_found)
            if len(elements_found) == 1:
                original_style = elements_found[0].get_attribute('style')
                # Highlight the element that the mouse is currently hovering above
                self.apply_style(elements_found[0], "border: 3px solid red;")
                time.sleep(.2)
                self.apply_style(elements_found[0], original_style)
                self.action.move_to_element(elements_found[0])
                self.previousX = position_x
                self.previousY = position_y
            else:
                self.action.move_by_offset(position_x - self.previousX, position_y - self.previousY).perform()
                self.previousX = position_x
                self.previousY = position_y
        return

    def mouseInteraction_handler(self, data):
        print("Incremental Snapshot: Handling Mouse Interaction")
        interactionType = data['type']
        if interactionType == 0:  # Mouse Up
            print("Mouse Up")
            self.action.release().perform()
        elif interactionType == 1:  # Mouse Down
            print("Mouse Down")
            self.action.click_and_hold().perform()
        elif interactionType == 2:  # Click
            print("Click")
            self.action.click().perform()
        elif interactionType == 3:  # ContextMenu
            print("ContextMenu")
            self.action.context_click().perform()
        elif interactionType == 4:  # Double Click
            print("Double Click")
            self.action.double_click().perform()
        elif interactionType == 5:  # Focus
            print("Focus")
            self.action.click().perform()
        elif interactionType == 6:  # Blur
            print("Blur")
            self.driver.execute_script("document.activeElement ? document.activeElement.blur() : 0")
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
        elements_found = self.getElementById(input_id)
        if len(elements_found) == 0:
            raise ValueError("Cannot decide where to input")
        print("Elements found:")
        print(elements_found)
        if input_text == '':
            return
        if len(elements_found) == 1:
            elements_found[0].send_keys(input_text[-1])
        else:
            raise ValueError("Cannot decide where to input")
        return

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
        position_x_from = positions[0]['x']
        position_y_from = positions[0]['y']
        self.action.move_by_offset(position_x_from - self.previousX, position_y_from - self.previousY).perform()
        self.previousX = position_x_from
        self.previousY = position_y_from
        self.action.click_and_hold()
        position_x_to = positions[-1]['x']
        position_y_to = positions[-1]['y']
        self.action.move_by_offset(position_x_to - self.previousX, position_y_to - self.previousY).perform()
        self.previousX = position_x_to
        self.previousY = position_y_to
        self.action.release().perform()
        # Todo: use self.action.drag_and_drop() instead
        return

    def styleDeclaration_handler(self, data):
        print("Incremental Snapshot: Handling Style Declaration")
        return

    def getElementById(self, currId):
        print("The information of the element trying to find:")
        element_info = self.element_dict[currId]
        print(element_info)
        # CssSelector text that is going to be used
        cssSelectorText = element_info['tagName'] + '[rrweb_id="' + str(element_info['id']) + '"]'
        print(cssSelectorText)
        elements_found_rrwebId = self.driver.find_elements(By.CSS_SELECTOR, cssSelectorText)
        # elements_found_tagName = []
        # elements_found_class = []
        # elements_found_id = []
        # elements_found_name = []
        # if 'tagName' in element_info:
        #     elements_found_tagName = self.driver.find_elements(By.TAG_NAME, element_info['tagName'])
        # if 'class' in element_attributes:
        #     elements_found_class = self.driver.find_elements(By.CLASS_NAME, element_attributes['class'])
        # if 'id' in element_attributes:
        #     elements_found_id = self.driver.find_elements(By.ID, element_attributes['id'])
        # if 'name' in element_attributes:
        #     elements_found_name = self.driver.find_elements(By.NAME, element_attributes['name'])
        # elements_found = elements_found_tagName
        # if elements_found_class:
        #     elements_found = list(set(elements_found) & set(elements_found_class))
        # if elements_found_id:
        #     elements_found = list(set(elements_found) & set(elements_found_id))
        # if elements_found_name:
        #     elements_found = list(set(elements_found) & set(elements_found_name))
        # print(elements_found)
        if len(elements_found_rrwebId) == 0:
            # self.driver.close()
            # raise ValueError("No Element is found")
            warnings.warn("No Element is found")
        if len(elements_found_rrwebId) > 1:
            warnings.warn("Multiple elements are found by the locator")
        return elements_found_rrwebId


eventReadInstance = EventReader('../rrweb-replayer-nodejs/results/')
eventReadInstance.main()
