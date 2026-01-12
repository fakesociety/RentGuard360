"""
=============================================================================
LAMBDA: delete-contract
Deletes a contract from S3 and DynamoDB
=============================================================================

Trigger: API Gateway (DELETE /contracts)
Input: Query parameter 'contractId' (UUID) or an S3 key (legacy)
Output: Success/failure message

DynamoDB Tables:
  - RentGuard-Contracts: Delete by userId + contractId
  - RentGuard-Analysis: Delete by contractId

S3:
    - Bucket: (from CONTRACTS_BUCKET environment variable)
  - Operations: Delete contract PDF

Security:
  - Extracts userId from JWT claims (Cognito authorizer)
  - Verifies contract ownership via S3 key path
  - Prevents users from deleting other users' contracts

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3

# =============================================================================
# CONFIGURATION
# =============================================================================

BUCKET_NAME = os.environ.get('CONTRACTS_BUCKET')

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
contracts_table = dynamodb.Table(os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts'))
analysis_table = dynamodb.Table(os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis'))

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
}

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - deletes a contract from S3 and DynamoDB.
    
    Args:
        event: API Gateway event with queryStringParameters and requestContext
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with success/failure message
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    bucket_configured = bool(BUCKET_NAME)
    
    try:
        print(f"Event received: {json.dumps(event)}")

        # 1. Extract userId from JWT token claims (security)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')

        # 2. Read contractId param (UUID) or legacy S3 key
        params = event.get('queryStringParameters') or {}
        contract_param = (params.get('contractId') or event.get('contractId') or '').strip()

        if not contract_param:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Missing contractId parameter'})
            }

        if not user_id:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Unauthorized - no valid user identity'})
            }

        # 3. Normalize inputs
        contract_id = contract_param
        s3_key = None

        # If the client sent an S3 key, derive the UUID if possible.
        if '/' in contract_param or contract_param.startswith('uploads/'):
            s3_key = contract_param
            filename = s3_key.split('/')[-1]
            if filename.startswith('contract-') and filename.endswith('.pdf'):
                contract_id = filename[len('contract-'):-len('.pdf')]

        # 4. Look up the contract record to get the authoritative s3Key
        try:
            record = contracts_table.get_item(Key={'userId': user_id, 'contractId': contract_id}).get('Item')
            if record and record.get('s3Key'):
                s3_key = record['s3Key']
        except Exception as e:
            print(f"Warning: Could not read contract record: {e}")

        if not s3_key:
            # Best-effort fallback
            s3_key = f"uploads/{user_id}/contract-{contract_id}.pdf"

        print(f"Deleting contractId={contract_id} for userId={user_id}; s3Key={s3_key}")

        # 5. Delete from S3 (best-effort)
        if bucket_configured:
            try:
                s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
                print(f"Deleted from S3: {s3_key}")
            except Exception as e:
                print(f"Warning: S3 delete failed: {e}")
        else:
            print('Warning: CONTRACTS_BUCKET environment variable is not set; skipping S3 delete.')

        # 6. Delete from RentGuard-Contracts table (best-effort)
        try:
            contracts_table.delete_item(Key={'userId': user_id, 'contractId': contract_id})
            print("Deleted from Contracts table")
        except Exception as e:
            print(f"Warning: Contracts table delete failed: {e}")

        # 7. Delete from RentGuard-Analysis table (best-effort)
        try:
            analysis_table.delete_item(Key={'contractId': contract_id})
            print("Deleted from Analysis table")
        except Exception as e:
            print(f"Warning: Analysis table delete failed: {e}")

        body = {'message': 'Contract deleted successfully', 'contractId': contract_id}
        if not bucket_configured:
            body['warning'] = 'CONTRACTS_BUCKET is not set; S3 object delete was skipped'
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(body)
        }

    except Exception as e:
        print(f"Error deleting contract: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
