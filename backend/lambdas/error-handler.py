"""
=============================================================================
LAMBDA: error-handler
Handles Step Functions errors and marks contracts as failed
=============================================================================

Trigger: Step Functions (Catch block on any step failure)
Input: Error info from Step Functions (Error, Cause, contractId)
Output: Success status (always succeeds to not break Step Function)

DynamoDB Tables:
  - RentGuard-Contracts: Update contract status to 'failed'
  - RentGuard-Analysis: Store error details

Notes:
  - Should never fail itself to avoid cascading failures
  - Logs error details for debugging

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
import datetime
import re

# =============================================================================
# CONFIGURATION
# =============================================================================

dynamodb = boto3.resource('dynamodb')
analysis_table = dynamodb.Table(os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis'))
contracts_table = dynamodb.Table(os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts'))

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def extract_contract_id(event):
    """Extract contractId from various event formats."""
    # Direct contractId
    if event.get('contractId'):
        return event.get('contractId')
    
    # From S3 key format: uploads/{userId}/contract-{uuid}.pdf
    key = event.get('key', '')
    if key:
        match = re.search(r'contract-([a-f0-9-]{36})\.pdf', key)
        if match:
            return match.group(1)
    
    return None

def extract_user_id(event):
    """Extract userId from event or S3 key."""
    if event.get('userId'):
        return event.get('userId')
    
    key = event.get('key', '')
    if key and 'uploads/' in key:
        parts = key.split('/')
        if len(parts) >= 2:
            return parts[1]
    
    return None

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - handles Step Functions errors.
    
    Marks the contract as FAILED in both DynamoDB tables.
    Always returns success to avoid breaking the Step Function.
    
    Args:
        event: Step Functions error event with Error, Cause, contractId
        context: AWS Lambda context object
    
    Returns:
        dict: Success status
    """
    try:
        print("Error Handler Triggered:", json.dumps(event))
        
        # 1. Extract information
        contract_id = extract_contract_id(event)
        user_id = extract_user_id(event)
        error_message = event.get('Error', 'Unknown Error')
        error_details = event.get('Cause', 'No details provided')
        
        print(f"ContractId: {contract_id}, UserId: {user_id}")

        # 2. Update RentGuard-Contracts table (for frontend to show X immediately)
        if contract_id and user_id:
            try:
                contracts_table.update_item(
                    Key={
                        'userId': user_id,
                        'contractId': contract_id
                    },
                    UpdateExpression='SET #s = :status, #e = :error, #t = :timestamp',
                    ExpressionAttributeNames={
                        '#s': 'status',
                        '#e': 'errorMessage',
                        '#t': 'failedAt'
                    },
                    ExpressionAttributeValues={
                        ':status': 'failed',
                        ':error': error_message,
                        ':timestamp': datetime.datetime.now().isoformat()
                    }
                )
                print(f"Updated RentGuard-Contracts: {contract_id} -> failed")
            except Exception as e:
                print(f"Failed to update Contracts table: {str(e)}")

        # 3. Store error details in RentGuard-Analysis table
        if contract_id:
            try:
                analysis_table.put_item(Item={
                    'contractId': contract_id,
                    'timestamp': datetime.datetime.now().isoformat(),
                    'status': 'FAILED',
                    'error': error_message,
                    'details': error_details
                })
                print(f"Stored error in RentGuard-Analysis: {contract_id}")
            except Exception as e:
                print(f"Failed to update Analysis table: {str(e)}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'handled': True,
                'contractId': contract_id,
                'status': 'FAILED',
                'error_message': error_message
            })
        }

    except Exception as e:
        print(f"Critical Error in Error Handler: {str(e)}")
        # Always return success to not cascade failures
        return {
            'statusCode': 200,
            'body': "Error handler finished with internal errors"
        }