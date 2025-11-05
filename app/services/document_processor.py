import os
from app.utils.pdf_utils import extract_text_from_pdf
from app.utils.excel_utils import excel_to_text

def process_documents(file_paths):
    """
    Process different types of documents and extract relevant information.

    Args:
        file_paths: List of paths to the documents

    Returns:
        dict: Extracted data from documents
    """
    extracted_data = {}

    for file_path in file_paths:
        if file_path.endswith(".pdf"):
            if 'pdf_text' not in extracted_data:
                extracted_data['pdf_text'] = []
            extracted_data['pdf_text'].append(extract_text_from_pdf(file_path))
        elif file_path.endswith(".xlsx") or file_path.endswith(".xls"):
            if 'excel_text' not in extracted_data:
                extracted_data['excel_text'] = []
            extracted_data['excel_text'].append(excel_to_text(file_path))


    return extracted_data 