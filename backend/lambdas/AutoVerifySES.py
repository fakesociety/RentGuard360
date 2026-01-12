"""
=============================================================================
LAMBDA: AutoVerifySES
Automatically verifies new user emails in SES after Cognito signup
=============================================================================

Trigger: Cognito PostConfirmation (after user confirms email)
Input: Cognito PostConfirmation event
Output: Same event (passed through to Cognito)

External Services:
  - SES: Verify email identity

Notes:
  - Only runs on PostConfirmation_ConfirmSignUp trigger
  - Skips if email already verified in SES
  - Never fails to avoid blocking user registration

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

_ses_region = os.environ.get('SES_REGION')
ses = boto3.client('ses', region_name=_ses_region) if _ses_region else boto3.client('ses')

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - verifies new user email in SES.
    
    Triggered by Cognito after user confirms their email.
    Sends SES verification email so user can receive notifications.
    
    Args:
        event: Cognito PostConfirmation event
        context: AWS Lambda context object
    
    Returns:
        dict: Same event (required by Cognito)
    """
    print("Event received from Cognito:", json.dumps(event))
    
    try:
        # 1. Check if this is the right trigger (new user signup confirmation)
        trigger_source = event.get('triggerSource', '')
        
        if trigger_source != 'PostConfirmation_ConfirmSignUp':
            print(f"Skipping SES verification for trigger: {trigger_source}")
            return event
        
        # 2. Extract user email
        user_email = event['request']['userAttributes'].get('email')
        
        if user_email:
            # Normalize email to lowercase
            user_email = user_email.lower().strip()
            print(f"Verifying email for new user: {user_email}")
            
            # 3. Check if email already exists in SES
            try:
                existing = ses.list_identities(IdentityType='EmailAddress')
                existing_emails = [e.lower() for e in existing.get('Identities', [])]
                
                if user_email in existing_emails:
                    print(f"Email {user_email} already exists in SES, skipping verification request.")
                else:
                    # 4. Send SES verification request
                    ses.verify_email_identity(EmailAddress=user_email)
                    print("Verification email sent successfully.")
            except Exception as ses_error:
                print(f"SES check failed, sending verification anyway: {str(ses_error)}")
                ses.verify_email_identity(EmailAddress=user_email)
        else:
            print("No email found in event.")

    except Exception as e:
        # Never fail - don't block user registration
        print(f"Error: {str(e)}")
    
    # Must return event to Cognito to complete registration
    return event
