import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.touch_actions import TouchActions


class PythonOrgSearch(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Firefox()

    def test_search_in_python_org(self):
        driver = self.driver
        driver.get("https://www.python.org")
        action = webdriver.ActionChains(driver)
        self.assertIn("Python", driver.title)
        print(driver.title)
        print(driver.current_url)
        print(driver.get_window_size())
        elem = driver.find_element(By.NAME, "q")

        # Mouse move
        action.move_to_element(elem)
        action.perform()

        # Enter key
        elem.send_keys("pycon")

        # Double click
        action.double_click(elem)
        action.perform()

        # Set window size
        driver.set_window_size(1000, 600)
        driver.maximize_window()

        # Scroll wheel action is said to come in Selenium 4.2
        # Now just scroll the window
        driver.execute_script("window.scrollTo(0, 900);")

        # Refresh
        driver.refresh()

        # Navigate to URL
        driver.get("https://www.google.ca")
        action = webdriver.ActionChains(driver)

        # Store 'google search' button web element
        searchBtn = driver.find_element(By.LINK_TEXT, "Sign in")

        # Perform click-and-hold action on the element
        action.click(searchBtn).perform()

        # Mutation Observation

        # Navigate to url
        driver.get("https://crossbrowsertesting.github.io/drag-and-drop")
        # Store 'box A' as source element
        sourceEle = driver.find_element(By.ID, "draggable")
        # Store 'box B' as source element
        targetEle = driver.find_element(By.ID, "droppable")
        action = webdriver.ActionChains(driver)

        # Drag
        action.drag_and_drop(sourceEle, targetEle).perform()

        # Hover over Video element
        driver.get("https://www.youtube.com/")
        action = webdriver.ActionChains(driver)
        elem = driver.find_element(By.NAME, "q")
        action.move_to_element(elem)
        action.perform()

        self.assertNotIn("No results found.", driver.page_source)

    def tearDown(self):
        self.driver.close()


if __name__ == "__main__":
    unittest.main()
