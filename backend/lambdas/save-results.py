"""
=============================================================================
LAMBDA: save-results
Saves AI analysis results to DynamoDB and updates contract status
=============================================================================

Trigger: Step Functions (after ai-analyzer completes)
Input: Analysis result, contractId, s3Key, clauses, sanitizedText
Output: Success status with contractId and risk_score

DynamoDB Tables:
  - RentGuard-Analysis: Stores full analysis results
  - RentGuard-Contracts: Updates status from 'uploaded' to 'analyzed'

S3:
    - Bucket: (from CONTRACTS_BUCKET environment variable, or Step Functions event.bucket)
  - Operations: Read metadata (original filename, address, landlord)

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
from datetime import datetime
from decimal import Decimal
from urllib.parse import unquote

# =============================================================================
# CONFIGURATION
# =============================================================================

BUCKET_NAME = os.environ.get('CONTRACTS_BUCKET')

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
analysis_table = dynamodb.Table(os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis'))
contracts_table = dynamodb.Table(os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts'))

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def convert_floats_to_decimals(obj):
    """
    Recursively convert floats to Decimals for DynamoDB compatibility.
    DynamoDB does not support float types, only Decimal.
    
    Args:
        obj: Any Python object (dict, list, float, etc.)
    
    Returns:
        Same object with floats converted to Decimal
    """
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    return obj


def extract_user_id_from_key(s3_key):
    """
    Extract userId from S3 key path.
    
    Args:
        s3_key: S3 key in format 'uploads/{userId}/contract-{uuid}.pdf'
    
    Returns:
        str: userId or None if extraction fails
    """
    try:
        parts = s3_key.split('/')
        if len(parts) >= 3 and parts[0] == 'uploads':
            return parts[1]
    except Exception as e:
        print(f"Warning: Could not extract userId from key: {e}")
    return None


def extract_contract_id_from_key(s3_key):
    """
    Extract contractId (UUID) from S3 key path.
    
    Args:
        s3_key: S3 key in format 'uploads/{userId}/contract-{uuid}.pdf'
    
    Returns:
        str: contractId (UUID) or None if extraction fails
    """
    try:
        parts = s3_key.split('/')
        if len(parts) >= 3:
            filename = parts[-1]
            if filename.startswith('contract-') and filename.endswith('.pdf'):
                return filename[9:-4]
    except Exception as e:
        print(f"Warning: Could not extract contractId from key: {e}")
    return None


def get_s3_metadata(bucket, key):
    """
    Fetch S3 object metadata (original filename, address, landlord).
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
    
    Returns:
        dict: Metadata with originalFileName, propertyAddress, landlordName
    """
    try:
        response = s3.head_object(Bucket=bucket, Key=key)
        metadata = response.get('Metadata', {})
        return {
            'originalFileName': unquote(metadata.get('original-filename', '')),
            'propertyAddress': unquote(metadata.get('property-address', '')),
            'landlordName': unquote(metadata.get('landlord-name', ''))
        }
    except Exception as e:
        print(f"Warning: Could not get S3 metadata: {e}")
        return {}

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - saves analysis results to DynamoDB.
    
    Args:
        event: Step Functions event with analysis_result, contractId, key, etc.
        context: AWS Lambda context object
    
    Returns:
        dict: Success status with contractId, userId, and risk_score
    """
    try:
        print("Received event:", json.dumps(event))
        
        # 1. Extract data from previous step
        passed_contract_id = event.get('contractId') or event.get('contract_id')
        analysis_result = event.get('analysis_result')
        s3_key = event.get('key')
        s3_bucket = event.get('bucket') or BUCKET_NAME
        clauses_list = event.get('clauses', [])
        full_text = event.get('sanitizedText', '')
        
        # 2. Extract contractId from s3_key (more reliable than passed value)
        contract_id = None
        if s3_key:
            contract_id = extract_contract_id_from_key(s3_key)
            if contract_id:
                print(f"Using contractId from s3_key: {contract_id}")
                if passed_contract_id and passed_contract_id != contract_id:
                    print(f"WARNING: Passed contractId '{passed_contract_id}' differs from s3_key UUID '{contract_id}'. Using s3_key UUID.")
        
        # Fallback to passed contractId
        if not contract_id:
            contract_id = passed_contract_id
            print(f"Fallback: Using passed contractId: {contract_id}")
        
        if not contract_id:
            raise ValueError("CRITICAL ERROR: Missing contractId in input event")
        
        # 3. Extract userId from S3 key path
        user_id = extract_user_id_from_key(s3_key or contract_id)
        print(f"Extracted userId: {user_id}")
        
        # 4. Fetch S3 metadata
        s3_metadata = {}
        if s3_key and s3_bucket:
            s3_metadata = get_s3_metadata(s3_bucket, s3_key)
            print(f"S3 Metadata: {s3_metadata}")
        elif s3_key and not s3_bucket:
            print('Warning: No S3 bucket provided (event.bucket or CONTRACTS_BUCKET); skipping S3 metadata fetch.')
        
        if not analysis_result:
            print(f"Warning: No analysis result found for {contract_id}")
            analysis_result = {"error": "No analysis data found", "is_contract": False}

        # 5. Convert floats to Decimal for DynamoDB
        clean_analysis = convert_floats_to_decimals(analysis_result)
        risk_score = 0
        if isinstance(clean_analysis, dict):
            risk_score = clean_analysis.get('overall_risk_score', 0)

        # 6. Save to RentGuard-Analysis table
        analysis_item = {
            'contractId': contract_id,
            'timestamp': datetime.utcnow().isoformat(),
            'analysis_result': clean_analysis,
            'risk_score': risk_score,
            'status': 'COMPLETED',
            'clauses_list': clauses_list,
            'full_text': full_text
        }
        
        if user_id:
            analysis_item['userId'] = user_id
        
        print(f"Saving to Analysis table: {json.dumps(analysis_item, default=str)}")
        analysis_table.put_item(Item=analysis_item)
        print("Analysis saved successfully")

        # 7. UPDATE existing contract record in RentGuard-Contracts (created by get-upload-url)
        # Update the existing record with analysis results
        if user_id:
            try:
                update_expression = "SET #status = :status, analyzedDate = :analyzedDate, riskScore = :riskScore"
                expression_values = {
                    ':status': 'analyzed',
                    ':analyzedDate': datetime.utcnow().isoformat(),
                    ':riskScore': risk_score
                }
                expression_names = {
                    '#status': 'status'  # 'status' is a reserved word in DynamoDB
                }
                
                print(f"Updating contract {contract_id} to status='analyzed'")
                contracts_table.update_item(
                    Key={
                        'userId': user_id,
                        'contractId': contract_id
                    },
                    UpdateExpression=update_expression,
                    ExpressionAttributeValues=expression_values,
                    ExpressionAttributeNames=expression_names
                )
                print("Contract record updated successfully")
            except Exception as e:
                print(f"Warning: Could not update Contracts table: {e}")

        # 8. Return clean response for notification step
        return {
            'contractId': contract_id,
            'userId': user_id,
            'status': 'success',
            'risk_score': risk_score
        }

    except Exception as e:
        print(f"Error saving to DB: {str(e)}")
        raise e