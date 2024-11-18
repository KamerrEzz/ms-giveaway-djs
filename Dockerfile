FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /usr/src/app/wait-for-it.sh
RUN chmod +x /usr/src/app/wait-for-it.sh

EXPOSE 3000
RUN npx prisma generate
CMD ["sh", "-c", "./wait-for-it.sh db:5432 -- npx prisma db push && npm run start:build"]
