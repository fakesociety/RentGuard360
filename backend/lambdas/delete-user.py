"""
=============================================================================
LAMBDA: delete-user
Permanently deletes a user from Cognito User Pool (admin only)
=============================================================================

Trigger: API Gateway (DELETE /admin/users)
Input: Query parameter 'username' or JSON body with username
Output: Success/failure message

External Services:
  - Cognito: Delete user

Security:
  - Requires 'Admins' group membership in Cognito
  - Returns 403 if user is not an admin

WARNING: This action is PERMANENT and cannot be undone!

Environment Variables:
    - USER_POOL_ID: Cognito User Pool ID (required)

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import boto3
import os
import traceback

# =============================================================================
# CONFIGURATION
# =============================================================================
cognito = boto3.client('cognito-idp')

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
}

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - permanently deletes a user from Cognito.
    
    Args:
        event: API Gateway event with username in query params or body
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with success/failure message
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': ''
        }

    user_pool_id = os.environ.get('USER_POOL_ID')
    if not user_pool_id:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'USER_POOL_ID environment variable is not set'})
        }
    # 1. Verify admin group membership
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    groups = claims.get('cognito:groups', '')
    
    if 'Admins' not in str(groups):
        return {
            'statusCode': 403,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Admin access required'})
        }
    
    # Debug logging
    print("=" * 50)
    print("DELETE USER LAMBDA INVOKED")
    print("=" * 50)
    print(f"Full event: {json.dumps(event, default=str)}")
    print(f"HTTP Method: {event.get('httpMethod', 'UNKNOWN')}")
    print(f"Path: {event.get('path', 'UNKNOWN')}")
    print(f"Query params: {event.get('queryStringParameters')}")
    print(f"Body: {event.get('body')}")
    print("=" * 50)
    
    try:
        # 2. Get username from query parameters first (for DELETE requests)
        query_params = event.get('queryStringParameters') or {}
        print(f"Parsed query_params: {query_params}")
        username = query_params.get('username')
        print(f"Username from query params: {username}")
        
        # Fall back to body if not in query params
        if not username:
            print("Username not in query params, checking body...")
            raw_body = event.get('body', '{}') or '{}'
            print(f"Raw body: {raw_body}")
            body = json.loads(raw_body)
            print(f"Parsed body: {body}")
            username = body.get('username')
            print(f"Username from body: {username}")
        
        # 3. Validate username
        if not username:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Username is required'})
            }
        
        # 4. Delete user from Cognito
        print(f"Attempting to delete user: {username}")
        print(f"Using USER_POOL_ID: {user_pool_id}")
        
        cognito.admin_delete_user(
            UserPoolId=user_pool_id,
            Username=username
        )
        
        print(f"SUCCESS: User {username} deleted successfully")
        
        # 5. Return success response
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': f'User {username} deleted successfully',
                'username': username
            })
        }
        
    except cognito.exceptions.UserNotFoundException:
        print(f"ERROR: User {username} not found in Cognito")
        return {
            'statusCode': 404,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'User not found'})
        }
    except Exception as e:
        print(f"ERROR deleting user: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
