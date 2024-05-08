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

QUIET=0
SKIPMONGO=0
UPDATE=0

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
    clear

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

            while :; do
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

        kill $3 >/dev/null 2>&1

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
apt-get -qq install git apt-utils curl wget jq binutils software-properties-common libcap2-bin unzip zip -y >/dev/null 2>&1
apt-get -qq update -y >/dev/null 2>&1
stop_spinner $?

start_spinner "${YELLOW}Installing Docker${NC}"
wget -q https://get.docker.com/ -O - | sh >/dev/null 2>&1
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

stop_spinner $?

start_spinner "${YELLOW}Cloning SSM Cloud Repo${NC}"
git clone https://github.com/SatisfactoryServerManager/SSMCloud.git /tmp/ssmcloud-repo >/dev/null 2>&1
cp -r /tmp/ssmcloud-repo/deploy/docker-compose /home/ssm/. >/dev/null 2>&1
rm -r /tmp/ssmcloud-repo >/dev/null 2>&1

cd /home/ssm/docker-compose
docker compose pull -q
cd ~/.

stop_spinner $?

start_spinner "${YELLOW}Starting SSM Cloud containers${NC}"
cd /home/ssm/docker-compose
docker compose up -d -q
stop_spinner $?

exit 0
