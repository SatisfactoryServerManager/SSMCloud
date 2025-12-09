#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
BASEDIR="${DIR}/../"

CSS_DIR="${BASEDIR}/static/css"

echo -en "\nMain CSS ... "
cleancss -o ${CSS_DIR}/main.min.css ${CSS_DIR}/main.css
echo -en "Finished!\n"

echo -en "\nPublic CSS ... "
cleancss -o ${CSS_DIR}/public.min.css ${CSS_DIR}/public.css
echo -en "Finished!\n"

echo -en "\nLogin CSS ... "
cleancss -o ${CSS_DIR}/login.min.css ${CSS_DIR}/login.css
echo -en "Finished!\n"

echo -en "\nMaster CSS ... "
cleancss -o ${CSS_DIR}/master.min.css ${CSS_DIR}/master.css
echo -en "Finished!\n\n"
