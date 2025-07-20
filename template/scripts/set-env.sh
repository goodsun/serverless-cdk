#!/bin/bash
set -e

# 環境変数を設定するスクリプト
# GitHub ActionsとローカルDev環境の両方で動作します

# デフォルト環境
export CDK_ENV=${CDK_ENV:-dev}

# 環境名を大文字に変換
ENV_UPPER=$(echo $CDK_ENV | tr '[:lower:]' '[:upper:]')

echo "🔧 Setting environment variables for: $CDK_ENV"

# GitHub Actions環境かどうかを判定
if [ -n "$GITHUB_ACTIONS" ]; then
    echo "📦 Running in GitHub Actions"
else
    echo "💻 Running in local environment"
    # ローカル環境では.envファイルを読み込む
    if [ -f .env ]; then
        echo "📄 Loading .env file"
        set -a
        source .env
        set +a
    else
        echo "⚠️  Warning: .env file not found"
    fi
fi

# 環境別の変数を共通変数にマッピング
# CDK Account
if [ -n "${CDK_ACCOUNT:-}" ]; then
    export CDK_ACCOUNT="${CDK_ACCOUNT}"
else
    VAR_NAME="CDK_ACCOUNT_${ENV_UPPER}"
    export CDK_ACCOUNT="${!VAR_NAME}"
fi

# CDK Region
if [ -n "${CDK_REGION:-}" ]; then
    export CDK_REGION="${CDK_REGION}"
else
    VAR_NAME="CDK_REGION_${ENV_UPPER}"
    export CDK_REGION="${!VAR_NAME}"
fi

# Log Level
VAR_NAME="LOG_LEVEL_${ENV_UPPER}"
export LOG_LEVEL="${!VAR_NAME:-info}"

# Feature Flags
VAR_NAME="ENABLE_PITR_${ENV_UPPER}"
export ENABLE_PITR="${!VAR_NAME:-false}"

VAR_NAME="ENABLE_API_CACHE_${ENV_UPPER}"
export ENABLE_API_CACHE="${!VAR_NAME:-false}"

# Domain Configuration (Optional)
if [ -n "$DOMAIN_NAME" ]; then
    VAR_NAME="API_SUBDOMAIN_${ENV_UPPER}"
    export API_SUBDOMAIN="${!VAR_NAME}"
    
    VAR_NAME="API_CERTIFICATE_ARN_${ENV_UPPER}"
    export API_CERTIFICATE_ARN="${!VAR_NAME}"
fi

# Security Configuration (Optional)
VAR_NAME="ENCRYPTION_KEY_${ENV_UPPER}"
if [ -n "${!VAR_NAME}" ]; then
    export ENCRYPTION_KEY="${!VAR_NAME}"
fi

# External Services (Optional)
VAR_NAME="SLACK_WEBHOOK_URL_${ENV_UPPER}"
if [ -n "${!VAR_NAME}" ]; then
    export SLACK_WEBHOOK_URL="${!VAR_NAME}"
fi

# AWS認証情報の確認（GitHub Actionsでない場合）
if [ -z "$GITHUB_ACTIONS" ]; then
    # AWS CLIの設定確認
    if ! aws sts get-caller-identity &>/dev/null; then
        echo "❌ Error: AWS credentials not configured"
        echo "Please run 'aws configure' or set AWS_PROFILE"
        exit 1
    fi
fi

# 必須変数の確認
if [ -z "$CDK_ACCOUNT" ]; then
    echo "❌ Error: CDK_ACCOUNT is not set"
    echo "Please set CDK_ACCOUNT_${ENV_UPPER} in your .env file or GitHub Secrets"
    exit 1
fi

if [ -z "$CDK_REGION" ]; then
    echo "❌ Error: CDK_REGION is not set"
    echo "Please set CDK_REGION_${ENV_UPPER} in your .env file or GitHub Secrets"
    exit 1
fi

# CDK用の環境変数を設定
export CDK_DEFAULT_ACCOUNT=$CDK_ACCOUNT
export CDK_DEFAULT_REGION=$CDK_REGION

# 設定内容を表示（機密情報は除く）
echo "✅ Environment variables set:"
echo "   CDK_ENV: $CDK_ENV"
echo "   CDK_ACCOUNT: ${CDK_ACCOUNT:0:4}****${CDK_ACCOUNT: -4}"
echo "   CDK_REGION: $CDK_REGION"
echo "   LOG_LEVEL: $LOG_LEVEL"
echo "   ENABLE_PITR: $ENABLE_PITR"
echo "   ENABLE_API_CACHE: $ENABLE_API_CACHE"

if [ -n "$DOMAIN_NAME" ]; then
    echo "   DOMAIN_NAME: $DOMAIN_NAME"
    echo "   API_SUBDOMAIN: $API_SUBDOMAIN"
fi

# 残りのコマンドを実行
if [ $# -gt 0 ]; then
    echo "🚀 Executing: $@"
    exec "$@"
fi