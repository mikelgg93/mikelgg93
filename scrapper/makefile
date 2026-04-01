.PHONY: install
install: ## Install the virtual environment and install the pre-commit hooks
	@echo "🏗️ Creating virtual environment using uv"
	@uv sync
	@uv run prek install

.PHONY: check
check: ## Run all checks: linting, type checking, and tests
	@echo "🔑 Checking lock file consistency with 'pyproject.toml'"
	@uv lock --locked
	@echo "🧹 Linting code: Running prek"
	@uv run prek run -a
	@echo "🚀 Static type checking: Running ty"
	@uv run ty check
	@echo "🚀 Checking for obsolete dependencies: Running deptry"
	@uv run deptry .

.PHONY: test
test: ## Run the test suite with coverage
	@echo "🧪 Testing code: Running pytest"
	@uv run python -m pytest --cov --cov-config=pyproject.toml --cov-report=html

.PHONY: help
help:
	@uv run python -c "import re; \
	[[print(f'\033[36m{m[0]:<20}\033[0m {m[1]}') for m in re.findall(r'^([a-zA-Z_-]+):.*?## (.*)$$', open(makefile).read(), re.M)] for makefile in ('$(MAKEFILE_LIST)').strip().split()]"

.DEFAULT_GOAL := help
