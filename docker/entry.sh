#!/bin/bash

chown -R ssm:ssm /opt/SSM
chown -R ssm:ssm /home/ssm

#Define cleanup procedure
cleanup() {
    echo "Container stopped, performing cleanup..."
    pid=$(ps -ef | awk '$8=="/opt/SSM/ssmcloud-frontend" {print $2}')
    kill -INT $pid

    while true; do
        echo "Waiting for process to finish"
        pid=$(ps -ef | awk '$8=="/opt/SSM/ssmcloud-frontend" {print $2}')
        if [ "$pid" == "" ]; then
            break
        fi
        sleep 5
    done
    exit 0
}

#Trap SIGTERM
trap 'cleanup' SIGTERM

hostname

su ssm -c "/opt/SSM/ssmcloud-frontend" &

wait $!
sleep 40
