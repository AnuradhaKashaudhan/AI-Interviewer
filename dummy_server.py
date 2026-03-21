from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class SimpleHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {'message': 'Dummy server success', 'extracted_skills': ['Python', 'Testing']}
        self.wfile.write(json.dumps(response).encode())

print("Dummy server starting on port 8000...")
httpd = HTTPServer(('0.0.0.0', 8000), SimpleHandler)
httpd.serve_forever()
