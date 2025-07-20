# CDK COMMAND
## スタック一覧表示
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[].StackName" --output text

## スタック削除(実行注意)
aws cloudformation delete-stack --stack-name <stack_name>
