"""
=============================================================================
LAMBDA: get-system-stats
Retrieves system-wide statistics for admin dashboard
=============================================================================

Trigger: API Gateway (GET /admin/stats)
Input: None (admin authentication required)
Output: Comprehensive stats including contracts, users, risks, charts

DynamoDB Tables:
  - RentGuard-Contracts: Scan for contract statistics
  - RentGuard-Analysis: Scan for common issues

External Services:
  - Cognito: List users, count registrations

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
from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict

# =============================================================================
# CONFIGURATION
# =============================================================================

dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')

contracts_table = dynamodb.Table(os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts'))
analysis_table = dynamodb.Table(os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis'))

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def scan_all_items(table):
    """
    Scan entire DynamoDB table with pagination.
    
    Args:
        table: DynamoDB table resource
    
    Returns:
        list: All items in the table
    """
    items = []
    response = table.scan()
    items.extend(response.get('Items', []))
    
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))
    
    return items


def cors_headers():
    """Returns standard CORS headers for API Gateway responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for DynamoDB Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def get_cognito_attribute(user, attr_name):
    for attr in user.get('Attributes', []):
        if attr.get('Name') == attr_name:
            return attr.get('Value')
    return None


def is_email_verified(user):
    val = get_cognito_attribute(user, 'email_verified')
    return str(val).lower() == 'true'

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - retrieves system statistics.
    
    Returns:
        - Contract counts (total, analyzed, pending, failed)
        - Average risk score and analysis time
        - User statistics (total, active last 30 days)
        - Risk distribution breakdown
        - Contracts over time chart data
        - User registrations over time chart data
        - Common issues list (top 5)
    
    Args:
        event: API Gateway event with authorization claims
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with stats JSON
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
        print(f"Full event keys: {list(event.keys())}")
        
        claims = {}
        
        # Try standard Cognito Authorizer path
        if 'requestContext' in event:
            auth = event['requestContext'].get('authorizer', {})
            claims = auth.get('claims', auth)
        
        # Try JWT Authorizer path (HTTP API)
        if not claims and 'requestContext' in event:
            jwt_claims = event['requestContext'].get('authorizer', {}).get('jwt', {}).get('claims', {})
            if jwt_claims:
                claims = jwt_claims
        
        groups = claims.get('cognito:groups', '')
        
        is_admin = False
        if isinstance(groups, list):
            is_admin = 'Admins' in groups
        elif isinstance(groups, str) and groups:
            is_admin = 'Admins' in groups
        
        if not is_admin:
            return {
                'statusCode': 403,
                'headers': cors_headers(),
                'body': json.dumps({
                    'error': 'Admin access required',
                    'debug': {
                        'groups_found': str(groups),
                        'claims_keys': list(claims.keys()) if claims else []
                    }
                })
            }
        
        # 2. Scan contracts table
        contracts = scan_all_items(contracts_table)
        
        total_contracts = len(contracts)
        analyzed = sum(1 for c in contracts if c.get('status') == 'analyzed')
        pending = sum(1 for c in contracts if c.get('status') in ['pending', 'uploaded', 'processing'])
        failed = sum(1 for c in contracts if c.get('status') == 'failed')
        
        # 3. Calculate risk scores and distribution
        risk_scores = []
        risk_dist = {
            'lowRisk': 0,       # 86-100
            'lowMediumRisk': 0, # 71-85
            'mediumRisk': 0,    # 51-70
            'highRisk': 0       # 0-50
        }
        
        contracts_by_day = {}
        min_contract_date = (datetime.utcnow() - timedelta(days=30)).date()

        for c in contracts:
            # Risk score collection
            if c.get('riskScore'):
                try:
                    score = float(c.get('riskScore'))
                    risk_scores.append(score)
                    
                    if score >= 86:
                        risk_dist['lowRisk'] += 1
                    elif score >= 71:
                        risk_dist['lowMediumRisk'] += 1
                    elif score >= 51:
                        risk_dist['mediumRisk'] += 1
                    else:
                        risk_dist['highRisk'] += 1
                except:
                    pass

            # Contracts by day
            date_source = c.get('analyzedDate') or c.get('uploadDate')
            
            if date_source:
                try:
                    analyzed_date = datetime.fromisoformat(date_source.replace('Z', '+00:00')).date()
                    if analyzed_date < min_contract_date:
                        min_contract_date = analyzed_date

                    date_str = analyzed_date.isoformat()
                    contracts_by_day[date_str] = contracts_by_day.get(date_str, 0) + 1
                except:
                    pass

        avg_risk_score = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0
        
        # 4. Build contracts timeline
        current_date_contracts = min_contract_date
        today = datetime.utcnow().date()
        time_series = []
        while current_date_contracts <= today:
            date_str = current_date_contracts.isoformat()
            time_series.append({
                'date': date_str,
                'analyzed': contracts_by_day.get(date_str, 0)
            })
            current_date_contracts += timedelta(days=1)
            
        # 5. Calculate average analysis time
        analysis_times = []
        for c in contracts:
            if c.get('uploadDate') and c.get('analyzedDate'):
                try:
                    upload = datetime.fromisoformat(c['uploadDate'].replace('Z', '+00:00'))
                    analyzed_date = datetime.fromisoformat(c['analyzedDate'].replace('Z', '+00:00'))
                    diff_seconds = (analyzed_date - upload).total_seconds()
                    if diff_seconds > 0:
                        analysis_times.append(diff_seconds)
                except:
                    pass
        avg_analysis_time = round(sum(analysis_times) / len(analysis_times), 1) if analysis_times else 0
        
        # 6. Get Cognito user stats and registrations
        user_count = 0
        active_users_30d = set()
        user_registrations_raw = defaultdict(int)
        
        try:
            paginator = cognito.get_paginator('list_users')
            for page in paginator.paginate(UserPoolId=user_pool_id):
                users_page = page['Users']
                for u in users_page:
                    # Count only verified users (email_verified=true).
                    # This includes admin-created users that may be FORCE_CHANGE_PASSWORD.
                    if not is_email_verified(u):
                        continue

                    user_count += 1
                    create_date = u.get('UserCreateDate')
                    if create_date:
                        d_str = create_date.date().isoformat()
                        user_registrations_raw[d_str] += 1
                        
        except Exception as e:
            print(f"Cognito error: {e}")
            
        # Format user registrations for chart
        user_reg_chart = []
        if user_registrations_raw:
            min_reg_date_str = min(user_registrations_raw.keys())
            reg_start_date = datetime.fromisoformat(min_reg_date_str).date()
        else:
            reg_start_date = datetime.utcnow().date() - timedelta(days=30)

        curr = reg_start_date
        while curr <= today:
            d_str = curr.isoformat()
            user_reg_chart.append({
                'date': d_str,
                'count': user_registrations_raw.get(d_str, 0)
            })
            curr += timedelta(days=1)

        # Active users = unique userIds with contracts in last 30 days
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        for c in contracts:
            if c.get('uploadDate', '') >= thirty_days_ago:
                active_users_30d.add(c.get('userId'))

        # 7. Get common issues from analysis table
        common_issues_list = []
        try:
            analysis_items = scan_all_items(analysis_table)
            issue_tracker = {}
            
            for item in analysis_items:
                res = item.get('analysis_result')
                if isinstance(res, str):
                    try:
                        res = json.loads(res)
                    except:
                        continue
                
                if isinstance(res, dict):
                    issues = res.get('issues', [])
                    for issue in issues:
                        rule_id = issue.get('rule_id')
                        topic = issue.get('clause_topic')
                        
                        if rule_id and topic:
                            key = rule_id.upper()
                            if key not in issue_tracker:
                                issue_tracker[key] = {'code': key, 'topic': topic, 'count': 0}
                            issue_tracker[key]['count'] += 1
            
            common_issues_list = list(issue_tracker.values())
            common_issues_list.sort(key=lambda x: x['count'], reverse=True)
            common_issues_list = common_issues_list[:5]
            
        except Exception as e:
            print(f"Error scanning analysis table: {e}")

        # 8. Build response
        stats = {
            'contracts': {
                'total': total_contracts,
                'analyzed': analyzed,
                'pending': pending,
                'failed': failed
            },
            'analysis': {
                'avgRiskScore': avg_risk_score,
                'avgAnalysisTimeSeconds': avg_analysis_time
            },
            'users': {
                'total': user_count,
                'activeLast30Days': len(active_users_30d)
            },
            'riskDistribution': risk_dist,
            'commonIssues': common_issues_list,
            'contractsByDay': time_series,
            'userRegistrations': user_reg_chart,
            'generatedAt': datetime.utcnow().isoformat()
        }
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps(stats, cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }
