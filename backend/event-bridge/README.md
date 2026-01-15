# EventBridge Configuration

## Rule Name
`${ProjectName}-S3ToStepFunctions${NameSuffix}`

## Event Pattern
```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["rentguard360-contracts-${AWS::AccountId}${NameSuffix}"]
    },
    "object": {
      "key": [{
        "prefix": "uploads/"
      }]
    }
  }
}
```

## Target Configuration

### Target Type
Step Functions State Machine

### State Machine
`${ProjectName}-ContractAnalysisWorkflow${NameSuffix}`

### Input Transformer

**Input Paths Map:**
```json
{
  "bucket": "$.detail.bucket.name",
  "key": "$.detail.object.key"
}
```

**Input Template:**
```json
{"bucket": <bucket>, "key": <key>}
```

---

## Related Resources

### DynamoDB Tables
- `RentGuard-Contracts${NameSuffix}`
- `RentGuard-Analysis${NameSuffix}`
- `RentGuard-UserConsent${NameSuffix}`
- `SupportTickets${NameSuffix}`

### S3 Buckets
- `rentguard360-contracts-${AWS::AccountId}${NameSuffix}` - Contract uploads (EventBridge enabled)
- `rentguard360-frontend-${AWS::AccountId}${NameSuffix}` - Frontend hosting

### Cognito
- User Pool: `${ProjectName}-UserPool${NameSuffix}`
- User Pool Client: `${ProjectName}-WebClient${NameSuffix}`
- Admin Group: `Admins`

---

## IAM Role
The EventBridge rule uses `EventBridgeRole` with permission to start Step Functions executions.

## Notes
- S3 bucket must have `EventBridgeConfiguration.EventBridgeEnabled: true`
- Only objects with prefix `uploads/` trigger the workflow
- The workflow processes: OCR → Privacy Shield → AI Analyzer → Save Results → Notify User
