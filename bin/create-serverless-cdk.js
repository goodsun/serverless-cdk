#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const packageJson = require('../package.json');

// Handle --version and --help flags
if (process.argv[2] === '--version' || process.argv[2] === '-v') {
  console.log(packageJson.version);
  process.exit(0);
}

if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log(`
${chalk.blue.bold('serverless-cdk')} - AWS CDKでサーバーレスアプリケーションを作成

${chalk.yellow('使用方法:')}
  serverless-cdk create <プロジェクト名>
  serverless-cdk --version
  serverless-cdk --help

${chalk.yellow('コマンド:')}
  create <名前>  新しいserverless CDKプロジェクトを作成

${chalk.yellow('オプション:')}
  -v, --version  バージョンを表示
  -h, --help     ヘルプを表示

${chalk.yellow('クイックスタート:')}
  ${chalk.gray('# 1. プロジェクトを作成')}
  ${chalk.cyan('serverless-cdk create my-api')}
  
  ${chalk.gray('# 2. プロジェクトディレクトリに移動')}
  ${chalk.cyan('cd my-api')}
  
  ${chalk.gray('# 3. 環境変数を確認・編集（AWSアカウントIDなど）')}
  ${chalk.cyan('vi .env')}
  
  ${chalk.gray('# 4. 依存関係をインストール')}
  ${chalk.cyan('npm install')}
  
  ${chalk.gray('# 5. ビルド実行')}
  ${chalk.cyan('npm run build && npm run build:api && npm run build:frontend')}
  
  ${chalk.gray('# 6. CDKブートストラップ（初回のみ）')}
  ${chalk.cyan('npm run bootstrap')}
  
  ${chalk.gray('# 7. AWSにデプロイ')}
  ${chalk.cyan('npm run deploy:dev')}

${chalk.yellow('リソースの削除:')}
  ${chalk.gray('# 開発環境を削除')}
  ${chalk.cyan('npm run destroy:dev')}
  
  ${chalk.gray('# 本番環境を削除（DynamoDB/S3は保護される）')}
  ${chalk.cyan('npm run destroy:prod')}
  
  ${chalk.gray('# 残留リソース（CloudWatch Logs等）の削除')}
  ${chalk.cyan('aws logs delete-log-group --log-group-name /aws/lambda/<app-name>-<env>-api')}

${chalk.yellow('前提条件:')}
  • Node.js 18以上
  • AWS CLI設定済み（aws configure）
  • AWS CDK CLI（npm install -g aws-cdk）

${chalk.yellow('詳細情報:')}
  https://github.com/goodsun/serverless-cdk
`);
  process.exit(0);
}

// Check for create command
if (process.argv[2] !== 'create') {
  console.log(chalk.red('❌ 不明なコマンドです。"serverless-cdk --help" で使用方法を確認してください。'));
  process.exit(1);
}

async function main() {
  console.log(chalk.blue.bold('\n🚀 Serverless CDKプロジェクトを作成\n'));

  // Get project name from command line or prompt
  let projectName = process.argv[3];
  
  if (!projectName) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'プロジェクト名を入力してください:',
        default: 'my-serverless-app',
        validate: (input) => {
          if (/^[a-z0-9-]+$/.test(input)) return true;
          return 'プロジェクト名は小文字、数字、ハイフンのみ使用できます';
        }
      }
    ]);
    projectName = answers.projectName;
  }

  const templateDir = path.join(__dirname, '..', 'template');
  const targetDir = path.join(process.cwd(), projectName);

  // Check if target directory already exists
  if (fs.existsSync(targetDir)) {
    console.log(chalk.red(`❌ ディレクトリ ${projectName} は既に存在します！`));
    process.exit(1);
  }

  console.log(chalk.yellow(`📁 プロジェクトを作成中: ${targetDir}...`));

  try {
    // Copy template files
    fs.copySync(templateDir, targetDir);

    // Update package.json with project name
    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = fs.readJsonSync(packageJsonPath);
    packageJson.name = projectName;
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });

    // Get current AWS account ID if available
    let awsAccountId = '123456789012'; // Default placeholder
    try {
      const accountId = execSync('aws sts get-caller-identity --query Account --output text', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
      }).trim();
      if (accountId && /^\d{12}$/.test(accountId)) {
        awsAccountId = accountId;
      }
    } catch (e) {
      // AWS CLI not configured, use placeholder
    }

    // Create .env from .env.example with actual values
    const envExamplePath = path.join(targetDir, '.env.example');
    const envPath = path.join(targetDir, '.env');
    
    if (fs.existsSync(envExamplePath)) {
      // Read .env.example content
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Update APP_NAME
      envContent = envContent.replace(/APP_NAME=.*/, `APP_NAME=${projectName}`);
      
      // Update AWS Account IDs only in .env (not .env.example)
      if (awsAccountId !== '123456789012') {
        envContent = envContent.replace(/CDK_ACCOUNT_DEV=\d+/, `CDK_ACCOUNT_DEV=${awsAccountId}`);
        envContent = envContent.replace(/CDK_ACCOUNT_STG=\d+/, `CDK_ACCOUNT_STG=${awsAccountId}`);
        
        // Keep PROD as different account (best practice)
        const prodHint = awsAccountId.substring(0, 8) + '0000';
        envContent = envContent.replace(/CDK_ACCOUNT_PROD=\d+/, `CDK_ACCOUNT_PROD=${prodHint} # 本番環境用の別アカウントを推奨`);
      }
      
      // Write to .env (not .env.example)
      fs.writeFileSync(envPath, envContent);
    }

    // Create README.md
    const readmeContent = `# ${projectName}

AWS CDKで構築されたサーバーレスアプリケーション。

## 前提条件

- Node.js 18以上とnpm
- 適切な認証情報で設定されたAWS CLI
- AWS CDK CLI: \`npm install -g aws-cdk\`

## クイックスタート

\`\`\`bash
# 環境変数の設定
cp .env.example .env
# .envファイルを編集してCDK_DEFAULT_ACCOUNTを設定

# 依存関係のインストール
npm install

# TypeScriptをビルド
npm run build

# API Lambda関数をビルド
npm run build:api

# CDKブートストラップ（初回のみ）
npm run bootstrap

# 開発環境へデプロイ
npm run deploy:dev

# 本番環境へデプロイ
npm run deploy:prod
\`\`\`

## プロジェクト構造

\`\`\`
${projectName}/
├── bin/              # CDKアプリのエントリーポイント
├── lib/              # CDKスタック定義
├── src/              # Lambda関数のソースコード
│   └── api/         # API Lambdaハンドラー
├── scripts/          # ビルド・デプロイスクリプト
├── cdk.json         # CDK設定
├── package.json     # Node.js依存関係
└── tsconfig.json    # TypeScript設定
\`\`\`

## 利用可能なスクリプト

- \`npm run build\` - TypeScriptコードのビルド
- \`npm run build:api\` - API Lambda関数のビルド
- \`npm run deploy:dev\` - 開発環境へデプロイ
- \`npm run deploy:stg\` - ステージング環境へデプロイ
- \`npm run deploy:prod\` - 本番環境へデプロイ
- \`npm run destroy\` - CDKスタックの削除

## 環境変数

\`.env\`ファイルで環境変数を設定：

\`\`\`bash
APP_NAME=${projectName}
AWS_REGION=ap-northeast-1
LOG_LEVEL=info
\`\`\`

## APIエンドポイント

デプロイ後、スタック出力に表示されるAPI Gateway URLでAPIが利用可能になります。

### 利用可能なエンドポイント：

- \`GET /api/health\` - ヘルスチェック
- \`GET /api/items\` - 全アイテムの取得
- \`GET /api/items/{id}\` - 単一アイテムの取得
- \`POST /api/items\` - 新規アイテムの作成
- \`PUT /api/items/{id}\` - アイテムの更新
- \`DELETE /api/items/{id}\` - アイテムの削除

## ライセンス

MIT
`;

    fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);

    console.log(chalk.green('\n✅ プロジェクトの作成が完了しました！\n'));
    
    // Check if AWS account was detected
    if (awsAccountId !== '123456789012') {
      console.log(chalk.yellow(`📝 AWS アカウントIDを検出しました: ${awsAccountId}`));
      console.log(chalk.gray('   .env.example と .env ファイルに設定済みです\n'));
    } else {
      console.log(chalk.yellow('⚠️  AWS CLIが設定されていません'));
      console.log(chalk.gray('   .env ファイルの CDK_ACCOUNT_* をあなたのAWSアカウントIDに更新してください\n'));
    }
    
    console.log(chalk.white('次のステップ:'));
    console.log(chalk.cyan(`  cd ${projectName}`));
    
    // 環境変数の設定案内
    if (awsAccountId === '123456789012') {
      console.log(chalk.cyan('  vi .env') + chalk.gray('  # AWSアカウントIDを設定'));
    } else {
      console.log(chalk.cyan('  vi .env') + chalk.gray('  # 環境変数を確認・編集（必要に応じて）'));
    }
    
    console.log(chalk.cyan('  npm install'));
    console.log(chalk.cyan('  npm run build:all') + chalk.gray('  # または npm run build && npm run build:api && npm run build:frontend'));
    console.log(chalk.cyan('  npm run bootstrap') + chalk.gray('  # 初回のみ'));
    console.log(chalk.cyan('  npm run deploy:dev'));
    
    console.log(chalk.white('\nGitHub Actions を使用する場合:'));
    console.log(chalk.gray('  1. GitHubリポジトリを作成'));
    console.log(chalk.gray('  2. Settings → Secrets → Actions で以下を設定:'));
    console.log(chalk.gray('     - AWS_ACCESS_KEY_ID_DEV'));
    console.log(chalk.gray('     - AWS_SECRET_ACCESS_KEY_DEV'));
    console.log(chalk.gray('     - 他の環境変数（.env参照）'));
    console.log(chalk.gray('  3. git push で自動デプロイ'));
    
    console.log(chalk.white('\n📚 詳細なドキュメント:'));
    console.log(chalk.gray('  - README.md - プロジェクト概要'));
    console.log(chalk.gray('  - .env.example - 環境変数の説明'));
    console.log(chalk.gray('  - .github/workflows/deploy.yml - CI/CD設定\n'));
    
  } catch (error) {
    console.error(chalk.red('❌ プロジェクトの作成中にエラーが発生しました:'), error);
    process.exit(1);
  }
}

main().catch(console.error);