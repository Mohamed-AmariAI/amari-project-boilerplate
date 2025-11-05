from openai import OpenAI
from app.core.config import settings
import json

client = OpenAI(api_key=settings.OPENAI_API_KEY)


def extract_field_from_document(document_text):
    """
    Use LLM to extract specific fields from Ocean Shipment Form document text.

    Args:
        document_text: Text from the document

    Returns:
        dict: Extracted fields as a structured dictionary
    """

    prompt = f"""Extract the following fields from the Ocean Shipment Form document:

1. Bill of lading number
2. Container Number
3. Consignee Name
4. Consignee Address
5. Date of export (in mm/dd/yyyy format)
6. Line Items Count (as a number)
7. Average Gross Weight (as a number with unit if provided)
8. Average Price (as a number with currency if provided)

Document text:
{document_text}

Return the data as a JSON object with these exact keys:
- bill_of_lading_number
- container_number
- consignee_name
- consignee_address
- date_of_export
- line_items_count
- average_gross_weight
- average_price

If a field is not found in the document, set its value to null."""

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that extracts structured data from Ocean Shipment Form documents. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        max_tokens=500,
        temperature=0.3
    )

    # Parse the JSON response
    extracted_text = response.choices[0].message.content.strip()
    try:
        extracted_data = json.loads(extracted_text)

        # Convert numeric fields to strings if they exist
        if extracted_data.get("average_price") is not None and not isinstance(extracted_data["average_price"], str):
            extracted_data["average_price"] = str(extracted_data["average_price"])

        if extracted_data.get("average_gross_weight") is not None and not isinstance(extracted_data["average_gross_weight"], str):
            extracted_data["average_gross_weight"] = str(extracted_data["average_gross_weight"])

    except json.JSONDecodeError:
        # Fallback structure if JSON parsing fails
        extracted_data = {
            "bill_of_lading_number": None,
            "container_number": None,
            "consignee_name": None,
            "consignee_address": None,
            "date_of_export": None,
            "line_items_count": None,
            "average_gross_weight": None,
            "average_price": None,
            "raw_response": extracted_text
        }

    return extracted_data
