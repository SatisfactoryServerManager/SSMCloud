#!/bin/bash
chown -R ssm:ssm /SSM/Cloud/data
chown -R ssm:ssm /opt/SSM
chmod -R 777 /SSM

su ssm -c "/opt/SSM/Cloud/SSMCloud"
