#!/bin/bash

# Thanks goes to @pete-otaqui for the initial gist:
# https://gist.github.com/pete-otaqui/4188238
#
# Original version modified by Marek Suscak
#
# works with a file called VERSION in the current directory,
# the contents of which should be a semantic version number
# such as "1.2.3" or even "1.2.3-beta+001.ab"

# this script will display the current version, automatically
# suggest a "minor" version update, and ask for input to use
# the suggestion, or a newly entered value.

# once the new version number is determined, the script will
# pull a list of changes from git history, prepend this to
# a file called CHANGELOG.md (under the title of the new version
# number), give user a chance to review and update the changelist
# manually if needed and create a GIT tag.

NOW="$(date +'%B %d, %Y')"
RED="\033[1;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
PURPLE="\033[1;35m"
CYAN="\033[1;36m"
WHITE="\033[1;37m"
RESET="\033[0m"

LATEST_HASH=$(git log --pretty=format:'%h' -n 1)

QUESTION_FLAG="${GREEN}?"
WARNING_FLAG="${YELLOW}!"
NOTICE_FLAG="${CYAN}❯"

ADJUSTMENTS_MSG="${QUESTION_FLAG} ${CYAN}Now you can make adjustments to ${WHITE}CHANGELOG.md${CYAN}. Then press enter to continue.${RESET}"
PUSHING_MSG="${NOTICE_FLAG} Pushing new version to the ${WHITE}origin${CYAN}...${RESET}"

if [ -f VERSION ]; then
    BASE_STRING=$(cat VERSION)
    BASE_LIST=($(echo $BASE_STRING | tr '.' ' '))
    V_MAJOR=${BASE_LIST[0]}
    V_MINOR=${BASE_LIST[1]}
    V_PATCH=${BASE_LIST[2]}
    echo -e "${NOTICE_FLAG} Current version: ${WHITE}$BASE_STRING${RESET}"
    echo -e "${NOTICE_FLAG} Latest commit hash: ${WHITE}$LATEST_HASH${RESET}"
    V_PATCH=$((V_PATCH + 1))
    SUGGESTED_VERSION="$V_MAJOR.$V_MINOR.$V_PATCH"
    echo -ne "${QUESTION_FLAG} ${CYAN}Enter a version number [${WHITE}$SUGGESTED_VERSION${CYAN}]:${RESET} "
    read INPUT_STRING
    if [ "$INPUT_STRING" = "" ]; then
        INPUT_STRING=$SUGGESTED_VERSION
    fi
    echo -e "${NOTICE_FLAG} Will set new version to be ${WHITE}$INPUT_STRING${RESET}"
    echo -en $INPUT_STRING >VERSION
    sed -i "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$INPUT_STRING\"/g" package.json
    echo "## $INPUT_STRING ($NOW)" >tmpfile
    git log --pretty=format:"  - %s" "v$BASE_STRING"...HEAD >>tmpfile
    echo "" >>tmpfile
    echo "" >>tmpfile
    cat CHANGELOG.md >>tmpfile
    mv tmpfile CHANGELOG.md
    echo -e "$ADJUSTMENTS_MSG"
    read
    echo -e "$PUSHING_MSG"
    git add CHANGELOG.md VERSION
    git commit -m "Bump version to ${INPUT_STRING}."
    git push
    git tag -a -m "Tag version ${INPUT_STRING}." "v$INPUT_STRING"
    git push origin --tags
else
    echo -e "${WARNING_FLAG} Could not find a VERSION file.${RESET}"
    echo -ne "${QUESTION_FLAG} ${CYAN}Do you want to create a version file and start from scratch? [${WHITE}y${CYAN}]:${RESET} "
    read RESPONSE
    if [ "$RESPONSE" = "" ]; then RESPONSE="y"; fi
    if [ "$RESPONSE" = "Y" ]; then RESPONSE="y"; fi
    if [ "$RESPONSE" = "Yes" ]; then RESPONSE="y"; fi
    if [ "$RESPONSE" = "yes" ]; then RESPONSE="y"; fi
    if [ "$RESPONSE" = "YES" ]; then RESPONSE="y"; fi
    if [ "$RESPONSE" = "y" ]; then
        echo -en "1.0.0" >VERSION
        echo "## 1.0.0 ($NOW)" >CHANGELOG.md
        git log --pretty=format:"  - %s" >>CHANGELOG.md
        echo "" >>CHANGELOG.md
        echo "" >>CHANGELOG.md
        echo -e "$ADJUSTMENTS_MSG"
        read
        echo -e "$PUSHING_MSG"
        git add VERSION CHANGELOG.md
        git commit -m "Add VERSION and CHANGELOG.md files, Bump version to v1.0.0."
        git push
        git tag -a -m "Tag version 1.0.0." "v1.0.0"
        git push origin --tags
    fi
fi

echo -e "${NOTICE_FLAG} Finished.${RESET}"
