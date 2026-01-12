"""
=============================================================================
LAMBDA: consult-clause
Explains legal clauses in simple terms using AI
=============================================================================

Trigger: API Gateway (POST /consult)
Input: JSON body with contractId and clauseText
Output: AI-generated explanation of the clause (in Hebrew)

External Services:
  - AWS Bedrock: Claude for clause explanation

Model Selection:
  - Testing: Claude Haiku 4.5 (cheaper, faster for verification tests)
  - Production: Claude Opus 4 (higher quality for demo to lecturer)
  Change MODEL_ID below to switch between models.

DynamoDB Tables:
  - RentGuard-Contracts: Reference only (not actively used)

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

# Model Selection:
# - Testing: Haiku 4.5 (cheaper, for verification tests)
# - Production: Opus 4 (for demo to lecturer)
DEFAULT_MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"  # Change to opus-4 for production
# MODEL_ID = "us.anthropic.claude-opus-4-20250514-v1:0"  # Uncomment for production demo

MODEL_ID = os.environ.get('BEDROCK_MODEL_ID') or DEFAULT_MODEL_ID

BEDROCK_REGION = os.environ.get('BEDROCK_REGION') or 'us-east-1'
bedrock = boto3.client(service_name='bedrock-runtime', region_name=BEDROCK_REGION)
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts'))

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
}

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - explains a legal clause using AI.
    
    Focus: EXTREMELY CONCISE explanation (Max 3 sentences).
    
    Args:
        event: API Gateway event with JSON body containing:
               - contractId (optional)
               - clauseText (required)
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with AI explanation
    """
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': ''
            }

        # 1. Parse request body
        body = json.loads(event.get('body', '{}'))
        contract_id = body.get('contractId')
        clause_text = body.get('clauseText')
        
        if not clause_text:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'No clause text provided'})
            }

        # 2. Build system prompt for concise explanation
        system_prompt = """You are a concise legal interpreter.
Your goal is to explain the clause in simple Hebrew in ONE short paragraph.
CONSTRAINT: Maximum 3 sentences.
Do NOT use bullet points. Do NOT use numbered lists.
Focus only on the practical meaning."""

        # 3. Build user message (Hebrew prompt for Hebrew response)
        user_message = {
            "role": "user",
            "content": [{
                "text": f"""הסבר את סעיף השכירות הבא בקיצור נמרץ (עד 3 משפטים):
"{clause_text}"

כתוב רק את השורה התחתונה: מה זה אומר תכל'ס בשפה פשוטה וביומיומית. בלי הקדמות ובלי דוגמאות ארוכות."""
            }]
        }

        # 4. Call Bedrock
        print(f"Calling Bedrock modelId={MODEL_ID} region={BEDROCK_REGION}")
        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": system_prompt}],
            messages=[user_message],
            inferenceConfig={"maxTokens": 300, "temperature": 0.3}
        )
        
        ai_answer = response['output']['message']['content'][0]['text']

        # 5. Return AI response
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'explanation': ai_answer})
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }