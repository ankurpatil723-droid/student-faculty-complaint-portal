# RSCOE Grievance Redressal Portal — Production Deployment & AWS Operations Manual

This guide outlines the production setup, containerization, and AWS cloud deployment strategy for the **JSPM RSCOE Grievance Redressal Portal**.

---

## 🏛️ System Architecture

- **Frontend & App Backend**: Next.js 14 (Standalone Server mode) containerized on **AWS ECS Fargate** (Multi-AZ).
- **Database**: **AWS RDS PostgreSQL 16** (Multi-AZ with KMS Encryption & Automated Daily Backups).
- **Storage**: **AWS S3** (Private Bucket with Presigned Uploads & Downloads).
- **Load Balancer**: **AWS ALB** with TLS 1.3 ACM Certificates.
- **CDN & DNS**: **AWS Route 53** + **AWS CloudFront** edge distribution.
- **Secrets & Monitoring**: **AWS Secrets Manager** + **AWS CloudWatch Logs & Container Insights**.

---

## 🚀 Quick Start: Local Production-Like Verification

Before deploying to AWS, test the containerized production stack locally using Docker Compose:

```bash
# 1. Build and start Web App + PostgreSQL containers
docker-compose up --build -d

# 2. Verify container health
docker-compose ps

# 3. Check Web App Health Endpoint
curl http://localhost:3000/api/health
```

Expected `/api/health` response:
```json
{
  "status": "UP",
  "service": "rscoe-grievance-portal",
  "version": "0.1.0",
  "uptimeSeconds": 45,
  "environment": "production",
  "checks": {
    "database": "OK",
    "storage": "OK",
    "aiModule": "OK"
  }
}
```

---

## 🔐 AWS Infrastructure Setup Step-by-Step

### 1. VPC & Networking
- Provision VPC across **2 Availability Zones** (`ap-south-1a`, `ap-south-1b`).
- Create 2 Public Subnets (for ALB) and 2 Private Subnets (for ECS Tasks & RDS Database).

### 2. RDS PostgreSQL Database
- Launch RDS PostgreSQL 16 Multi-AZ instance.
- Enable `Storage Encryption` via AWS KMS.
- Restrict Security Group inbound rules to allow port `5432` only from the ECS Task Security Group.

### 3. S3 Attachment Bucket
- Create private bucket: `rscoe-grievance-attachments-prod`.
- Enable **Block all public access**.
- Enable default encryption with AWS KMS (`aws/s3`).

### 4. AWS Secrets Manager
Store production variables securely in AWS Secrets Manager:
- `DATABASE_URL`: `postgresql://rscoe_admin:<SECURE_PASSWORD>@rscoe-db.xxx.rds.amazonaws.com:5432/rscoe_db?sslmode=require`
- `JWT_SECRET`: High-entropy random key (`openssl rand -base64 32`)
- `SESSION_SECRET`: High-entropy random key

### 5. ECS Fargate Cluster & Task Definition
- Register Task Definition:
  - CPU: `512` (0.5 vCPU)
  - Memory: `1024` (1 GB)
  - Image: `<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/rscoe-grievance-portal:latest`
  - Secrets: Map from AWS Secrets Manager.
  - Health Check: `wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1`
- Configure Auto-scaling: Min 2 tasks, Max 10 tasks based on CPU Utilization (> 70%).

---

## 🗄️ Database Migration Strategy

1. **Initial Deployment**:
   Execute `db/schema.sql` on the RDS PostgreSQL instance:
   ```bash
   psql "postgresql://rscoe_admin:<PASSWORD>@rscoe-db.xxx.rds.amazonaws.com:5432/rscoe_db" -f db/schema.sql
   ```
2. **Zero-Downtime Schema Updates**:
   - Apply additive non-breaking database migrations before updating ECS Task definition.
   - Run migrations via ECS One-Off Task or CI/CD runner.

---

## 🤖 CI/CD Pipeline (GitHub Actions)

The workflow file [`.github/workflows/deploy-aws.yml`](file:///.github/workflows/deploy-aws.yml) automates deployment:

1. Triggers on push to `main`.
2. Runs TypeScript checks (`npx tsc --noEmit`) and E2E unit tests.
3. Builds standalone Next.js Docker image.
4. Pushes image to private AWS ECR.
5. Deploys updated task definition to ECS Fargate with zero downtime.

---

## 📊 Operations & Emergency Contacts

- **Health Endpoint**: `GET /api/health`
- **CloudWatch Log Group**: `/ecs/rscoe-grievance-portal`
- **ALB Target Group**: `tg-rscoe-grievance-prod`
