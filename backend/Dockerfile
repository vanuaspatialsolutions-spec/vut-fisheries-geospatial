FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source
COPY src ./src

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "src/app.js"]
