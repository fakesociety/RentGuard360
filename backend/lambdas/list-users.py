"""
=============================================================================
LAMBDA: list-users
Lists all users from Cognito User Pool (admin only)
=============================================================================

Trigger: API Gateway (GET /admin/users)
Input: Optional query parameters: search, limit
Output: List of users with email, name, status, enabled, createdAt

External Services:
  - Cognito: List users with pagination

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

def get_attribute(user, attr_name):
    """
    Get a specific attribute from Cognito user object.
    
    Args:
        user: Cognito user object
        attr_name: Name of the attribute to retrieve
    
    Returns:
        str: Attribute value or None if not found
    """
    for attr in user.get('Attributes', []):
        if attr['Name'] == attr_name:
            return attr['Value']
    return None


def is_email_verified(user):
    """Return True if Cognito user has email_verified=true."""
    val = get_attribute(user, 'email_verified')
    return str(val).lower() == 'true'


def cors_headers():
    """Returns standard CORS headers for API Gateway responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - lists all users from Cognito.
    
    Query Parameters:
        - search (optional): Filter users by email or name
        - limit (optional): Maximum number of users to return (default: 50)
    
    Args:
        event: API Gateway event with authorization claims
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with list of users
    """
    try:
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
        
        # 2. Get query parameters
        params = event.get('queryStringParameters') or {}
        search_query = params.get('search', '').lower()
        limit = int(params.get('limit', 50))
        
        # 3. List users from Cognito with pagination
        users = []
        paginator = cognito.get_paginator('list_users')
        
        for page in paginator.paginate(UserPoolId=user_pool_id, Limit=min(limit, 60)):
            for user in page['Users']:
                # Show only verified users in admin UI.
                # Note: admin-created users can be FORCE_CHANGE_PASSWORD but still have email_verified=true.
                if not is_email_verified(user):
                    continue

                user_data = {
                    'username': user['Username'],
                    'email': get_attribute(user, 'email'),
                    'name': get_attribute(user, 'name'),
                    'status': user['UserStatus'],
                    'enabled': user['Enabled'],
                    'createdAt': user['UserCreateDate'].isoformat() if user.get('UserCreateDate') else None
                }
                
                # Apply search filter if provided
                if search_query:
                    searchable = f"{user_data['email']} {user_data['name']}".lower()
                    if search_query not in searchable:
                        continue
                
                users.append(user_data)
                
                if len(users) >= limit:
                    break
            
            if len(users) >= limit:
                break
        
        # 4. Return users list
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'users': users,
                'count': len(users)
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
