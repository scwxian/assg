#!/usr/bin/env bash

# This script automates the process of building the Vite project.
# It detects if nerdctl.lima or docker is available to build in an isolated environment.
# Otherwise, it falls back to a standard local npm build.

set -e
set -o pipefail

readonly IMAGE_NAME="static-site-build:latest"

echo "🚀 Starting the build process..."
echo "Step 0: 🧹 Cleaning up the old ./dist directory..."
rm -rf ./dist

if command -v nerdctl.lima &>/dev/null; then
	echo "Step 1: 🐳 nerdctl.lima detected. Building the isolated image: $IMAGE_NAME"
	nerdctl.lima build -t "$IMAGE_NAME" .

	echo "Step 2: 📦 Extracting files from the build container..."
	CID=$(nerdctl.lima run -d "$IMAGE_NAME" sleep 30)
	nerdctl.lima cp "$CID":/app/dist ./dist
	nerdctl.lima rm -f "$CID"

	echo "Step 3: 🗑️ Removing the build image to save space..."
	nerdctl.lima rmi "$IMAGE_NAME"

elif command -v docker &>/dev/null; then
	echo "Step 1: 🐳 Docker detected. Building the isolated image: $IMAGE_NAME"
	docker build -t "$IMAGE_NAME" .

	echo "Step 2: 📦 Extracting files from the build container..."
	CID=$(docker run -d "$IMAGE_NAME" sleep 30)
	docker cp "$CID":/app/dist ./dist
	docker rm -f "$CID"

	echo "Step 3: 🗑️ Removing the build image to save space..."
	docker rmi "$IMAGE_NAME"

else
	echo "Step 1: ⚠️ Neither nerdctl.lima nor docker found. Falling back to local npm build..."

	if command -v npm &>/dev/null; then
		echo "📦 Running 'npm run build' locally..."
		npm run build
	else
		echo "❌ Error: nerdctl.lima, docker, and npm are all missing. Cannot build."
		exit 1
	fi
fi

# --- Completion ---
echo "✅ Build complete! Optimized files are ready in the ./dist directory."
