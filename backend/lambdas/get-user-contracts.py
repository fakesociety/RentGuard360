"""
=============================================================================
LAMBDA: get-user-contracts
Retrieves all contracts belonging to the authenticated user
=============================================================================

Trigger: API Gateway (GET /contracts)
Input: None (userId extracted from JWT)
Output: List of contract metadata (fileName, uploadDate, status, etc.)

DynamoDB Tables:
  - RentGuard-Contracts: Query by userId (partition key)

Security:
  - Extracts userId from JWT claims (Cognito authorizer)
  - Users can only see their own contracts

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key

# =============================================================================
# CONFIGURATION
# =============================================================================

TABLE_NAME = os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts')
ANALYSIS_TABLE_NAME = os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)
analysis_table = dynamodb.Table(ANALYSIS_TABLE_NAME)

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
}

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - fetches all contracts for the authenticated user.
    
    Args:
        event: API Gateway event with requestContext containing JWT claims
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with list of contracts
    """
    try:
        # 1. Extract userId from JWT token claims (security)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({"error": "Unauthorized - no valid user identity"})
            }

        print(f"Fetching contracts for user: {user_id}")

        # 2. Query contracts for this user only
        response = table.query(
            KeyConditionExpression=Key('userId').eq(user_id)
        )
        
        items = response.get('Items', [])
        print(f"Found {len(items)} contracts")

        # 2.5. Reconcile pending contracts: if analysis exists, mark as analyzed
        # This prevents contracts from being stuck in 'uploaded/pending' forever
        # when the workflow completed but the Contracts record wasn't updated.
        for contract in items:
            try:
                status = (contract.get('status') or '').lower()
                contract_id = contract.get('contractId')
                if not contract_id:
                    continue

                # Only reconcile non-final statuses
                if status in ('analyzed', 'failed', 'error'):
                    continue

                analysis_resp = analysis_table.get_item(Key={'contractId': contract_id})
                analysis_item = analysis_resp.get('Item')
                if not analysis_item:
                    continue

                # If analysis exists, reflect it on the contract record
                risk_score = (
                    analysis_item.get('risk_score')
                    if isinstance(analysis_item, dict)
                    else None
                )
                analyzed_date = analysis_item.get('timestamp') or datetime.utcnow().isoformat()

                contract['status'] = 'analyzed'
                if risk_score is not None:
                    contract['riskScore'] = risk_score
                contract['analyzedDate'] = analyzed_date

                # Best-effort persistence (so future loads are fast and consistent)
                try:
                    update_expression = "SET #status = :status, analyzedDate = :analyzedDate"
                    expression_values = {
                        ':status': 'analyzed',
                        ':analyzedDate': analyzed_date,
                    }
                    if risk_score is not None:
                        update_expression += ", riskScore = :riskScore"
                        expression_values[':riskScore'] = risk_score

                    table.update_item(
                        Key={'userId': user_id, 'contractId': contract_id},
                        UpdateExpression=update_expression,
                        ExpressionAttributeNames={'#status': 'status'},
                        ExpressionAttributeValues=expression_values,
                    )
                except Exception as e:
                    print(f"Warning: Could not persist reconciliation for {contract_id}: {e}")

            except Exception as e:
                print(f"Warning: Reconciliation error: {e}")

        # 3. Return the contracts list
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(items, ensure_ascii=False, default=str)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {"Access-Control-Allow-Origin": "*"},
            'body': json.dumps(f"Database Error: {str(e)}")
        }