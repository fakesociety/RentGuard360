"""
=============================================================================
LAMBDA: save-edited-contract
Saves user-edited contract text to S3 and updates DynamoDB
=============================================================================

Trigger: API Gateway (POST /contracts/save-edited)
Input: JSON body with contractId, userId, editedClauses, fullEditedText
Output: Success status with S3 key of saved file

DynamoDB Tables:
  - RentGuard-Contracts: Update with edit metadata (lastEditedAt, editedVersion)

S3:
    - Bucket: (from CONTRACTS_BUCKET environment variable)
  - Operations: Write edited contract as .txt file

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

BUCKET_NAME = os.environ.get('CONTRACTS_BUCKET')
TABLE_NAME = os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts')

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
}

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - saves edited contract to S3.
    
    Args:
        event: API Gateway event with JSON body containing:
               - contractId (required)
               - userId (required)
               - editedClauses (optional)
               - fullEditedText (required)
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with S3 key of saved file
    """
    print(f"FULL EVENT: {json.dumps(event, default=str)}")

    if not BUCKET_NAME:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'CONTRACTS_BUCKET environment variable is not set'})
        }
    
    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    
    try:
        # 1. Parse request data (supports API Gateway proxy and non-proxy)
        payload = event
        if isinstance(event, dict) and event.get('body'):
            try:
                payload = json.loads(event.get('body') or '{}')
            except Exception as e:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': f'Invalid JSON body: {str(e)}'})
                }

        contract_id = (payload.get('contractId') or '').strip()

        # Prefer Cognito claim over client-provided userId
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}) if isinstance(event, dict) else {}
        user_id = (claims.get('sub') or payload.get('userId') or '').strip()

        edited_clauses = payload.get('editedClauses', {})
        full_edited_text = payload.get('fullEditedText', '')
        
        print(f"DATA: contractId={contract_id}, userId={user_id}")
        
        # 2. Validate required fields
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'contractId required'})
            }
        if not user_id:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'userId required'})
            }
        
        timestamp = datetime.utcnow().isoformat()
        table = dynamodb.Table(TABLE_NAME)
        
        # 3. Get original S3 key from contract record
        try:
            resp = table.get_item(Key={'userId': user_id, 'contractId': contract_id})
            s3_key = resp.get('Item', {}).get('s3Key')
            print(f"FOUND s3Key: {s3_key}")
        except Exception:
            s3_key = None

        if not s3_key:
            s3_key = f"uploads/{user_id}/contract-{contract_id}.pdf"
            print(f"FALLBACK s3Key: {s3_key}")
            
        # 4. Create edited file key and save to S3
        edited_key = s3_key.replace('.pdf', '_edited.txt')
        print(f"SAVING TO: {edited_key}")
        
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=edited_key,
            Body=full_edited_text.encode('utf-8'),
            ContentType='text/plain; charset=utf-8'
        )
        
        # 5. Update contract record with edit metadata
        table.update_item(
            Key={'userId': user_id, 'contractId': contract_id},
            UpdateExpression='SET lastEditedAt = :ts, editedVersion = :v, editsCount = :c',
            ExpressionAttributeValues={
                ':ts': timestamp,
                ':v': edited_key,
                ':c': len(edited_clauses or {})
            }
        )
        
        print(f"SUCCESS: Saved to {edited_key}")
        
        # 6. Return success response
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True, 'editedKey': edited_key})
        }
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }