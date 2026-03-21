import pdfplumber
import os

def test_pdf_parsing():
    filepath = r"c:\Users\Anuradha Kashaudhan\OneDrive\Desktop\AI-Mock-Interviewer\data\resumes\sample_resume.pdf"
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    print(f"Opening PDF: {filepath}")
    try:
        with pdfplumber.open(filepath) as pdf:
            print(f"Pages: {len(pdf.pages)}")
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                print(f"--- Page {i+1} ---")
                if text:
                    print(f"Extracted {len(text)} characters")
                    print(text[:200] + "...")
                else:
                    print("No text extracted from this page.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_pdf_parsing()
