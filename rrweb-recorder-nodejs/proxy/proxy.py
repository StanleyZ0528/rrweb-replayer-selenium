#! /usr/bin/python3
import logging
import re
from datetime import datetime
import pickle
from typing import Dict, Iterable, List, Optional, Tuple, Union
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit
from http import HTTPStatus
from http.client import HTTPMessage
from mitmproxy import ctx

class HTTPHeaders(HTTPMessage):
    """A dict-like data-structure to hold HTTP headers.
    Note that duplicate key names are permitted.
    """

    def __repr__(self):
        return repr(self.items())


class Request:
    """Represents an HTTP request."""

    def __init__(self, *, method: str, url: str, headers: Iterable[Tuple[str, str]], body: bytes = b''):
        """Initialise a new Request object.
        Args:
            method: The request method - GET, POST etc.
            url: The request URL.
            headers: The request headers as an iterable of 2-element tuples.
            body: The request body as bytes.
        """
        self.id: Optional[str] = None  # The id is set for captured requests
        self.method = method
        self.url = url
        self.headers = HTTPHeaders()

        for k, v in headers:
            self.headers.add_header(k, v)

        self.body = body
        self.response: Optional[Response] = None
        self.date: datetime = datetime.now()
        # self.ws_messages: List[WebSocketMessage] = []
        self.cert: dict = {}

    @property
    def body(self) -> bytes:
        """Get the request body.
        Returns: The request body as bytes.
        """
        return self._body

    @body.setter
    def body(self, b: bytes):
        if b is None:
            self._body = b''
        elif isinstance(b, str):
            self._body = b.encode('utf-8')
        elif not isinstance(b, bytes):
            raise TypeError('body must be of type bytes')
        else:
            self._body = b

    @property
    def querystring(self) -> str:
        """Get the query string from the request.
        Returns: The query string.
        """
        return urlsplit(self.url).query

    @querystring.setter
    def querystring(self, qs: str):
        parts = list(urlsplit(self.url))
        parts[3] = qs
        self.url = urlunsplit(parts)

    @property
    def params(self) -> Dict[str, Union[str, List[str]]]:
        """Get the request parameters.
        Parameters are returned as a dictionary. Each dictionary entry will have a single
        string value, unless a parameter happens to occur more than once in the request,
        in which case the value will be a list of strings.
        Returns: A dictionary of request parameters.
        """
        qs = self.querystring

        if self.headers.get('Content-Type') == 'application/x-www-form-urlencoded' and self.body:
            qs = self.body.decode('utf-8', errors='replace')

        return {name: val[0] if len(val) == 1 else val for name, val in parse_qs(qs, keep_blank_values=True).items()}

    @params.setter
    def params(self, p: Dict[str, Union[str, List[str]]]):
        qs = urlencode(p, doseq=True)

        if self.headers.get('Content-Type') == 'application/x-www-form-urlencoded':
            self.body = qs.encode('utf-8', errors='replace')
        else:
            parts = list(urlsplit(self.url))
            parts[3] = qs
            self.url = urlunsplit(parts)

    @property
    def path(self) -> str:
        """Get the request path.
        Returns: The request path.
        """
        return urlsplit(self.url).path

    @property
    def host(self) -> str:
        """Get the request host.
        Returns: The request host.
        """
        return urlsplit(self.url).netloc

    @path.setter
    def path(self, p: str):
        parts = list(urlsplit(self.url))
        parts[2] = p
        self.url = urlunsplit(parts)

    def create_response(
        self, status_code: int, headers: Union[Dict[str, str], Iterable[Tuple[str, str]]] = (), body: bytes = b''
    ):
        """Create a response object and attach it to this request."""
        try:
            reason = {v: v.phrase for v in HTTPStatus.__members__.values()}[status_code]
        except KeyError:
            raise ValueError('Unknown status code: {}'.format(status_code))

        if isinstance(headers, dict):
            headers = headers.items()

        self.response = Response(status_code=status_code, reason=reason, headers=headers, body=body)

    def abort(self, error_code: int = HTTPStatus.FORBIDDEN):
        """Convenience method for signalling that this request is to be terminated
        with a specific error code.
        """
        self.create_response(status_code=error_code)

    def __repr__(self):
        return 'Request(method={method!r}, url={url!r}, headers={headers!r}, body={_body!r})'.format_map(vars(self))

    def __str__(self):
        return self.url


class Response:
    """Represents an HTTP response."""

    def __init__(self, *, status_code: int, reason: str, headers: Iterable[Tuple[str, str]], body: bytes = b''):
        """Initialise a new Response object.
        Args:
            status_code: The status code.
            reason: The reason message (e.g. "OK" or "Not Found").
            headers: The response headers as an iterable of 2-element tuples.
            body: The response body as bytes.
        """
        self.status_code = status_code
        self.reason = reason
        self.headers = HTTPHeaders()

        for k, v in headers:
            self.headers.add_header(k, v)

        self.body = body
        self.date: datetime = datetime.now()
        self.cert: dict = {}

    @property
    def body(self) -> bytes:
        """Get the response body.
        Returns: The response body as bytes.
        """
        return self._body

    @body.setter
    def body(self, b: bytes):
        if b is None:
            self._body = b''
        elif isinstance(b, str):
            self._body = b.encode('utf-8')
        elif not isinstance(b, bytes):
            raise TypeError('body must be of type bytes')
        else:
            self._body = b

    def __repr__(self):
        return (
            'Response(status_code={status_code!r}, reason={reason!r}, headers={headers!r}, '
            'body={_body!r})'.format_map(vars(self))
        )

    def __str__(self):
        return '{} {}'.format(self.status_code, self.reason)




class InterceptRequestHandler:
	"""Mitmproxy add-on which is responsible for request modification
	and capture.
	"""

	def __init__(self):
		self.id2req = {}

	def requestheaders(self, flow):
		# Requests that are being captured are not streamed.
		if self.in_scope(flow.request):
			flow.request.stream = False

	def request(self, flow):
		# Convert to one of our requests for handling
		request = self._create_request(flow)

		if not self.in_scope(request):
			return
		self.id2req[request.id] = request


		if request.id is not None:  # Will not be None when captured
			flow.request.id = request.id

		# Could possibly use mitmproxy's 'anticomp' option instead of this
		flow.request.headers['Accept-Encoding'] = 'identity'

		# Remove legacy header if present
		if 'Proxy-Connection' in flow.request.headers:
			del flow.request.headers['Proxy-Connection']

		
		

	def in_scope(self, request):
		return request.method != 'OPTIONS'

	def responseheaders(self, flow):
		# Responses that are being captured are not streamed.
		if self.in_scope(flow.request):
			flow.response.stream = False

	def response(self, flow):
		# Convert the mitmproxy specific response to one of our responses
		# for handling.
		response = self._create_response(flow)
		if flow.request.id in self.id2req:
			self.id2req[flow.request.id].response = response 

		


	def _create_request(self, flow, response=None):
		request = Request(
			method=flow.request.method,
			url=flow.request.url,
			headers=[(k, v) for k, v in flow.request.headers.items()],
			body=flow.request.raw_content,
		)

		# For websocket requests, the scheme of the request is overwritten with https
		# in the initial CONNECT request so we set the scheme back to wss for capture.
		# if websockets.check_handshake(request.headers) and websockets.check_client_version(request.headers):
		# 	request.url = request.url.replace('https://', 'wss://', 1)

		request.response = response

		return request

	def _create_response(self, flow):
		response = Response(
			status_code=flow.response.status_code,
			reason=flow.response.reason,
			headers=[(k, v) for k, v in flow.response.headers.items(multi=True)],
			body=flow.response.raw_content,
		)

		cert = flow.server_conn.cert
		if cert is not None:
			print(cert)
			response.cert = dict(
				subject=cert.subject,
				serial=cert.serial,
				key=cert.keyinfo,
				# signature_algorithm=cert.x509.get_signature_algorithm(),
				expired=cert.has_expired,
				issuer=cert.issuer,
				notbefore=cert.notbefore,
				notafter=cert.notafter,
				organization=cert.organization,
				cn=cert.cn,
				altnames=cert.altnames,
			)

		return response

	def _to_headers_obj(self, headers):
		return Headers([(k.encode('utf-8'), v.encode('utf-8')) for k, v in headers.items()])

	def load(self, l):
		l.add_option(
			"out_path", str, "", "out path.",
		)

	def done(self):
		"""
			Called once on script shutdown, after any other events.
		"""
		with open(ctx.options.out_path, 'wb') as outf:
			pickle.dump(list(self.id2req.values()), outf)


	# def websocket_message(self, flow):
	#     if hasattr(flow.handshake_flow.request, 'id'):
	#         message = flow.messages[-1]
	#         ws_message = WebSocketMessage(
	#             from_client=message.from_client,
	#             content=message.content,
	#             date=datetime.fromtimestamp(message.timestamp),
	#         )

	#         self.proxy.storage.save_ws_message(flow.handshake_flow.request.id, ws_message)

	#         if message.from_client:
	#             direction = '(client -> server)'
	#         else:
	#             direction = '(server -> client)'



addons = [
	InterceptRequestHandler()
]