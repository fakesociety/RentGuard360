# RentGuard 360 - Full AWS Audit Script
# הרץ את הסקריפט ושמור את הפלט לקובץ

$outputFile = "aws_full_audit.txt"

# Start
"=" * 80 | Out-File $outputFile
"RENTGUARD 360 - FULL AWS AUDIT" | Out-File $outputFile -Append
"Generated: $(Get-Date)" | Out-File $outputFile -Append
"=" * 80 | Out-File $outputFile -Append

# ========================================
# 1. LAMBDA - Full Details
# ========================================
"`n`n### LAMBDA FUNCTIONS - FULL DETAILS ###" | Out-File $outputFile -Append
aws lambda list-functions --query "Functions[*].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize,Timeout:Timeout,Handler:Handler,Role:Role,LastModified:LastModified}" --output json | Out-File $outputFile -Append

# Get environment variables for each Lambda
"`n### LAMBDA ENVIRONMENT VARIABLES ###" | Out-File $outputFile -Append
$lambdas = aws lambda list-functions --query "Functions[*].FunctionName" --output text
foreach ($lambda in $lambdas.Split()) {
    "`n--- $lambda ---" | Out-File $outputFile -Append
    aws lambda get-function-configuration --function-name $lambda --query "Environment.Variables" --output json 2>$null | Out-File $outputFile -Append
}

# ========================================
# 2. IAM ROLES - Full with Policies
# ========================================
"`n`n### IAM ROLES ###" | Out-File $outputFile -Append
aws iam list-roles --query "Roles[*].{RoleName:RoleName,Arn:Arn,CreateDate:CreateDate}" --output json | Out-File $outputFile -Append

# Get attached policies for each role
"`n### IAM ROLE POLICIES ###" | Out-File $outputFile -Append
$roles = aws iam list-roles --query "Roles[*].RoleName" --output text
foreach ($role in $roles.Split()) {
    if ($role -match "RentGuard|Lambda|StepFunction|Cognito|APIGateway") {
        "`n--- $role ---" | Out-File $outputFile -Append
        "Attached Policies:" | Out-File $outputFile -Append
        aws iam list-attached-role-policies --role-name $role --output json 2>$null | Out-File $outputFile -Append
        "Inline Policies:" | Out-File $outputFile -Append
        aws iam list-role-policies --role-name $role --output json 2>$null | Out-File $outputFile -Append
    }
}

# ========================================
# 3. DYNAMODB - Tables with Schema
# ========================================
"`n`n### DYNAMODB TABLES ###" | Out-File $outputFile -Append
$tables = aws dynamodb list-tables --query "TableNames" --output text
foreach ($table in $tables.Split()) {
    "`n--- $table ---" | Out-File $outputFile -Append
    aws dynamodb describe-table --table-name $table --output json | Out-File $outputFile -Append
}

# ========================================
# 4. S3 - Buckets with Config
# ========================================
"`n`n### S3 BUCKETS ###" | Out-File $outputFile -Append
aws s3api list-buckets --query "Buckets[*].{Name:Name,Created:CreationDate}" --output json | Out-File $outputFile -Append

# ========================================
# 5. API GATEWAY - Full
# ========================================
"`n`n### API GATEWAY ###" | Out-File $outputFile -Append
$apis = aws apigateway get-rest-apis --query "items[*].id" --output text
foreach ($api in $apis.Split()) {
    "`n--- API: $api ---" | Out-File $outputFile -Append
    aws apigateway get-rest-api --rest-api-id $api --output json | Out-File $outputFile -Append
    
    "`nResources:" | Out-File $outputFile -Append
    aws apigateway get-resources --rest-api-id $api --output json | Out-File $outputFile -Append
    
    "`nAuthorizers:" | Out-File $outputFile -Append
    aws apigateway get-authorizers --rest-api-id $api --output json | Out-File $outputFile -Append
}

# ========================================
# 6. STEP FUNCTIONS - Full Definition
# ========================================
"`n`n### STEP FUNCTIONS ###" | Out-File $outputFile -Append
$machines = aws stepfunctions list-state-machines --query "stateMachines[*].stateMachineArn" --output text
foreach ($machine in $machines.Split()) {
    "`n--- State Machine ---" | Out-File $outputFile -Append
    aws stepfunctions describe-state-machine --state-machine-arn $machine --output json | Out-File $outputFile -Append
}

# ========================================
# 7. COGNITO - User Pool Details
# ========================================
"`n`n### COGNITO USER POOLS ###" | Out-File $outputFile -Append
$pools = aws cognito-idp list-user-pools --max-results 10 --query "UserPools[*].Id" --output text
foreach ($pool in $pools.Split()) {
    "`n--- Pool: $pool ---" | Out-File $outputFile -Append
    aws cognito-idp describe-user-pool --user-pool-id $pool --output json | Out-File $outputFile -Append
    
    "`nGroups:" | Out-File $outputFile -Append
    aws cognito-idp list-groups --user-pool-id $pool --output json | Out-File $outputFile -Append
}

# ========================================
# 8. CLOUDFRONT
# ========================================
"`n`n### CLOUDFRONT DISTRIBUTIONS ###" | Out-File $outputFile -Append
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,DomainName:DomainName,Status:Status}" --output json | Out-File $outputFile -Append

# ========================================
# 9. SES
# ========================================
"`n`n### SES IDENTITIES ###" | Out-File $outputFile -Append
aws ses list-identities --output json | Out-File $outputFile -Append

# Done
"`n`n" + "=" * 80 | Out-File $outputFile -Append
"AUDIT COMPLETE" | Out-File $outputFile -Append
"=" * 80 | Out-File $outputFile -Append

Write-Host "Audit saved to: $outputFile" -ForegroundColor Green
