# Makefile for Go app with ngrok

APP_NAME := ssmcloud-frontend
PORT := 8083
GO_BUILD := go build -o bin/$(APP_NAME)
NGROK_BIN := ngrok

.PHONY: build run serve ngrok kill clean

build:
	@echo "🔨 Building Go app..."
	@if [ ! -d bin ]; then mkdir bin; fi
	$(GO_BUILD) .

run: build bundle cleancss
	@echo "🚀 Running Go app..."
	./bin/$(APP_NAME)

serve: kill build
	@echo "🚀 Running Go app in background..."
	./bin/$(APP_NAME) & echo $$! > app.pid
	sleep 2
	@echo "🌐 Starting ngrok on port $(PORT)..."
	$(NGROK_BIN) http --domain=handy-outgoing-finch.ngrok-free.app $(PORT) > /dev/null & echo $$! > ngrok.pid

ngrok:
	@echo "🌐 Starting ngrok on port $(PORT)..."
	$(NGROK_BIN) http --domain=handy-outgoing-finch.ngrok-free.app $(PORT) > /dev/null & echo $$! > ngrok.pid

kill:
	@echo "🛑 Killing Go app (if running)..."
	@if [ -f app.pid ]; then kill `cat app.pid` && rm app.pid; fi
	@if [ -f ngrok.pid ]; then kill `cat ngrok.pid` && rm ngrok.pid; fi

cleancss: 
	@echo "Running css clean"
	bash ./scripts/clean-css.sh

bundle:
	browserify src/client/app.js -o static/js/bundle.js
	browserify src/client/map.js -o static/js/map.bundle.js

watch:
	watchify src/client/app.js -o static/js/bundle.js

watchmap:
	watchify src/client/map.js -o static/js/map.bundle.js

clean: kill
	@echo "🧹 Cleaning up..."
	rm -f $(APP_NAME)

docker-build: kill build
	@echo "Building Docker Image"
	docker build -t gitea.hostxtra.co.uk/hostxtra/hostxtra:latest .