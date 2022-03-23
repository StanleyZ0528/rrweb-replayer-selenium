import json
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
import warnings
from selenium.webdriver.common.touch_actions import TouchActions


class EventReader:
    def __init__(self, path):
        self.driver = webdriver.Firefox()
        self.action = webdriver.ActionChains(self.driver)
        self.path = path
        self.lastTimestamp = -1
        self.element_dict = {}
        self.previousX = 0
        self.previousY = 0

    def main(self):
        with open(self.path, 'r') as f:
            fileData = json.load(f)
        pairs = fileData.items()
        for key, events in pairs:
            # print(events)
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
                    if self.lastTimestamp == -1:
                        self.lastTimestamp = timestamp
                    else:
                        time.sleep((timestamp - self.lastTimestamp) / 1000)
                        self.lastTimestamp = timestamp
                elif eventType == 4:  # Meta
                    self.handle_meta(event)
                elif eventType == 5:  # Custom
                    print(event['data'])
                else:
                    raise ValueError('Unexpected eventType')
        time.sleep(5)
        self.driver.close()

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
        print(node_data)
        self.loadDict_recursive(node_data)
        self.driver.execute_script("var rrweb_snapshot_js = document.createElement('script');"
                                   "rrweb_snapshot_js.setAttribute('src', "
                                   "'https://cdn.jsdelivr.net/npm/rrweb-snapshot@1.1.13/dist/rrweb-snapshot.js'); "
                                   "document.head.appendChild(rrweb_snapshot_js);")
        time.sleep(2)
        self.driver.execute_script("const [snap] = rrwebSnapshot.snapshot(document);"
                                   "const iframe = document.createElement('iframe');"
                                   "iframe.setAttribute('width', document.body.clientWidth);"
                                   "iframe.setAttribute('height', document.body.clientHeight);"
                                   "iframe.style.transform = 'scale(0.8)'; // mini-me"
                                   "document.body.appendChild(iframe);"
                                   "const rebuildNode = rrwebSnapshot.rebuild(snap, { doc: iframe.contentDocument })[0];"
                                   "iframe.contentDocument.querySelector('center').clientHeight;")
        print("Element Dictionary:")
        print(self.element_dict)
        return

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
        self.driver.get(href)
        self.driver.set_window_size(width, height)

    def mutation_handler(self, data):
        print("Incremental Snapshot: Handling Mutation")
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
                self.element_dict[node['id']] = node
                print(self.element_dict[node['id']])

        if attributes:
            for i in attributes:
                for key, value in i['attributes'].items():
                    self.element_dict[i['id']]['attributes'][key] = value
                print("Change Node:")
                print(self.element_dict[i['id']])

        if removes:
            for i in removes:
                print("Delete Node:")
                print(self.element_dict[i['id']])
                del self.element_dict[i['id']]
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
                self.apply_style(elements_found[0], "border: 5px solid red;")
                time.sleep(.2)
                self.apply_style(elements_found[0], original_style)
                # self.action.move_to_element(elements_found[0])
                self.action.move_by_offset(position_x - self.previousX, position_y - self.previousY).perform()
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
        print("Elements found:")
        print(elements_found)
        if input_text == '':
            return
        if len(elements_found) == 1:
            elements_found[0].send_keys(input_text[-1])
        else:
            elements_found[0].send_keys(input_text[-1])
            # raise ValueError("Cannot decide where to input")
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
        # self.action.drag_and_drop()
        return

    def styleDeclaration_handler(self, data):
        print("Incremental Snapshot: Handling Style Declaration")
        return

    def getElementById(self, currId):
        print("The information of the element trying to find:")
        element_info = self.element_dict[currId]
        print(element_info)
        element_attributes = element_info['attributes']
        elements_found_tagName = []
        elements_found_class = []
        elements_found_id = []
        elements_found_name = []
        if 'tagName' in element_info:
            elements_found_tagName = self.driver.find_elements(By.TAG_NAME, element_info['tagName'])
        if 'class' in element_attributes:
            elements_found_class = self.driver.find_elements(By.CLASS_NAME, element_attributes['class'])
        if 'id' in element_attributes:
            elements_found_id = self.driver.find_elements(By.ID, element_attributes['id'])
        if 'name' in element_attributes:
            elements_found_name = self.driver.find_elements(By.NAME, element_attributes['name'])
        elements_found = elements_found_tagName
        if elements_found_class:
            elements_found = list(set(elements_found) & set(elements_found_class))
        if elements_found_id:
            elements_found = list(set(elements_found) & set(elements_found_id))
        if elements_found_name:
            elements_found = list(set(elements_found) & set(elements_found_name))
        # print(elements_found)
        if len(elements_found) == 0:
            raise ValueError("No Element is found")
        if len(elements_found) > 1:
            warnings.warn("Multiple elements are found by the locator")
        return elements_found


eventReadInstance = EventReader('/home/stanley/Desktop/Projects/rrweb-replayer-selenium/simple-server/results'
                                '/google_events_2.json')
eventReadInstance.main()
