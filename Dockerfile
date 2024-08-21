# syntax=docker/dockerfile:1
FROM node:22

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get -qq update -y && apt-get -qq upgrade -y
RUN apt-get -qq install binutils apt-utils wget curl htop iputils-ping dnsutils -y
RUN apt-get -qq update -y

RUN useradd -m -u 9999 -s /bin/bash ssm 

RUN mkdir -p /home/ssm/app/node_modules && chown -R ssm:ssm /home/ssm/app
RUN mkdir -p /SSM/Cloud/Data && chown -R ssm:ssm /SSM

WORKDIR /home/ssm/app

COPY package*.json ./

USER ssm

RUN yarn install

COPY --chown=ssm:ssm . .

RUN ls -l ./

EXPOSE 3000

CMD [ "yarn", "start" ]
