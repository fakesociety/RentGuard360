"""
=============================================================================
LAMBDA: RentGuard_AzureOCR
PDF text extraction using Azure Document Intelligence
=============================================================================

Trigger: Step Functions or EventBridge S3 event
Input: S3 bucket and key of PDF
Output: Extracted text and page count

External Services:
  - Azure Document Intelligence (prebuilt-read model)

S3:
  - Operations: Download PDF for processing

Environment Variables:
  - AZURE_DOC_KEY: Azure Document Intelligence API key
  - AZURE_DOC_ENDPOINT: Azure endpoint URL

Notes:
  - Uses Azure's free tier with optimal batching (2 pages per request)
  - Supports Hebrew text extraction with high accuracy
  - Maximum 20 pages by default (can increase to 500)

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import boto3
import time
import os
import urllib3
import uuid

# =============================================================================
# CONFIGURATION
# =============================================================================

MAX_PAGES_TOTAL = 20
PAGES_PER_REQUEST = 2

s3 = boto3.client('s3')
http = urllib3.PoolManager()

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - extracts text from PDF using Azure OCR.
    
    Processes PDF in batches of 2 pages (optimal for free tier).
    Supports both direct input and EventBridge S3 event formats.
    
    Args:
        event: S3 event or direct input with bucket and key
        context: AWS Lambda context object
    
    Returns:
        dict: Extracted text, page count, and S3 metadata
    """
    print("Starting Azure Document Intelligence OCR (Free Tier, optimal batching)...")
    
    # 1. Handle both direct input and EventBridge S3 event format
    if 'detail' in event:
        bucket_name = event['detail']['bucket']['name']
        file_key = event['detail']['object']['key']
    else:
        bucket_name = event.get('bucket')
        file_key = event.get('key')
    
    # 2. Extract contractId from S3 key (use existing UUID from get-upload-url)
    contract_id = event.get('contractId')
    if not contract_id and file_key:
        filename = file_key.split('/')[-1]
        if filename.startswith('contract-') and filename.endswith('.pdf'):
            contract_id = filename[9:-4]
            print(f"Extracted contractId from S3 key: {contract_id}")
    
    if not contract_id:
        contract_id = str(uuid.uuid4())
        print(f"WARNING: Generated new contractId as fallback: {contract_id}")
    
    if not bucket_name or not file_key:
        return {'error': 'Missing bucket or key'}

    # 3. Get Azure credentials
    azure_key = os.environ.get('AZURE_DOC_KEY')
    azure_endpoint = os.environ.get('AZURE_DOC_ENDPOINT')
    
    if not azure_key or not azure_endpoint:
        raise Exception("Missing Azure configuration")

    try:
        # 4. Download from S3
        print(f"Downloading file: {file_key}")
        s3_response = s3.get_object(Bucket=bucket_name, Key=file_key)
        file_bytes = s3_response['Body'].read()
        
        # Determine content type
        if file_key.lower().endswith('.pdf'):
            content_type = 'application/pdf'
        elif file_key.lower().endswith('.png'):
            content_type = 'image/png'
        else:
            content_type = 'image/jpeg'

        base_url = azure_endpoint.rstrip('/')
        all_text = ""
        total_pages = 0
        
        # 5. Process in batches of 2 pages
        for start_page in range(1, MAX_PAGES_TOTAL + 1, PAGES_PER_REQUEST):
            end_page = start_page + PAGES_PER_REQUEST - 1
            analyze_url = (
                f"{base_url}/formrecognizer/documentModels/prebuilt-read:analyze"
                f"?api-version=2023-07-31&pages={start_page}-{end_page}"
            )
            headers = {
                'Ocp-Apim-Subscription-Key': azure_key,
                'Content-Type': content_type
            }
            print(f"Requesting pages {start_page}-{end_page}...")
            response = http.request('POST', analyze_url, body=file_bytes, headers=headers)

            if response.status != 202:
                print(f"Error at pages {start_page}-{end_page}, stopping")
                break

            # 6. Poll for results
            operation_url = response.headers['Operation-Location']
            status = 'running'
            retries = 0
            while status in ['running', 'notStarted']:
                if retries > 30:
                    print("Timeout waiting for Azure OCR")
                    break
                time.sleep(2)
                poll_response = http.request('GET', operation_url, headers={'Ocp-Apim-Subscription-Key': azure_key})
                poll_data = json.loads(poll_response.data.decode('utf-8'))
                status = poll_data.get('status', 'failed')
                retries += 1

            # 7. Extract text from response
            if status == 'succeeded':
                analyze_result = poll_data.get('analyzeResult', {})
                pages = analyze_result.get('pages', [])
                pages_returned = len(pages)
                if pages_returned == 0:
                    print(f"No more pages, total: {total_pages}")
                    break
                page_text = analyze_result.get('content', '')
                all_text += page_text + "\n"
                total_pages += pages_returned
                print(f"Got {pages_returned} pages (total: {total_pages})")
                if pages_returned < PAGES_PER_REQUEST:
                    print("Last batch reached")
                    break
            else:
                print(f"Failed at pages {start_page}-{end_page}")
                break

        # 8. Return results
        print(f"SUCCESS! {len(all_text)} chars from {total_pages} pages")
        return {
            'statusCode': 200,
            'extractedText': all_text,
            'pagesCount': total_pages,
            'bucket': bucket_name,
            'key': file_key,
            'contractId': contract_id
        }

    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise e
