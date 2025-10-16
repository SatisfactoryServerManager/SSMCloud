# syntax=docker/dockerfile:1
FROM golang:1.24

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get -qq update -y &&\
    apt-get -qq install apt-utils wget curl -y &&\
    mkdir /opt/SSM &&\
    useradd -m -u 9999 -s /bin/bash ssm 

COPY entry.sh /
COPY release/* /opt/SSM/

RUN chmod 777 /entry.sh && chown -R ssm:ssm /opt/SSM && chmod -R 777 /opt/SSM

ENTRYPOINT [ "/entry.sh" ]
