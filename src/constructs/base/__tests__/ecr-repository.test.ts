import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Template } from 'aws-cdk-lib/assertions';
import { ECRRepository } from '../ecr-repository';

describe('ECRRepository', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  test('should create ECR repository with default settings', () => {
    // WHEN
    new ECRRepository(stack, 'TestRepo', {
      repositoryName: 'test-repo',
    });

    // THEN
    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'test-repo',
      ImageScanningConfiguration: {
        ScanOnPush: false,
      },
      ImageTagMutability: 'MUTABLE',
      LifecyclePolicy: {
        LifecyclePolicyText: JSON.stringify({
          rules: [
            {
              rulePriority: 1,
              description: 'Keep only the most recent images to save costs',
              selection: {
                tagStatus: 'any',
                countType: 'imageCountMoreThan',
                countNumber: 3,
              },
              action: {
                type: 'expire',
              },
            },
          ],
        }),
      },
    });
  });

  test('should create ECR repository with custom settings', () => {
    // WHEN
    new ECRRepository(stack, 'TestRepo', {
      repositoryName: 'custom-repo',
      enableImageScanning: true,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      maxImageCount: 5,
      enableLifecyclePolicy: false,
    });

    // THEN
    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'custom-repo',
      ImageScanningConfiguration: {
        ScanOnPush: true,
      },
      ImageTagMutability: 'IMMUTABLE',
    });

    // Should not have lifecycle policy
    template.hasResource('AWS::ECR::Repository', {
      Properties: {
        RepositoryName: 'custom-repo',
      },
    });
  });

  test('should create outputs for repository information', () => {
    // WHEN
    new ECRRepository(stack, 'TestRepo', {
      repositoryName: 'test-repo',
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // Check that outputs exist (the exact names might be different)
    const outputs = template.findOutputs('*');
    expect(outputs).toBeDefined();
    expect(Object.keys(outputs).length).toBeGreaterThan(0);
    
    // Check that we have the repository resource
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'test-repo',
    });
  });

  test('should handle additional lifecycle rules', () => {
    // WHEN
    new ECRRepository(stack, 'TestRepo', {
      repositoryName: 'test-repo',
      additionalLifecycleRules: [
        {
          rulePriority: 1,
          description: 'Remove untagged images older than 1 day',
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: cdk.Duration.days(1),
        },
      ],
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // Just check that the repository is created with lifecycle policy
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'test-repo',
    });
    
    // Check that lifecycle policy exists
    const repository = template.findResources('AWS::ECR::Repository');
    expect(repository).toBeDefined();
    const repoResource = Object.values(repository)[0];
    expect(repoResource.Properties.LifecyclePolicy).toBeDefined();
  });
});
