"""
=============================================================================
LAMBDA: rename-contract
Updates contract metadata (fileName, propertyAddress, landlordName)
=============================================================================

Trigger: API Gateway (POST /contracts/rename)
Input: JSON body with contractId and optional fields to update
Output: Success status with updated fields

DynamoDB Tables:
  - RentGuard-Contracts: Update by userId + contractId

Security:
  - Extracts userId from JWT claims (Cognito authorizer)
  - Users can only update their own contracts

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

dynamodb = boto3.resource('dynamodb')
contracts_table = dynamodb.Table(os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts'))
analysis_table = dynamodb.Table(os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis'))

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
    Main Lambda entry point - updates contract metadata in DynamoDB.
    
    Args:
        event: API Gateway event with JSON body containing:
               - contractId (required)
               - fileName (optional)
               - propertyAddress (optional)
               - landlordName (optional)
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with updated fields
    """
    try:
        # Handle OPTIONS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'CORS preflight OK'})
            }
        
        # 1. Parse request body
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        # 2. Extract userId from JWT token claims (security)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        
        contract_id = body.get('contractId')
        new_file_name = body.get('fileName', '').strip() if body.get('fileName') else None
        property_address = body.get('propertyAddress', '').strip() if body.get('propertyAddress') else None
        landlord_name = body.get('landlordName', '').strip() if body.get('landlordName') else None
        
        # 3. Validate required fields
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'contractId is required'})
            }
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Unauthorized - no valid user identity'})
            }
        
        # 4. Build update expression dynamically
        update_parts = []
        expression_values = {}
        
        if new_file_name:
            if not new_file_name.lower().endswith('.pdf'):
                new_file_name = f"{new_file_name}.pdf"
            update_parts.append('fileName = :fn')
            expression_values[':fn'] = new_file_name
        
        if property_address is not None:
            update_parts.append('propertyAddress = :pa')
            expression_values[':pa'] = property_address
        
        if landlord_name is not None:
            update_parts.append('landlordName = :ln')
            expression_values[':ln'] = landlord_name
        
        if not update_parts:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'At least one field (fileName, propertyAddress, landlordName) is required'})
            }
        
        update_expression = 'SET ' + ', '.join(update_parts)
        
        # 5. Update the contracts table
        contracts_table.update_item(
            Key={
                'userId': user_id,
                'contractId': contract_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        print(f"Updated contract {contract_id} for user {user_id}: {update_parts}")
        
        # 6. Return success response
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'contractId': contract_id,
                'updated': {
                    'fileName': new_file_name,
                    'propertyAddress': property_address,
                    'landlordName': landlord_name
                }
            })
        }
        
    except Exception as e:
        print(f"Error renaming contract: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
