"""
=============================================================================
LAMBDA: enable-user
Re-enables a disabled user in Cognito (admin only)
=============================================================================

Trigger: API Gateway (POST /admin/users/enable)
Input: JSON body with username
Output: Success/failure message

External Services:
  - Cognito: Enable user

Security:
  - Requires 'Admins' group membership in Cognito
  - Returns 403 if user is not an admin

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
import traceback

# =============================================================================
# CONFIGURATION
# =============================================================================

cognito = boto3.client('cognito-idp')

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def cors_headers():
    """Returns standard CORS headers for API Gateway responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - re-enables a disabled user in Cognito.
    
    Args:
        event: API Gateway event with JSON body containing:
               - username (required): Cognito username
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with success/failure message
    """
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': ''
            }

        user_pool_id = os.environ.get('USER_POOL_ID')
        if not user_pool_id:
            return {
                'statusCode': 500,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'USER_POOL_ID environment variable is not set'})
            }

        # 1. Verify admin group membership
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        groups = claims.get('cognito:groups', '')
        
        if 'Admins' not in str(groups):
            return {
                'statusCode': 403,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'Admin access required'})
            }
        
        # 2. Parse request body
        body = json.loads(event.get('body', '{}'))
        username = body.get('username')
        
        if not username:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'Username is required'})
            }
        
        # 3. Enable the user in Cognito
        try:
            cognito.admin_enable_user(
                UserPoolId=user_pool_id,
                Username=username
            )
        except cognito.exceptions.UserNotFoundException:
            return {
                'statusCode': 404,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'User not found'})
            }
        
        # 4. Return success response
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'success': True,
                'message': f'User {username} has been enabled'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }
