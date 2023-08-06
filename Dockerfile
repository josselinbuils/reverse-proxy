FROM node:18

COPY . reverse-proxy

WORKDIR reverse-proxy

RUN git clone --bare https://github.com/josselinbuils/reverse-proxy.git .git && \
    git config --local --bool core.bare false && \
    git reset HEAD -- . && \
    yarn install --emoji --frozen-lockfile --no-progress && \
    yarn build

CMD ["yarn", "start"]
