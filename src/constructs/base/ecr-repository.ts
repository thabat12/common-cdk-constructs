import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ECRRepositoryProps {
  /**
   * The name of the ECR repository
   */
  repositoryName: string;

  /**
   * Whether to enable image scanning on push (default: false for cost savings)
   */
  enableImageScanning?: boolean;

  /**
   * The tag mutability setting (default: MUTABLE for flexibility)
   */
  imageTagMutability?: ecr.TagMutability;

  /**
   * Number of images to keep in lifecycle policy (default: 3 for cost savings)
   */
  maxImageCount?: number;

  /**
   * Whether to enable lifecycle policy (default: true for cost savings)
   */
  enableLifecyclePolicy?: boolean;

  /**
   * Additional lifecycle rules
   */
  additionalLifecycleRules?: ecr.LifecycleRule[];

  /**
   * Encryption configuration
   */
  encryption?: ecr.RepositoryEncryption;
}

export class ECRRepository extends Construct {
  public readonly repository: ecr.Repository;
  public readonly repositoryUri: string;
  public readonly repositoryName: string;

  constructor(scope: Construct, id: string, props: ECRRepositoryProps) {
    super(scope, id);

    // Create lifecycle rules
    const lifecycleRules: ecr.LifecycleRule[] = [];

    // Add any additional lifecycle rules first (they should have lower priority)
    if (props.additionalLifecycleRules) {
      lifecycleRules.push(...props.additionalLifecycleRules);
    }

    // Add default lifecycle rule to keep only 3 images (cost-effective) with highest priority
    if (props.enableLifecyclePolicy !== false) {
      const maxPriority = lifecycleRules.length > 0 
        ? Math.max(...lifecycleRules.map(rule => rule.rulePriority || 1)) + 1
        : 1;
      
      lifecycleRules.push({
        maxImageCount: props.maxImageCount || 3,
        rulePriority: maxPriority,
        description: 'Keep only the most recent images to save costs',
      });
    }

    // Create the ECR repository
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: props.repositoryName,
      imageScanOnPush: props.enableImageScanning || false, // Default false for cost savings
      imageTagMutability: props.imageTagMutability || ecr.TagMutability.MUTABLE,
      lifecycleRules,
      encryption: props.encryption || ecr.RepositoryEncryption.AES_256,
    });

    // Store properties for easy access
    this.repositoryUri = this.repository.repositoryUri;
    this.repositoryName = props.repositoryName;

    // Add outputs for easy reference
    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.repositoryUri,
      description: 'ECR Repository URI for Docker push',
      exportName: `${this.node.id}-RepositoryUri`,
    });

    new cdk.CfnOutput(this, 'RepositoryName', {
      value: this.repositoryName,
      description: 'ECR Repository Name',
      exportName: `${this.node.id}-RepositoryName`,
    });

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: this.repository.repositoryArn,
      description: 'ECR Repository ARN',
      exportName: `${this.node.id}-RepositoryArn`,
    });
  }

  /**
   * Grant pull permissions to a principal (e.g., Fargate task role)
   */
  public grantPull(principal: iam.IPrincipal): void {
    this.repository.grantPull(principal);
  }

  /**
   * Grant push permissions to a principal (e.g., CI/CD role)
   */
  public grantPush(principal: iam.IPrincipal): void {
    this.repository.grantPush(principal);
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(principal: iam.IPrincipal): void {
    this.repository.grantRead(principal);
  }
}
