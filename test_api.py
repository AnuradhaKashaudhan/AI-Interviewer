import requests
from reportlab.pdfgen import canvas
import os
pdf_path = "sample_resume.pdf"
# Create a dummy PDF
c = canvas.Canvas(pdf_path)
c.drawString(100, 750, "John Doe")
c.drawString(100, 730, "Software Engineer")
c.drawString(100, 700, "Skills:")
c.drawString(120, 680, "Python, React, FastAPI, Machine Learning, Docker")
c.drawString(100, 650, "Experience:")
c.drawString(120, 630, "Built a web app using React and FastAPI.")
c.save()

# Test the API
url = "http://localhost:8000/api/upload-resume"
files = {'file': open(pdf_path, 'rb')}
try:
    response = requests.post(url, files=files)
    print("Status Code:", response.status_code)
    import json
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error connecting to server:", e)
finally:
    files["file"].close()
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
