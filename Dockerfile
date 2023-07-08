# syntax=docker/dockerfile:1
FROM ubuntu:latest

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get -qq update -y && apt-get -qq upgrade -y

RUN apt-get -qq install binutils apt-utils wget curl htop iputils-ping dnsutils -y

RUN apt-get -qq install lib32gcc-s1 -y 
RUN apt-get -qq update -y

RUN useradd -m -u 9999 -s /bin/bash ssm 

RUN mkdir /opt/SSM/Cloud
VOLUME /opt/SSM/Cloud
RUN ls -l
COPY release/linux/* /opt/SSM/Cloud
RUN chown -R ssm:ssm /opt/SSM/Cloud

RUN mkdir -p /SSM/Cloud/data
RUN chown -R ssm:ssm /home/ssm
RUN chown -R ssm:ssm /SSM/Cloud/data

COPY entry.sh /entry.sh
RUN chmod 755 /entry.sh

RUN ls -l /

ENTRYPOINT [ "/entry.sh" ]
