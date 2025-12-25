FROM node:18

RUN apt update && apt install -y ffmpeg

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 3000
CMD ["node", "index.js"]