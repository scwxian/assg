#!/usr/bin/env bash

# This script automates the process of initializing the project by creating all the .env files and updating the package.json

# --- Configuration ---
set -e
set -u
set -o pipefail

echo "🚀 Initializing project configuration..."
echo "📝 Creating .env files..."

# Create .env with generic placeholders
cat >.site.config.js <<EOF
export default {
  SITE_URL: "https://mysite.com",
  SITE_NAME: "My New Site",
  SITE_DESC: "My Site Description",
  DOMAIN_NAME: "mysite.com",
  BUSINESS_NAME: "My Business Name",
  BUSINESS_LOCATION: "City, Country",
  BUSINESS_JURISDICTION: "Country"
};
EOF

cat >.env <<EOF
VITE_INSTAGRAM_FEED_URL=
EOF

cat >.env.development <<EOF
VITE_BASE_URL=/mymagickeyword
EOF

cat >.env.production <<EOF
VITE_BASE_URL=
EOF

echo "📦 Updating package.json and package-lock.json..."

CURRENT_USER=$(git config user.name)
if [ -z "$CURRENT_USER" ]; then
	CURRENT_USER=$(whoami)
fi

PROJECT_NAME=$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Check if npm is installed
if command -v npm &>/dev/null; then
	npm pkg set name="$PROJECT_NAME"
	npm pkg set author="$CURRENT_USER"
	npm pkg set description="A static site project initialized via boilerplate."

	npm install --package-lock-only --quiet

	echo "✅ Updated Author to: $CURRENT_USER"
	echo "✅ Updated Project Name to: $PROJECT_NAME"
else
	echo "❌ Error: npm is not installed. Cannot update package.json."
	exit 1
fi

echo "🎉 Project initialized successfully!"
