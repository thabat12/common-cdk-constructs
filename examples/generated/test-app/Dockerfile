# Example Dockerfile for a Node.js application
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create health check endpoint
RUN echo '{"status":"healthy"}' > /app/health

# Expose port
EXPOSE 80

# Start the application
CMD ["npm", "start"]