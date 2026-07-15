FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "if [ \"$PROCESS_TYPE\" = \"worker\" ]; then node src/worker.js; else node src/server.js; fi"]
