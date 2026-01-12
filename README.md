# RentGuard 360

A serverless AI platform that helps Israeli renters understand and negotiate lease agreements.

Upload a PDF, get a risk assessment, clause-by-clause analysis, and specific negotiation recommendations—all powered by Azure OCR and Amazon Bedrock.

---

## Why I Built This

Reading rental contracts in Israel is frustrating. Legal Hebrew is dense, risky clauses are hidden in fine print, and most renters don't know what they can negotiate. I wanted to fix that.

RentGuard 360 analyzes your contract and tells you exactly what's problematic and what to ask for—no lawyer required for the initial review.

---

## How It Works

1. **Upload** your lease PDF  
2. **OCR** extracts the Hebrew text (Azure Document Intelligence)  
3. **Privacy Shield** removes personal information before AI processing  
4. **AI Analysis** evaluates each clause (Amazon Bedrock / Claude)  
5. **Results** show risk score, issues, and negotiation suggestions

The entire flow runs serverlessly—no infrastructure to manage.

---

## Technical Overview

**Frontend:** React 19, Vite, React Router, TanStack Query, AWS Amplify Auth

**Backend:** Python Lambdas, API Gateway, Step Functions (orchestration), DynamoDB, S3, Cognito, CloudFront + WAF, SES

**AI/ML:** Azure Document Intelligence (OCR), Amazon Bedrock (Claude 3 Sonnet)

**Infrastructure:** Single CloudFormation template (~1,500 lines), deploys in one command

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CloudFront + WAF                        │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   ┌──────────┐                   ┌─────────────┐
   │ S3 (SPA) │                   │ API Gateway │
   └──────────┘                   └──────┬──────┘
                                         │
                                  ┌──────▼──────┐
                                  │   Lambda    │
                                  └──────┬──────┘
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
┌─────────────────┐            ┌─────────────────┐             ┌─────────────────┐
│   S3 (PDFs)     │───────────▶│ Step Functions  │────────────▶│    DynamoDB     │
└─────────────────┘            └────────┬────────┘             └─────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             ┌───────────┐       ┌───────────┐       ┌───────────┐
             │ Azure OCR │       │  Privacy  │       │  Bedrock  │
             └───────────┘       │  Shield   │       │  (Claude) │
                                 └───────────┘       └───────────┘
```

---

## Key Features

- **Risk Scoring** — Overall contract risk from 0-100
- **Clause Analysis** — Each clause rated with explanation
- **Hebrew Support** — Full RTL interface and Hebrew NLP
- **PII Protection** — Personal data stripped before AI sees it
- **Admin Dashboard** — User management and usage analytics
- **Multi-Stack Deploy** — Run isolated test environments in the same AWS account

---

## Deployment

Everything deploys with CloudFormation:

```bash
# In AWS CloudShell
unzip RentGuard360-Deployment.zip
cd infrastructure
cp config.env.template config.env  # Add your keys
./deploy-cloudshell.sh
```

Full deployment guide: [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)

---

## Security Highlights

- Cognito JWT authentication
- WAF rules (SQLi, XSS, rate limiting)
- S3 encryption at rest
- PII redaction before AI processing
- Time-limited presigned URLs
- No secrets in repository

---

## Project Context

Academic project for Cloud Computing course (2026).  
Built by Ron Blanki, Moty Sakhartov, and Dan Gutman.

---

## License

Academic project. Contact for usage inquiries.
