"""
=============================================================================
LAMBDA: get-analysis-result
Retrieves contract analysis results for a specific contract
=============================================================================

Trigger: API Gateway (GET /analysis)
Input: Query parameter 'contractId'
Output: Full analysis result with issues, scores, and contract text

DynamoDB Tables:
  - RentGuard-Analysis: Read analysis results by contractId

Security:
  - Extracts userId from JWT claims (Cognito authorizer)
  - Verifies contract ownership before returning data
  - Returns 403 if user tries to access another user's contract

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
from decimal import Decimal

# =============================================================================
# CONFIGURATION
# =============================================================================

TABLE_NAME = os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

class DecimalEncoder(json.JSONEncoder):
    """
    Custom JSON encoder for DynamoDB Decimal types.
    DynamoDB returns numbers as Decimal, which json.dumps() cannot serialize.
    """
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - fetches analysis results for a contract.
    
    Args:
        event: API Gateway event with queryStringParameters and requestContext
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with statusCode, headers, and body
    """
    try:
        # 1. Extract userId from JWT token claims (security)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        # 2. Get contractId from query params
        query_params = event.get('queryStringParameters') or {}
        contract_id = query_params.get('contractId')
        
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({"error": "Missing contractId parameter"})
            }

        print(f"Fetching analysis for: {contract_id}, user: {user_id}")

        # 3. Fetch the analysis item from DynamoDB
        response = table.get_item(Key={'contractId': contract_id})
        item = response.get('Item')

        if not item:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({"message": "Analysis not found or still processing"})
            }
        
        # 4. Security check - verify contract ownership
        stored_user_id = item.get('userId')
        if user_id and stored_user_id and user_id != stored_user_id:
            print(f"Security violation: User {user_id} trying to access contract owned by {stored_user_id}")
            return {
                'statusCode': 403,
                'headers': CORS_HEADERS,
                'body': json.dumps({"error": "Access denied - contract belongs to another user"})
            }

        # 5. Return the analysis result
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(item, ensure_ascii=False, cls=DecimalEncoder)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {"Access-Control-Allow-Origin": "*"},
            'body': json.dumps(f"Database Error: {str(e)}")
        }