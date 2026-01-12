event pattern

{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["<contracts-bucket-name>"]
    },
    "object": {
      "key": [{
        "prefix": "uploads/"
      }]
    }
  }
}

Input path
{
  "bucket": "$.detail.bucket.name",
  "key": "$.detail.object.key"
}
Input template 
{
  "bucket": <bucket>,
  "key": <key>
}

DynamoDB Tables: RentGuard-Contracts, RentGuard-Analysis

Cognito User Pool ID: <user-pool-id>

identity pool id: <identity-pool-id>

שכבות (Layers): ציין ש-pdf-processor משתמש ב-PyPDF2 Layer.
