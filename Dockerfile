FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy server source
COPY server/ ./

EXPOSE 3000

CMD ["node", "index.js"]
