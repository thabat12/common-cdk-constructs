#!/bin/bash

# 🚀 CDK Fargate Scaffold - Deployment Script
# This script makes deploying Docker applications to Fargate extremely fast and easy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check AWS CLI configuration
check_aws_config() {
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_success "AWS CLI is configured and working"
}

# Function to check CDK installation
check_cdk() {
    if ! command_exists cdk; then
        print_error "AWS CDK is not installed. Please install it first: npm install -g aws-cdk"
        exit 1
    fi

    print_success "AWS CDK is installed"
}

# Function to check Node.js and npm
check_node() {
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi

    if ! command_exists npm; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi

    print_success "Node.js and npm are installed"
}

# Function to load environment variables
load_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        print_status "Please copy env.example to .env and configure your values:"
        echo "  cp env.example .env"
        echo "  # Then edit .env with your configuration"
        exit 1
    fi

    print_status "Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
    
    # Validate required environment variables
    local required_vars=("APP_NAME" "AWS_REGION" "AWS_ACCOUNT_ID")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    print_success "Environment variables loaded"
}

# Function to display configuration
show_config() {
    print_status "Deployment Configuration:"
    echo "  Application: $APP_NAME"
    echo "  Environment: ${ENVIRONMENT:-dev}"
    echo "  AWS Region: $AWS_REGION"
    echo "  AWS Account: $AWS_ACCOUNT_ID"
    echo "  Docker Image: ${DOCKER_IMAGE:-$APP_NAME}"
    echo "  Fargate CPU: ${FARGATE_CPU:-256}"
    echo "  Fargate Memory: ${FARGATE_MEMORY:-512} MB"
    echo "  Desired Count: ${DESIRED_COUNT:-1}"
    echo "  Max Capacity: ${AUTO_SCALING_MAX_CAPACITY:-5}"
    echo ""
}

# Function to bootstrap CDK (if needed)
bootstrap_cdk() {
    print_status "Checking if CDK is bootstrapped..."
    
    if ! aws cloudformation describe-stacks --stack-name CDKToolkit >/dev/null 2>&1; then
        print_warning "CDK is not bootstrapped. Bootstrapping now..."
        print_status "This may take a few minutes..."
        
        npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
        
        if [ $? -eq 0 ]; then
            print_success "CDK bootstrapped successfully"
        else
            print_error "CDK bootstrap failed"
            exit 1
        fi
    else
        print_success "CDK is already bootstrapped"
    fi
}

# Function to install dependencies
install_deps() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed, skipping..."
    fi
}

# Function to build the project
build_project() {
    print_status "Building the project..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Project built successfully"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Function to deploy the CDK stack
deploy_stack() {
    local environment=${ENVIRONMENT:-dev}
    
    print_status "Deploying CDK stack for environment: $environment"
    print_status "This may take 10-15 minutes..."
    
    # Deploy with environment context
    npx cdk deploy --all --context environment=$environment
    
    if [ $? -eq 0 ]; then
        print_success "CDK stack deployed successfully!"
    else
        print_error "CDK deployment failed"
        exit 1
    fi
}

# Function to deploy Docker image (if ECR repository exists)
deploy_image() {
    if [ -n "$DOCKER_IMAGE" ] && [ "$DOCKER_IMAGE" != "$APP_NAME" ]; then
        print_status "Docker image specified: $DOCKER_IMAGE"
        print_status "Skipping Docker image deployment (using existing image)"
        return
    fi
    
    print_status "Checking if Docker image deployment is needed..."
    
    # Check if we have a Dockerfile
    if [ -f "Dockerfile" ]; then
        print_status "Dockerfile found. Deploying Docker image..."
        
        # Check if we have the deploy-image script
        if [ -f "scripts/deploy-image.sh" ]; then
            ./scripts/deploy-image.sh
        else
            print_warning "deploy-image.sh script not found. Please deploy your Docker image manually."
        fi
    else
        print_status "No Dockerfile found. Skipping Docker image deployment."
    fi
}

# Function to show deployment summary
show_summary() {
    print_success "🎉 Deployment completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "  1. Check your AWS Console for the deployed resources"
    echo "  2. Monitor CloudWatch logs for your application"
    echo "  3. Test your application endpoint"
    echo ""
    print_status "Useful commands:"
    echo "  - View logs: npm run logs"
    echo "  - Check status: npm run status"
    echo "  - Destroy stack: npm run destroy"
    echo ""
}

# Function to show help
show_help() {
    echo "🚀 CDK Fargate Scaffold - Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -e, --environment   Specify environment (dev, staging, production)"
    echo "  -s, --skip-build    Skip building the project"
    echo "  -i, --skip-image    Skip Docker image deployment"
    echo "  -f, --force         Force deployment even if there are no changes"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy to dev environment"
    echo "  $0 -e production      # Deploy to production environment"
    echo "  $0 -s -i              # Skip build and image deployment"
    echo ""
}

# Main deployment function
main() {
    local environment=""
    local skip_build=false
    local skip_image=false
    local force=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -s|--skip-build)
                skip_build=true
                shift
                ;;
            -i|--skip-image)
                skip_image=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Set environment if specified
    if [ -n "$environment" ]; then
        export ENVIRONMENT="$environment"
    fi
    
    echo "🚀 Starting CDK Fargate Scaffold deployment..."
    echo "================================================"
    
    # Pre-flight checks
    check_node
    check_aws_config
    check_cdk
    
    # Load environment and show configuration
    load_env
    show_config
    
    # Bootstrap CDK if needed
    bootstrap_cdk
    
    # Install dependencies
    install_deps
    
    # Build project (unless skipped)
    if [ "$skip_build" = false ]; then
        build_project
    else
        print_warning "Skipping build as requested"
    fi
    
    # Deploy CDK stack
    deploy_stack
    
    # Deploy Docker image (unless skipped)
    if [ "$skip_image" = false ]; then
        deploy_image
    else
        print_warning "Skipping Docker image deployment as requested"
    fi
    
    # Show deployment summary
    show_summary
}

# Run main function with all arguments
main "$@"
