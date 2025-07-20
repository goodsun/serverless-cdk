#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${CDK_ENV:-dev}
APP_NAME=${APP_NAME:-my-serverless-app}

echo -e "${GREEN}🚀 Deploying $APP_NAME to $ENVIRONMENT environment${NC}"

# Set environment variables using set-env.sh
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/set-env.sh"

# Build the project
echo -e "${YELLOW}Building the project...${NC}"
npm run build:all

# Bootstrap CDK (if needed)
echo -e "${YELLOW}Bootstrapping CDK...${NC}"
npx cdk bootstrap || true

# Deploy the stack
echo -e "${YELLOW}Deploying CDK stack...${NC}"
npx cdk deploy --require-approval never

# Build and deploy frontend (if exists)
if [ -d "./public" ] || [ -d "./frontend" ]; then
    echo -e "${YELLOW}Building frontend...${NC}"
    npm run build:frontend || true
    
    # Get the frontend bucket name from stack outputs
    FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$APP_NAME-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
        --output text)
    
    if [ ! -z "$FRONTEND_BUCKET" ] && [ -d "./build/frontend" ]; then
        echo -e "${YELLOW}Deploying frontend to S3...${NC}"
        aws s3 sync ./build/frontend/ "s3://$FRONTEND_BUCKET" --delete
    fi
fi

# Display outputs
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}Stack outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name "$APP_NAME-$ENVIRONMENT" \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table