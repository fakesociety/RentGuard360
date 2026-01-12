# RentGuard 360 - Complete Implementation Plan

## Executive Summary

This implementation plan provides a complete roadmap for building RentGuard 360, an AI-powered lease analysis platform on AWS. The plan covers GitHub collaboration setup, AWS serverless architecture implementation, task division between team members, and compliance with all professor requirements.

**Timeline**: Now → January 10, 2026  
**Team**: Ron & Moti  
**Tech Stack**: React, AWS Serverless (Lambda, API Gateway, Bedrock, S3, DynamoDB, Cognito, Step Functions)

---

## Phase 1: GitHub & Development Environment Setup

### 1.1 GitHub Repository Structure

Create the following directory structure in your repository:

```
RentGuard-360/
├── .github/
│   └── workflows/
│       ├── frontend-deploy.yml
│       └── backend-deploy.yml
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── lambdas/
│   │   ├── pdf-processor/
│   │   ├── privacy-shield/
│   │   ├── ai-analyzer/
│   │   └── api-handlers/
│   ├── step-functions/
│   └── api-gateway/
├── infrastructure/
│   ├── cloudformation/
│   ├── terraform/ (optional)
│   └── scripts/
├── docs/
│   ├── architecture/
│   ├── ui-design/
│   ├── user-manual/
│   ├── admin-manual/
│   └── api-documentation/
├── tests/
├── .gitignore
├── README.md
└── package.json
```

### 1.2 GitHub Collaboration Workflow

**Branch Strategy**:
- `main` - Production-ready code
- `dev` - Development integration branch
- `feature/*` - Feature branches (e.g., `feature/pdf-processor`, `feature/ui-dashboard`)
- `fix/*` - Bug fixes

**Workflow Rules**:
1. Never commit directly to `main`
2. Create feature branches from `dev`
3. Open Pull Requests (PRs) for code review
4. Require 1 approval before merging
5. Use meaningful commit messages

**Git Commands to Start**:
```bash
# Clone the repository
git clone https://github.com/[your-username]/RentGuard-360.git
cd RentGuard-360

# Create dev branch
git checkout -b dev
git push -u origin dev

# Set up branch protection (do this on GitHub settings)
# Settings → Branches → Add rule for 'main' and 'dev'
```

### 1.3 AWS Account Setup

**Prerequisites**:
1. AWS Account with admin access
2. AWS CLI installed and configured
3. Node.js 18+ installed
4. Python 3.11+ installed (for Lambda functions)

**AWS Configuration**:
```bash
# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1 (or your preferred region)
# Default output format: json

# Create IAM user for deployment
aws iam create-user --user-name rentguard-deployer

# Attach necessary policies
aws iam attach-user-policy --user-name rentguard-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

---

## Phase 2: Core Architecture Implementation

### 2.1 Architecture Overview

![Architecture Diagram](C:/Users/Ron/.gemini/antigravity/brain/39d95882-a53b-4e83-bc58-18a225327e3e/uploaded_image_1765366980318.png)

### 2.2 Frontend Setup (React with iOS 26 Liqueed Style)

**Design System Principles**:
- **Color Palette**: Neutral tones (grays, blues, subtle accents)
- **Typography**: SF Pro Display / Inter (iOS-like)
- **Components**: Glassmorphism, smooth animations, fluid transitions
- **Modes**: Light & Dark mode support
- **Layout**: Card-based, generous whitespace, subtle shadows

**Initial Frontend Setup**:
```bash
cd frontend
npm create vite@latest . -- --template react
npm install

# Install dependencies
npm install @aws-amplify/ui-react aws-amplify
npm install react-router-dom
npm install @tanstack/react-query
npm install framer-motion
npm install lucide-react
npm install pdf-lib pdfjs-dist
```

**Design System Implementation** (`frontend/src/styles/design-system.css`):
```css
:root {
  /* iOS 26 Liqueed Style - Light Mode */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F5F5F7;
  --bg-tertiary: #E8E8ED;
  
  --text-primary: #1D1D1F;
  --text-secondary: #6E6E73;
  --text-tertiary: #86868B;
  
  --accent-primary: #007AFF;
  --accent-secondary: #5856D6;
  --accent-success: #34C759;
  --accent-warning: #FF9500;
  --accent-danger: #FF3B30;
  
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 0, 0, 0.1);
  
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  
  --transition-fast: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="dark"] {
  --bg-primary: #000000;
  --bg-secondary: #1C1C1E;
  --bg-tertiary: #2C2C2E;
  
  --text-primary: #FFFFFF;
  --text-secondary: #AEAEB2;
  --text-tertiary: #8E8E93;
  
  --glass-bg: rgba(28, 28, 30, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);
  
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

### 2.3 Authentication (Amazon Cognito)

**Cognito Setup**:
```bash
# Create User Pool
aws cognito-idp create-user-pool \
  --pool-name RentGuard360Users \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}"

# Create User Pool Client
aws cognito-idp create-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-name RentGuard360WebApp \
  --no-generate-secret

# Create Identity Pool
aws cognito-identity create-identity-pool \
  --identity-pool-name RentGuard360Identity \
  --allow-unauthenticated-identities false
```

**User Groups** (Admin & Regular User):
```bash
# Create Admin group
aws cognito-idp create-group \
  --user-pool-id <USER_POOL_ID> \
  --group-name Admins \
  --description "Administrator users"

# Create Regular User group
aws cognito-idp create-group \
  --user-pool-id <USER_POOL_ID> \
  --group-name Users \
  --description "Regular users"
```

### 2.4 Backend Infrastructure

#### API Gateway Setup

Create `backend/api-gateway/openapi.yaml`:
```yaml
openapi: 3.0.0
info:
  title: RentGuard 360 API
  version: 1.0.0
paths:
  /contracts/upload:
    post:
      summary: Upload contract for analysis
      security:
        - CognitoAuth: []
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '200':
          description: Upload successful
  /contracts/{contractId}/analysis:
    get:
      summary: Get contract analysis results
      security:
        - CognitoAuth: []
      responses:
        '200':
          description: Analysis results
  /contracts:
    get:
      summary: List user's contracts
      security:
        - CognitoAuth: []
      responses:
        '200':
          description: List of contracts
components:
  securitySchemes:
    CognitoAuth:
      type: apiKey
      in: header
      name: Authorization
```

#### Lambda Functions Structure

**1. PDF Processor Lambda** (`backend/lambdas/pdf-processor/index.py`):
```python
import json
import boto3
import PyPDF2
from io import BytesIO

s3 = boto3.client('s3')

def lambda_handler(event, context):
    """
    Extracts text from uploaded PDF contract
    Input: S3 event with PDF location
    Output: Extracted text
    """
    bucket = event['bucket']
    key = event['key']
    
    # Download PDF from S3
    pdf_object = s3.get_object(Bucket=bucket, Key=key)
    pdf_content = pdf_object['Body'].read()
    
    # Extract text
    pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_content))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'contractId': key,
            'extractedText': text,
            'pageCount': len(pdf_reader.pages)
        })
    }
```

**2. Privacy Shield Lambda** (`backend/lambdas/privacy-shield/index.py`):
```python
import re
import json

def lambda_handler(event, context):
    """
    Removes PII (Personal Identifiable Information) from contract text
    Sanitizes: Israeli ID numbers, credit cards, phone numbers, emails
    """
    text = event['extractedText']
    
    # Israeli ID pattern (9 digits)
    text = re.sub(r'\b\d{9}\b', '[ID_REDACTED]', text)
    
    # Credit card pattern
    text = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CC_REDACTED]', text)
    
    # Phone numbers
    text = re.sub(r'\b05\d-?\d{7}\b', '[PHONE_REDACTED]', text)
    
    # Email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL_REDACTED]', text)
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'sanitizedText': text,
            'redactionCount': text.count('_REDACTED]')
        })
    }
```

**3. AI Analyzer Lambda** (`backend/lambdas/ai-analyzer/index.py`):
```python
import json
import boto3

bedrock = boto3.client('bedrock-runtime')

def lambda_handler(event, context):
    """
    Uses Amazon Bedrock to analyze lease contract
    Identifies risks, unfair clauses, and generates negotiation suggestions
    """
    sanitized_text = event['sanitizedText']
    
    prompt = f"""
    You are a legal expert specializing in Israeli rental law. Analyze the following lease contract:
    
    {sanitized_text}
    
    Provide:
    1. Risk Assessment (High/Medium/Low for each clause)
    2. Unfair or unusual clauses compared to standard Israeli lease agreements
    3. Specific negotiation suggestions with alternative wording
    4. Simple explanations for complex legal terms
    
    Format your response as JSON with the following structure:
    {{
      "overallRisk": "High/Medium/Low",
      "clauses": [
        {{
          "text": "clause text",
          "riskLevel": "High/Medium/Low",
          "issue": "description of problem",
          "suggestion": "alternative wording",
          "explanation": "simple explanation"
        }}
      ]
    }}
    """
    
    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })
    )
    
    response_body = json.loads(response['body'].read())
    analysis = json.loads(response_body['content'][0]['text'])
    
    return {
        'statusCode': 200,
        'body': json.dumps(analysis)
    }
```

#### Step Functions Workflow

Create `backend/step-functions/contract-analysis-workflow.json`:
```json
{
  "Comment": "Contract Analysis Workflow",
  "StartAt": "ExtractPDFText",
  "States": {
    "ExtractPDFText": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:pdf-processor",
      "Next": "SanitizeText",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "HandleError"
        }
      ]
    },
    "SanitizeText": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:privacy-shield",
      "Next": "AnalyzeContract",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "HandleError"
        }
      ]
    },
    "AnalyzeContract": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:ai-analyzer",
      "Next": "SaveResults",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "HandleError"
        }
      ]
    },
    "SaveResults": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:save-to-dynamodb",
      "Next": "NotifyUser"
    },
    "NotifyUser": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:REGION:ACCOUNT:contract-analysis-complete",
        "Message.$": "$.analysisId"
      },
      "End": true
    },
    "HandleError": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:error-handler",
      "End": true
    }
  }
}
```

#### DynamoDB Schema

**Contracts Table**:
```javascript
{
  TableName: "RentGuard-Contracts",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" },
    { AttributeName: "contractId", KeyType: "RANGE" }
  ],
  AttributeDefinitions: [
    { AttributeName: "userId", AttributeType: "S" },
    { AttributeName: "contractId", AttributeType: "S" }
  ],
  BillingMode: "PAY_PER_REQUEST"
}
```

**Analysis Results Table**:
```javascript
{
  TableName: "RentGuard-Analysis",
  KeySchema: [
    { AttributeName: "contractId", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "contractId", AttributeType: "S" }
  ],
  BillingMode: "PAY_PER_REQUEST"
}
```

---

## Phase 3: Task Division - Ron & Moti

### Ron's Tasks (Frontend & Integration Focus)

#### Week 1-2: Frontend Foundation
- [ ] Initialize React project with Vite
- [ ] Implement design system (iOS 26 Liqueed style)
- [ ] Create reusable component library (Button, Card, Input, Modal)
- [ ] Implement Dark/Light mode toggle
- [ ] Set up React Router for navigation

#### Week 3-4: Authentication & User Interface
- [ ] Integrate AWS Amplify with Cognito
- [ ] Build Login/Signup pages
- [ ] Create Dashboard layout
- [ ] Implement Contract Upload interface with drag-and-drop

#### Week 5-6: Analysis Results Visualization
- [ ] Build Analysis Results page (risk visualization)
- [ ] Implement Interactive Legal Explainer (tooltip system)
- [ ] Create Negotiation Suggestions UI
- [ ] Add Contract History page

#### Week 7-8: Testing & Documentation
- [ ] End-to-end testing
- [ ] User Manual creation
- [ ] UI/UX design documentation (screenshots, flows)
- [ ] Video demonstration recording

### Moti's Tasks (Backend & Infrastructure Focus)

#### Week 1-2: AWS Infrastructure Setup
- [ ] Set up AWS account and IAM roles
- [ ] Create S3 buckets (contracts storage, frontend hosting)
- [ ] Configure Amazon Cognito (User Pool, Identity Pool, Groups)
- [ ] Set up DynamoDB tables

#### Week 3-4: Lambda Functions Development
- [ ] Develop PDF Processor Lambda
- [ ] Implement Privacy Shield Lambda
- [ ] Create AI Analyzer Lambda (Bedrock integration)
- [ ] Build API handler Lambdas (CRUD operations)

#### Week 5-6: Workflow & API
- [ ] Configure API Gateway with OpenAPI spec
- [ ] Implement Step Functions workflow
- [ ] Set up SNS notifications
- [ ] Create CloudFront distribution with WAF

#### Week 7-8: Testing & Documentation
- [ ] Lambda function testing
- [ ] Admin Manual creation
- [ ] API documentation
- [ ] Deployment scripts and CloudFormation templates
- [ ] Cost calculator report

### Shared Tasks (Both)

#### Week 9: Integration & Testing
- [ ] Frontend-Backend integration testing
- [ ] Security testing
- [ ] Performance optimization
- [ ] Bug fixes

#### Week 10: Professor Requirements
- [ ] Architecture diagram creation (with official AWS icons)
- [ ] Architecture documentation
- [ ] Feature list and UML sequence diagrams
- [ ] Clean account deployment testing
- [ ] Final code documentation and comments

---

## Phase 4: Deployment Guide

### 4.1 Frontend Deployment

```bash
# Build frontend
cd frontend
npm run build

# Create S3 bucket for frontend
aws s3 mb s3://rentguard-360-frontend

# Enable static website hosting
aws s3 website s3://rentguard-360-frontend \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://rentguard-360-frontend --acl public-read

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name rentguard-360-frontend.s3.amazonaws.com \
  --default-root-object index.html
```

### 4.2 Backend Deployment

```bash
# Deploy Lambda functions
cd backend/lambdas/pdf-processor
zip -r function.zip .
aws lambda create-function \
  --function-name pdf-processor \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
  --handler index.lambda_handler \
  --zip-file fileb://function.zip

# Deploy API Gateway
aws apigatewayv2 import-api \
  --body file://backend/api-gateway/openapi.yaml

# Deploy Step Functions
aws stepfunctions create-state-machine \
  --name contract-analysis-workflow \
  --definition file://backend/step-functions/contract-analysis-workflow.json \
  --role-arn arn:aws:iam::ACCOUNT:role/step-functions-role
```

### 4.3 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/frontend-deploy.yml`:
```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Build
        run: cd frontend && npm run build
      
      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --acl public-read --follow-symlinks --delete
        env:
          AWS_S3_BUCKET: rentguard-360-frontend
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: 'frontend/dist'
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## Phase 5: Professor Requirements Checklist

### Deliverable 1: Architecture Diagram (A4)
- **Tool**: Draw.io or Figma
- **Format**: A4 size, official AWS icons
- **Content**: All components from uploaded diagram
- **Deliverable**: PDF + source file (.drawio or .fig)

### Deliverable 2: Architecture Documentation
- **Content**: Detailed explanation of data flow, component interactions
- **Format**: Markdown or PDF
- **Length**: 2-3 pages minimum

### Deliverable 3: UI/UX Design Documentation
- **Content**: Hand sketches or Figma designs of all screens
- **Screens**: Login, Dashboard, Upload, Analysis Results, Settings
- **Format**: PDF with annotations

### Deliverable 4: Features & Use Cases
- **Format**: UML Sequence Diagrams for each feature
- **Features**: 
  - User Registration
  - Contract Upload
  - Privacy Sanitization
  - AI Analysis
  - Results Viewing
  - Negotiation Suggestions

### Deliverable 5: Cost Calculator
- **Tool**: AWS Pricing Calculator
- **Assumptions Document**: Expected users, requests/month, data storage
- **Format**: PDF export + link

### Deliverable 6: User Manual
- **Audience**: End users (renters)
- **Content**: Step-by-step with screenshots
- **Format**: PDF with images

### Deliverable 7: Admin Manual
- **Audience**: System administrators
- **Content**: User management, system monitoring
- **Format**: PDF with images

### Deliverable 8: Source Code Package
- **Format**: ZIP file with all code
- **Include**: Frontend, Backend, Infrastructure scripts
- **GitHub**: Link to repository

### Deliverable 9: Deployment Instructions
- **Content**: Step-by-step guide to deploy on clean AWS account
- **Test**: Deploy on fresh account before submission
- **Format**: Markdown README

### Deliverable 10: Live System Link
- **URL**: CloudFront distribution URL
- **Status**: Must be working and accessible

### Deliverable 11: Test Credentials
- **Admin User**: username + password
- **Regular User**: username + password

### Deliverable 12: Code Documentation
- **Style**: Self-documenting code with comments
- **Standards**: JSDoc for JavaScript, docstrings for Python

### Deliverable 13: API Documentation
- **Format**: OpenAPI/Swagger spec
- **Content**: All endpoints, parameters, responses

---

## Getting Started - First Steps

### This Week (Ron)
1. Set up local development environment
2. Initialize React project in `frontend/` directory
3. Implement basic design system (colors, typography)
4. Create initial components (Button, Card, Input)
5. Push to `feature/ui-foundation` branch

### This Week (Moti)
1. Set up AWS account and CLI
2. Create Cognito User Pool with Admin/User groups
3. Set up S3 buckets (contracts, frontend)
4. Create DynamoDB tables
5. Document all AWS resource ARNs in shared file

### Next Week (Both)
- **Daily standup**: 15-min video call to sync progress
- **Code review**: Review each other's PRs
- **Integration test**: Connect React to Cognito authentication

---

## Cost Estimation Assumptions

For the AWS Cost Calculator:

**User Assumptions**:
- 1,000 active users/month
- 5,000 contract analyses/month
- Average contract: 10 pages (2MB PDF)

**AWS Service Usage**:
- **S3**: 10GB storage, 15,000 GET requests
- **Lambda**: 5,000 invocations × 4 functions = 20,000 total
- **Bedrock**: 5,000 requests (Claude 3 Sonnet)
- **DynamoDB**: 10,000 read/write units
- **CloudFront**: 50GB data transfer
- **Cognito**: 1,000 MAU (Monthly Active Users)

**Estimated Monthly Cost**: ~$150-200 USD

---

## Timeline Overview

```
Week 1-2:   Setup & Foundation
Week 3-4:   Core Features Development
Week 5-6:   AI Integration & UI
Week 7-8:   Testing & Documentation
Week 9:     Integration & Bug Fixes
Week 10:    Final Deliverables & Submission
```

**Submission Deadline**: January 10, 2026

---

## Next Actions

1. **Ron**: Create `feature/ui-foundation` branch and start design system
2. **Moti**: Set up AWS resources and share configuration file
3. **Both**: Schedule daily 15-min standups
4. **Both**: Review this implementation plan and ask questions

---

## Resources

- [AWS Serverless Architecture](https://aws.amazon.com/serverless/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [React Best Practices](https://react.dev/learn)
- [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/)
- [AWS Pricing Calculator](https://calculator.aws/)

---

> [!IMPORTANT]
> **Key Success Factors**:
> - Daily communication between team members
> - Early integration testing (don't wait until the end)
> - Test deployment on clean AWS account before submission
> - Start documentation early, not at the end
> - Focus on professor's grading criteria from day one
