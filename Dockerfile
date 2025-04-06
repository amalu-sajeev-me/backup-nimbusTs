FROM public.ecr.aws/lambda/nodejs:18

# Install curl, tar, and ca-certificates
RUN yum install -y \
    curl \
    tar \
    gzip \
    ca-certificates && \
    yum clean all

# Install MongoDB database tools
RUN curl -O https://fastdl.mongodb.org/tools/db/mongodb-database-tools-rhel70-x86_64-100.5.2.tgz && \
    tar -zxvf mongodb-database-tools-*.tgz && \
    cp mongodb-database-tools-*/bin/* /usr/local/bin/ && \
    chmod +x /usr/local/bin/mongodump && \
    rm -rf mongodb-database-tools*

# Set working directory
WORKDIR /var/task

# Copy package files and TypeScript config
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Install all dependencies and build
RUN npm ci && npm run build

# Prune dev dependencies after build
RUN npm ci --omit=dev

# Define Lambda handler pointing to dist/index.js
CMD ["dist/index.handler"]
