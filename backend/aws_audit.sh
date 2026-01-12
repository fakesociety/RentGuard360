#!/bin/bash
# RentGuard 360 - Full AWS Audit Script (CloudShell/Bash)
# הרץ ב-AWS CloudShell

OUTPUT="aws_full_audit.txt"

echo "========================================"
echo "RENTGUARD 360 - FULL AWS AUDIT"
echo "Generated: $(date)"
echo "========================================"

{
echo "========================================"
echo "RENTGUARD 360 - FULL AWS AUDIT"
echo "Generated: $(date)"
echo "========================================"

# 1. LAMBDA
echo -e "\n\n### LAMBDA FUNCTIONS ###"
aws lambda list-functions --query "Functions[*].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize,Timeout:Timeout,Role:Role}" --output table

echo -e "\n### LAMBDA ENVIRONMENT VARIABLES ###"
for fn in $(aws lambda list-functions --query "Functions[*].FunctionName" --output text); do
    echo -e "\n--- $fn ---"
    aws lambda get-function-configuration --function-name "$fn" --query "Environment.Variables" --output json 2>/dev/null
done

# 2. IAM ROLES
echo -e "\n\n### IAM ROLES ###"
aws iam list-roles --query "Roles[*].{RoleName:RoleName,CreateDate:CreateDate}" --output table

echo -e "\n### IAM ROLE POLICIES (RentGuard/Lambda related) ###"
for role in $(aws iam list-roles --query "Roles[*].RoleName" --output text); do
    if [[ "$role" == *"RentGuard"* ]] || [[ "$role" == *"Lambda"* ]] || [[ "$role" == *"StepFunctions"* ]]; then
        echo -e "\n--- $role ---"
        echo "Attached Policies:"
        aws iam list-attached-role-policies --role-name "$role" --output json 2>/dev/null
    fi
done

# 3. DYNAMODB
echo -e "\n\n### DYNAMODB TABLES ###"
for table in $(aws dynamodb list-tables --query "TableNames" --output text); do
    echo -e "\n--- $table ---"
    aws dynamodb describe-table --table-name "$table" --output json
done

# 4. S3
echo -e "\n\n### S3 BUCKETS ###"
aws s3api list-buckets --query "Buckets[*].{Name:Name,Created:CreationDate}" --output table

echo -e "\n### S3 BUCKET DETAILS (rentguard) ###"
for bucket in $(aws s3api list-buckets --query "Buckets[*].Name" --output text); do
    if [[ "$bucket" == *"rentguard"* ]]; then
        echo -e "\n--- $bucket ---"
        echo "CORS:"
        aws s3api get-bucket-cors --bucket "$bucket" 2>/dev/null || echo "No CORS"
        echo "Notifications:"
        aws s3api get-bucket-notification-configuration --bucket "$bucket" 2>/dev/null
    fi
done

# 5. API GATEWAY
echo -e "\n\n### API GATEWAY ###"
for api in $(aws apigateway get-rest-apis --query "items[*].id" --output text); do
    echo -e "\n--- API: $api ---"
    aws apigateway get-rest-api --rest-api-id "$api" --output json
    echo "Resources:"
    aws apigateway get-resources --rest-api-id "$api" --query "items[*].{Path:path,Methods:resourceMethods}" --output table
    echo "Authorizers:"
    aws apigateway get-authorizers --rest-api-id "$api" --output json
done

# 6. STEP FUNCTIONS
echo -e "\n\n### STEP FUNCTIONS ###"
for machine in $(aws stepfunctions list-state-machines --query "stateMachines[*].stateMachineArn" --output text); do
    echo -e "\n--- State Machine ---"
    aws stepfunctions describe-state-machine --state-machine-arn "$machine" --output json
done

# 7. COGNITO
echo -e "\n\n### COGNITO USER POOLS ###"
for pool in $(aws cognito-idp list-user-pools --max-results 10 --query "UserPools[*].Id" --output text); do
    echo -e "\n--- Pool: $pool ---"
    aws cognito-idp describe-user-pool --user-pool-id "$pool" --output json
    echo "Groups:"
    aws cognito-idp list-groups --user-pool-id "$pool" --output json
done

# 8. CLOUDFRONT
echo -e "\n\n### CLOUDFRONT ###"
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,DomainName:DomainName,Status:Status}" --output table

# 9. SES
echo -e "\n\n### SES ###"
aws ses list-identities --output json
aws ses get-send-quota --output json

# 10. EVENTBRIDGE
echo -e "\n\n### EVENTBRIDGE RULES ###"
aws events list-rules --output json

echo -e "\n\n========================================"
echo "AUDIT COMPLETE"
echo "========================================"

} > "$OUTPUT" 2>&1

echo "✅ Audit saved to: $OUTPUT"
echo "📥 Download with: cat $OUTPUT"
