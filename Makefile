# Start and stop the app. Run `make` or `make help` for the list.

# Docker Desktop puts docker in ~/.docker/bin, which is not always on PATH.
DOCKER ?= $(shell command -v docker 2>/dev/null || echo $(HOME)/.docker/bin/docker)

.DEFAULT_GOAL := help
.PHONY: help up down e2e e2e-update

help: ## Show the available commands
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{ printf "  make %-11s %s\n", $$1, $$2 }'

up: ## Build and start the app on http://localhost:8080 (rebuilds, so changes are included)
	$(DOCKER) compose up --build -d
	@echo "mtheorizer is running on http://localhost:8080"

down: ## Stop the app
	$(DOCKER) compose down

e2e: ## Run the Playwright smoke and screenshot tests against the built app
	$(DOCKER) compose --profile e2e run --build --rm e2e

e2e-update: ## Rewrite the screenshot baselines in e2e/tests/*-snapshots (review the diff before committing)
	$(DOCKER) compose --profile e2e run --build --rm e2e npx playwright test --update-snapshots
