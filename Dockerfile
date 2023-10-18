# Use the official Node.js runtime as the base image
FROM node:alpine

# Set the working directory
WORKDIR /app

# Copy the 'frontend' directory into the container
COPY frontend/ ./frontend/

# Change to the 'frontend' directory
WORKDIR /app/frontend

# Install dependencies
RUN npm install

# Build the Next.js app
RUN npm run build

# Expose port 3000 for the app
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "start"]
