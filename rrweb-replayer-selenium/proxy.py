import json
from mitmproxy import http

class Interception():
	def __init__(self, dict_url_response):
		self.dict_url_response = dict_url_response

	def request(self, flow):
		try:
			url = flow.request.url
			har_response = self.dict_url_response[url]
			text = har_response["content"]["text"]
			byt = str.encode(text)
			list_headers = []
			for obj in har_response["headers"]:
				list_headers.append((str.encode(obj["name"]), str.encode(obj["value"])))
			headers = http.Headers(list_headers)
			response = http.Response(
				http_version = str.encode(har_response["httpVersion"]),
				status_code = har_response["status"],
				reason = str.encode(har_response["statusText"]),
				headers = headers,
				content = byt,
				trailers = None,
				timestamp_start = 0.,
				timestamp_end = 1.
			)

		except KeyError:
			print("Request URL not found in HAR")
			headers = http.Headers([
				(b'Content-Type', b'text/plain; charset=utf-8'),
			])
			response = http.Response(
				http_version = str.encode("http/2.0"),
				status_code = 200,
				reason = str.encode("OK"),
				headers = headers,
				content = str.encode("Request URL not found in HAR\n"),
				trailers = None,
				timestamp_start = 0.,
				timestamp_end = 1.
			)
		flow.response = response



class ReplayProxy():
	def __init__(self, path):
		self.dict_url_response = {}
		self.read_proxy(path)
		self.intercepter = Interception(self.dict_url_response)
	
	def read_proxy(self, path):
		with open(path, "r") as inf:
			data = json.load(inf)
		
		entries = data["log"]["entries"]
		for entry in entries:
			url = entry["request"]["url"]
			response = entry["response"]
			if 'cdn.jsdelivr.net/gh/StanleyZ0528/rrweb-replayer-selenium' in url:
				continue
			self.dict_url_response[url] = response
		


path_to_proxy_file = "/home/ss/Documents/adblock_tianchen/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/recordings/har.out"
p = ReplayProxy(path_to_proxy_file)


def request(flow: http.HTTPFlow) -> None:
	p.intercepter.request(flow)


