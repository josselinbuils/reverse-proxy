FROM node:8
COPY . reverse-proxy
WORKDIR reverse-proxy
RUN npm install --production
CMD ["npm", "start"]
