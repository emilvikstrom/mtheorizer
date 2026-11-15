# Start and stop the app. Run `make` or `make help` for the list.

# Docker Desktop puts docker in ~/.docker/bin, which is not always on PATH.
DOCKER ?= $(shell command -v docker 2>/dev/null || echo $(HOME)/.docker/bin/docker)

.DEFAULT_GOAL := help
.PHONY: help up down

help: ## Show the available commands
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{ printf "  make %-6s %s\n", $$1, $$2 }'

up: ## Build and start the app on http://localhost:8080 (rebuilds, so changes are included)
	$(DOCKER) compose up --build -d
	@echo "mtheorizer is running on http://localhost:8080"

down: ## Stop the app
	$(DOCKER) compose down
