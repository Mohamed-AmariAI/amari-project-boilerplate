from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import os
import tempfile

from app.services.document_processor import process_documents
from app.services.llm_service import extract_field_from_document

router = APIRouter()


class OceanShipmentData(BaseModel):
    """Response model for extracted Ocean Shipment Form data"""
    bill_of_lading_number: Optional[str] = None
    container_number: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    date_of_export: Optional[str] = None
    line_items_count: Optional[int] = None
    average_gross_weight: Optional[str] = None
    average_price: Optional[str] = None


@router.post("/process-documents", response_model=OceanShipmentData)
async def process_documents_endpoint(
    files: List[UploadFile] = File(...)
):
    """
    Process uploaded documents (PDF or Excel) and extract Ocean Shipment Form fields.

    Returns:
        OceanShipmentData: Structured data extracted from the document
    """
    temp_file_paths = []
    try:
        for file in files:
            # Save uploaded file temporarily
            temp_file = tempfile.NamedTemporaryFile(suffix=file.filename, delete=False)
            temp_file_paths.append(temp_file.name)

            # Write content to temp file
            content = await file.read()
            temp_file.write(content)
            temp_file.close()

        # Process documents to extract text
        document_data = process_documents(temp_file_paths)

        # Extract structured data using LLM
        extracted_data = extract_field_from_document(document_data)

        print(extracted_data)
        return extracted_data
        # return {'bill_of_lading_number': 'AAA', 'container_number': "None", 'consignee_name': "None", 'consignee_address': "None", 'date_of_export': "None", 'line_items_count': 123, 'average_gross_weight': "None", 'average_price': None}
        

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error processing documents: {str(e)}")

    finally:
        # Clean up temp files
        for path in temp_file_paths:
            if os.path.exists(path):
                os.unlink(path) 
