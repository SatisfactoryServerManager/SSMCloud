#!/bin/bash

export DEBIAN_FRONTEND=noninteractive

#Colors settings
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color


PLATFORM="$(uname -s)"

TEMP_DIR=$(mktemp -d /tmp/XXXXX)
INSTALL_DIR="/opt/SSM"

SSM_SERVICENAME="SSM.service"
SSM_SERVICEFILE="/etc/systemd/system/SSM.service"

QUIET=0;
SKIPMONGO=0;
UPDATE=0;

while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
    -q)
        QUIET=1
        shift # past value
        ;;
    --skipmongo)
        SKIPMONGO=1
        shift # past value
        ;;
    -u)
        UPDATE=1
        shift # past value
        ;;
    esac
done

if [ $QUIET -eq 0 ]; then
    clear;

    echo "#-----------------------------#"
    echo "#      _____ _____ __  __     #"
    echo "#     / ____/ ____|  \/  |    #"
    echo "#    | (___| (___ | \  / |    #"
    echo "#     \___ \\\\___ \| |\/| |    #"
    echo "#     ____) |___) | |  | |    #"
    echo "#    |_____/_____/|_|  |_|    #"
    echo "#-----------------------------#"
    echo "# Satisfactory Server Manager #"
    echo "#-----------------------------#"

fi


if [ ! "${PLATFORM}" == "Linux" ]; then
    echo -e "${RED}Error: Install Script Only Works On Linux Platforms!${NC}"
    exit 1
fi


function _spinner() {
    # $1 start/stop
    #
    # on start: $2 display message
    # on stop : $2 process exit status
    #           $3 spinner function pid (supplied from stop_spinner)

    local on_success="DONE"
    local on_fail="FAIL"
    local white="\e[1;37m"
    local green="\e[1;32m"
    local red="\e[1;31m"
    local nc="\e[0m"

    case $1 in
        start)

            if [ $QUIET -eq 0 ]; then
                # calculate the column where spinner and status msg will be displayed
                let column=$(tput cols)-${#2}-8
                # display message and position the cursor in $column column
                echo -ne ${2}
                printf "%${column}s"

                # start spinner
                i=1
                sp='\|/-'
                delay=${SPINNER_DELAY:-0.15}

                while :
                do
                    printf "\b${sp:i++%${#sp}:1}"
                    sleep $delay
                done
            fi
            ;;
        stop)
            if [[ -z ${3} ]]; then
                echo "spinner is not running.."
                exit 1
            fi

            kill $3 > /dev/null 2>&1

            if [ $QUIET -eq 0 ]; then
                # inform the user uppon success or failure
                echo -en "\b["
                if [[ $2 -eq 0 ]]; then
                    echo -en "${green}${on_success}${nc}"
                else
                    echo -en "${red}${on_fail}${nc}"
                fi
                echo -e "]"
            fi
            ;;
        *)
            echo "invalid argument, try {start/stop}"
            exit 1
            ;;
    esac
}

function start_spinner {
    # $1 : msg to display
    _spinner "start" "${1}" &
    # set global spinner pid
    _sp_pid=$!
    disown
}

function stop_spinner {
    # $1 : command exit status
    _spinner "stop" $1 $_sp_pid
    unset _sp_pid
}


start_spinner "${YELLOW}Updating System${NC}"
apt-get -qq update -y >/dev/null 2>&1
apt-get -qq upgrade -y >/dev/null 2>&1
stop_spinner $?

start_spinner "${YELLOW}Updating Timezone${NC}"
ln -fs /usr/share/zoneinfo/Europe/London /etc/localtime
apt-get -qq install -y tzdata >/dev/null 2>&1
dpkg-reconfigure --frontend noninteractive tzdata >/dev/null 2>&1
stop_spinner $?

start_spinner "${YELLOW}Installing Prereqs${NC}"
apt-get -qq install apt-utils curl wget jq binutils software-properties-common libcap2-bin unzip zip -y >/dev/null 2>&1
apt-get -qq update -y >/dev/null 2>&1
stop_spinner $?

INSTALLMONGO=0;


if [ $QUIET -eq 0 ]; then
    read -r -p "Do you want to install MongoDB? [y/N]: " response </dev/tty
    case $response in
    [yY]*)
        INSTALLMONGO=1
    ;;
    *)
        INSTALLMONGO=0;
    ;;
    esac
fi

if [ $SKIPMONGO -eq 1 ]; then
    INSTALLMONGO=0;
fi

if [ $INSTALLMONGO -eq 1 ]; then
    start_spinner "${YELLOW}Installing MongoDB 5.0${NC}"
    apt-get install gnupg > /dev/null
    wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add - > /dev/null 2>&1
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list > /dev/null 2>&1
    apt-get update > /dev/null;
    apt-get install -y mongodb-org mongodb-org-shell > /dev/null;
    stop_spinner $?
    systemctl daemon-reload > /dev/null 2>&1
    systemctl enable mongod > /dev/null 2>&1

    start_spinner "${YELLOW}Waiting for MongoDB to start...${NC}"
    service mongod start > /dev/null 2>&1
    sleep 10

    stop_spinner $?

cat >/etc/mongosetup.js <<EOL
db.system.users.remove({});
db.system.version.remove({});
db.system.version.insert({"_id": "authSchema", "currentVersion": 3});
EOL
  mongo /etc/mongosetup.js > /dev/null 2>&1

  start_spinner "${YELLOW}Restarting MongoDB......${NC}"
  service mongod restart > /dev/null 2>&1
  sleep 5
   stop_spinner $?

cat > /etc/mongosetup_ssm.js <<EOL
db = db.getSiblingDB('ssm');
db.dropAllUsers();
db.createUser({"user": "ssm", "pwd": "#SSMPa$£", "roles": ["readWrite", "dbAdmin"]});
EOL
  mongo /etc/mongosetup_ssm.js > /dev/null 2>&1
else
    if [ $QUIET -eq 0 ]; then
        echo -e "${RED}MongoDB install skipped...${NC}"
    fi
    start_spinner "${YELLOW}Installing MongoDB Tools...${NC}"
    wget https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/5.0/multiverse/binary-amd64/mongodb-org-database-tools-extra_5.0.6_amd64.deb > /dev/null 2>&1;
    dpkg -i mongodb-org-database-tools-extra_5.0.6_amd64.deb > /dev/null 2>&1;
    rm -rf mongodb-org-database-tools-extra_5.0.6_amd64.deb > /dev/null 2>&1
    stop_spinner $?
  
fi


if [ -d "${INSTALL_DIR}" ]; then

    if [ $QUIET -eq 0 ]; then
        read -r -p "Do you want to update SSM? [y/N]: " response </dev/tty
        case $response in
        [yY]*)
        ;;
        *)
            echo -e "${RED}Update Skipped.. Exiting ${NC}"
            exit 1
        ;;
        esac
    elif [ $UPDATE -eq 0 ]; then
        exit 1;
    fi
else
    mkdir -p ${INSTALL_DIR} >/dev/null 2>&1
fi

SSM_SERVICE=$(
        systemctl list-units --full -all | grep -Fq "${SSM_SERVICENAME}"
        echo $?
    )

if [ -f "${SSM_SERVICEFILE}" ]; then
    if [ ${SSM_SERVICE} -eq 0 ]; then
        start_spinner "${YELLOW}Stopping SSM Service${NC}"
        systemctl stop ${SSM_SERVICENAME}
        stop_spinner $?
    fi
fi

start_spinner "${YELLOW}Downloading SSM Binaries${NC}"

curl --silent "https://api.github.com/repos/satisfactoryservermanager/ssmcloud/releases/latest" >${TEMP_DIR}/SSM_releases.json
SSM_VER=$(cat ${TEMP_DIR}/SSM_releases.json | jq -r ".tag_name")
SSM_URL=$(cat ${TEMP_DIR}/SSM_releases.json | jq -r ".assets[].browser_download_url" | grep -i "Linux" | sort | head -1)

rm -r ${INSTALL_DIR}/* >/dev/null 2>&1

wget -q "${SSM_URL}" -O "${INSTALL_DIR}/SSMCloud.zip"
unzip -q "${INSTALL_DIR}/SSMCloud.zip" -d "${INSTALL_DIR}"

mv "${INSTALL_DIR}/release/linux/SSMCloud" "${INSTALL_DIR}" >/dev/null 2>&1
rm -r "${INSTALL_DIR}/release/linux" >/dev/null 2>&1

rm "${INSTALL_DIR}/SSMCloud.zip" >/dev/null 2>&1
rm "${INSTALL_DIR}/build.log" >/dev/null 2>&1
echo ${SSM_VER} >"${INSTALL_DIR}/version.txt"
stop_spinner $?

start_spinner "${YELLOW}Creating SSM User account${NC}"
if id "ssm" &>/dev/null; then
    usermod -u 9999 ssm >/dev/null 2>&1
    groupmod -g 9999 ssm >/dev/null 2>&1

    chown -R ssm:ssm /home/ssm >/dev/null 2>&1
    chown -R ssm:ssm /opt/SSM >/dev/null 2>&1
else
    useradd -m ssm -u 9999 -s /bin/bash >/dev/null 2>&1
fi

chmod -R 777 ${INSTALL_DIR} >/dev/null 2>&1
chown -R ssm:ssm ${INSTALL_DIR} >/dev/null 2>&1

stop_spinner $?

setcap cap_net_bind_service=+ep $(readlink -f /opt/SSM/SSMCloud)


ENV_SYSTEMD=$(pidof systemd | wc -l)
ENV_SYSTEMCTL=$(which systemctl | wc -l)

if [[ ${ENV_SYSTEMD} -eq 0 ]] && [[ ${ENV_SYSTEMCTL} -eq 0 ]]; then
    echo -e "${RED}Error: Cant install service on this system!${NC}"
    exit 3
fi

if [ ${SSM_SERVICE} -eq 0 ]; then
    start_spinner "${YELLOW}Removing Old SSM Service${NC}"
    systemctl disable ${SSM_SERVICENAME} >/dev/null 2>&1
    rm -r "${SSM_SERVICEFILE}" >/dev/null 2>&1
    systemctl daemon-reload >/dev/null 2>&1
    stop_spinner $?
fi

start_spinner "${YELLOW}Creating SSM Service${NC}"

cat >>${SSM_SERVICEFILE} <<EOL
[Unit]
Description=SatisfactoryServerManager Daemon
After=network.target

[Service]
User=ssm
Group=ssm

Type=simple
WorkingDirectory=/opt/SSM
ExecStart=/opt/SSM/SSMCloud
TimeoutStopSec=20
KillMode=process
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL
sleep 1
stop_spinner $?

start_spinner "${YELLOW}Starting SSM Service${NC}"
systemctl daemon-reload >/dev/null 2>&1
systemctl enable ${SSM_SERVICENAME} >/dev/null 2>&1
systemctl start ${SSM_SERVICENAME} >/dev/null 2>&1
stop_spinner $?

exit 0