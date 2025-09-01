#!/bin/bash

# 🐳 Docker Image Deployment Script for CDK Fargate Scaffold
# This script builds and pushes Docker images to ECR for fast deployments

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

# Function to check Docker installation
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi

    print_success "Docker is installed and running"
}

# Function to load environment variables
load_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        print_status "Please copy env.example to .env and configure your values:"
        echo "  cp env.example .env"
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

# Function to check if Dockerfile exists
check_dockerfile() {
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile not found in current directory!"
        print_status "Please create a Dockerfile or run this script from the directory containing it."
        exit 1
    fi

    print_success "Dockerfile found"
}

# Function to get ECR login token
ecr_login() {
    print_status "Logging into ECR..."
    
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    if [ $? -eq 0 ]; then
        print_success "Successfully logged into ECR"
    else
        print_error "Failed to log into ECR"
        exit 1
    fi
}

# Function to create ECR repository if it doesn't exist
create_ecr_repo() {
    local repo_name=$1
    
    print_status "Checking if ECR repository '$repo_name' exists..."
    
    if ! aws ecr describe-repositories --repository-names "$repo_name" --region $AWS_REGION >/dev/null 2>&1; then
        print_warning "ECR repository '$repo_name' does not exist. Creating it..."
        
        aws ecr create-repository \
            --repository-name "$repo_name" \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
        
        if [ $? -eq 0 ]; then
            print_success "ECR repository '$repo_name' created successfully"
        else
            print_error "Failed to create ECR repository"
            exit 1
        fi
    else
        print_success "ECR repository '$repo_name' already exists"
    fi
}

# Function to build Docker image
build_image() {
    local image_name=$1
    local tag=$2
    
    print_status "Building Docker image: $image_name:$tag"
    
    # Build with build args if .dockerignore exists
    local build_args=""
    if [ -f ".dockerignore" ]; then
        print_status "Using .dockerignore for optimized build"
    fi
    
    # Build the image
    docker build -t "$image_name:$tag" .
    
    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully: $image_name:$tag"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
}

# Function to tag Docker image for ECR
tag_for_ecr() {
    local local_image=$1
    local ecr_uri=$2
    local tag=$3
    
    print_status "Tagging image for ECR: $ecr_uri:$tag"
    
    docker tag "$local_image:$tag" "$ecr_uri:$tag"
    
    if [ $? -eq 0 ]; then
        print_success "Image tagged for ECR: $ecr_uri:$tag"
    else
        print_error "Failed to tag image for ECR"
        exit 1
    fi
}

# Function to push Docker image to ECR
push_to_ecr() {
    local ecr_uri=$1
    local tag=$2
    
    print_status "Pushing image to ECR: $ecr_uri:$tag"
    print_status "This may take a few minutes depending on image size..."
    
    docker push "$ecr_uri:$tag"
    
    if [ $? -eq 0 ]; then
        print_success "Image pushed to ECR successfully: $ecr_uri:$tag"
    else
        print_error "Failed to push image to ECR"
        exit 1
    fi
}

# Function to clean up local images
cleanup_local() {
    local image_name=$1
    local tag=$2
    
    print_status "Cleaning up local Docker images..."
    
    # Remove the tagged image
    docker rmi "$image_name:$tag" 2>/dev/null || true
    
    # Remove the ECR tagged image
    local ecr_uri="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"
    docker rmi "$ecr_uri:$tag" 2>/dev/null || true
    
    print_success "Local images cleaned up"
}

# Function to show deployment summary
show_summary() {
    local ecr_uri="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"
    local tag=${IMAGE_TAG:-latest}
    
    print_success "🎉 Docker image deployment completed successfully!"
    echo ""
    print_status "Image Details:"
    echo "  ECR Repository: $ecr_uri"
    echo "  Image Tag: $tag"
    echo "  Full URI: $ecr_uri:$tag"
    echo ""
    print_status "Next steps:"
    echo "  1. Deploy your CDK stack: ./scripts/deploy.sh"
    echo "  2. Monitor the deployment in AWS Console"
    echo "  3. Check ECS service status"
    echo ""
    print_status "Useful commands:"
    echo "  - View ECR repository: aws ecr describe-repositories --repository-names $APP_NAME"
    echo "  - List images: aws ecr list-images --repository-name $APP_NAME"
    echo "  - View image details: aws ecr describe-images --repository-name $APP_NAME --image-ids imageTag=$tag"
    echo ""
}

# Function to show help
show_help() {
    echo "🐳 Docker Image Deployment Script for CDK Fargate Scaffold"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -t, --tag TAG       Specify image tag (default: latest)"
    echo "  -f, --force         Force rebuild even if image exists"
    echo "  -c, --cleanup       Clean up local images after push"
    echo "  -n, --no-push       Only build, don't push to ECR"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build and push with 'latest' tag"
    echo "  $0 -t v1.0.0         # Build and push with 'v1.0.0' tag"
    echo "  $0 -f -c             # Force rebuild and cleanup"
    echo "  $0 -n                # Only build, don't push"
    echo ""
}

# Main deployment function
main() {
    local image_tag="latest"
    local force_rebuild=false
    local cleanup_after=false
    local no_push=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -t|--tag)
                image_tag="$2"
                shift 2
                ;;
            -f|--force)
                force_rebuild=true
                shift
                ;;
            -c|--cleanup)
                cleanup_after=true
                shift
                ;;
            -n|--no-push)
                no_push=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo "🐳 Starting Docker image deployment..."
    echo "====================================="
    
    # Pre-flight checks
    check_docker
    
    # Load environment variables
    load_env
    
    # Check for Dockerfile
    check_dockerfile
    
    # Set image names
    local local_image_name="$APP_NAME"
    local ecr_uri="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"
    
    print_status "Deployment Configuration:"
    echo "  Application: $APP_NAME"
    echo "  AWS Region: $AWS_REGION"
    echo "  AWS Account: $AWS_ACCOUNT_ID"
    echo "  Image Tag: $image_tag"
    echo "  Local Image: $local_image_name:$image_tag"
    echo "  ECR URI: $ecr_uri:$image_tag"
    echo ""
    
    # Create ECR repository if it doesn't exist
    create_ecr_repo "$APP_NAME"
    
    # Login to ECR
    ecr_login
    
    # Build Docker image
    build_image "$local_image_name" "$image_tag"
    
    # Tag image for ECR
    tag_for_ecr "$local_image_name" "$ecr_uri" "$image_tag"
    
    # Push to ECR (unless --no-push is specified)
    if [ "$no_push" = false ]; then
        push_to_ecr "$ecr_uri" "$image_tag"
    else
        print_warning "Skipping push to ECR as requested"
    fi
    
    # Cleanup local images if requested
    if [ "$cleanup_after" = true ]; then
        cleanup_local "$local_image_name" "$image_tag"
    fi
    
    # Show deployment summary
    show_summary
}

# Run main function with all arguments
main "$@"
