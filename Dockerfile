FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY server.js ./
COPY db.js ./
COPY public/ ./public/
COPY data/ ./data/

RUN npm install --omit=dev

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
