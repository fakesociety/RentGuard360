"""
=============================================================================
LAMBDA: disable-user
Disables a user in Cognito and sends notification email (admin only)
=============================================================================

Trigger: API Gateway (POST /admin/users/disable)
Input: JSON body with username and optional reason
Output: Success/failure message with email sent status

External Services:
  - Cognito: Disable user, get user email
  - SES: Send notification email

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
ses = boto3.client('ses')

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


def send_disable_notification(sender_email, email, reason):
    """
    Sends notification email to user about account suspension.
    
    Args:
        email: User's email address
        reason: Reason for suspension
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        if not sender_email:
            return False
        ses.send_email(
            Source=sender_email,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {
                    'Data': 'RentGuard 360 - Account Disabled',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Html': {
                        'Data': f'''
                        <html>
                        <body dir="rtl" style="font-family: Arial, sans-serif;">
                            <h2>החשבון שלך הושעה</h2>
                            <p>שלום,</p>
                            <p>החשבון שלך ב-RentGuard 360 הושעה.</p>
                            <p><strong>סיבה:</strong> {reason}</p>
                            <p>אם אתה סבור שזו טעות, אנא פנה לתמיכה.</p>
                            <p>בברכה,<br>צוות RentGuard 360</p>
                        </body>
                        </html>
                        ''',
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - disables a user in Cognito.
    
    Args:
        event: API Gateway event with JSON body containing:
               - username (required): Cognito username
               - reason (optional): Reason for disabling
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

        sender_email = os.environ.get('SENDER_EMAIL')

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
        reason = body.get('reason', 'Policy violation')
        
        if not username:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'Username is required'})
            }
        
        # 3. Get user email before disabling
        user_email = None
        try:
            user_response = cognito.admin_get_user(
                UserPoolId=user_pool_id,
                Username=username
            )
            for attr in user_response.get('UserAttributes', []):
                if attr['Name'] == 'email':
                    user_email = attr['Value']
                    break
        except cognito.exceptions.UserNotFoundException:
            return {
                'statusCode': 404,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'User not found'})
            }
        
        # 4. Disable the user in Cognito
        cognito.admin_disable_user(
            UserPoolId=user_pool_id,
            Username=username
        )
        
        # 5. Send notification email
        email_sent = False
        if user_email and sender_email:
            email_sent = send_disable_notification(sender_email, user_email, reason)
        elif user_email and not sender_email:
            print('Skipping email notification: SENDER_EMAIL environment variable is not set')
        
        # 6. Return success response
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'success': True,
                'message': f'User {username} has been disabled',
                'emailSent': email_sent
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
