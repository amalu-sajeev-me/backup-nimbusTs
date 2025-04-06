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

# Copy and install dependencies
COPY package*.json ./
# Copy the rest of the app
COPY . .
RUN npm install

# Define Lambda handler
CMD ["index.handler"]
