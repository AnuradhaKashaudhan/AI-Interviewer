import pdfplumber

def extract_text_from_pdf(filepath: str) -> str:
    """
    Extracts text from a clear PDF file.
    
    Args:
        filepath (str): Path to the PDF file.
        
    Returns:
        str: Extracted text.
    """
    extracted_text = ""
    try:
        print(f"DEBUG: Opening PDF at {filepath}")
        with pdfplumber.open(filepath) as pdf:
            print(f"DEBUG: PDF opened. Total pages: {len(pdf.pages)}")
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
                print(f"DEBUG: Parsed page {i+1}")
        return extracted_text.strip()
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""
