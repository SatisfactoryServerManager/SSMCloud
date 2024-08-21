node --experimental-sea-config sea-config.json 
node -e "require('fs').copyFileSync(process.execPath, './dist/ssmcloud-frontend.exe')"

& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool" remove /s ./dist/ssmcloud-frontend.exe

npx postject ./dist/ssmcloud-frontend.exe NODE_SEA_BLOB ./dist/ssmcloud.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 