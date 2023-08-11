FROM node:20

WORKDIR /app

COPY ./package.json .
RUN npm install

COPY ./train.js ./train.js
COPY ./skill ./skill/

CMD [ "node", "./train.js" ]
