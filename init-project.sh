#!/usr/bin/env bash

# This script automates the process of initializing the project by creating all the .env files and updating the package.json

# --- Configuration ---
set -e
set -u
set -o pipefail

echo "🚀 Initializing project configuration..."
echo "📝 Creating .env files..."

# Create site.config.js and .env with generic placeholders
cat >site.config.js <<EOF
export default {
  // Basic SEO & Identity
  SITE_URL: "https://mysite.com",
  SITE_NAME: "My New Site",
  SITE_DESC: "My Site Description",
  
  // Legal & Business Info
  DOMAIN_NAME: "mysite.com",
  BUSINESS_NAME: "My Business Name",
  BUSINESS_LOCATION: "City, Country",
  BUSINESS_JURISDICTION: "Country",

  // Contact & Socials
  EMAIL: "hello@mysite.com",
  PHONE: "+60123456789",
  WHATSAPP: "0123456789",
  INSTAGRAM: "https://instagram.com/yourhandle",
  FACEBOOK: "https://facebook.com/yourhandle"
};
EOF

cat >.env <<EOF
VITE_INSTAGRAM_FEED_URL=

# Optional. Single-bucket media origin for local dev/preview.
# Use the CDN distribution hostname until the custom domain is attached.
# Leave empty to fall back to SITE_URL (your custom domain).
MEDIA_ORIGIN_URL=

# Optional. Public media root. When set, media reads and build URLs use this
# instead of SITE_URL. Example: https://assets.mydomain.com
# Leave empty for the default one-bucket + CloudFront mode.
MEDIA_CDN_URL=

# Required for local media uploads. S3-compatible API endpoint.
# AWS S3:  https://s3.ap-southeast-1.amazonaws.com
# R2:      https://<account-id>.r2.cloudflarestorage.com
# MinIO:   https://minio.example.com
MEDIA_ENDPOINT_URL=

# Set to 0 to skip automatic media uploads during local builds.
MEDIA_SYNC=1
EOF

# Used for internal dev deployments via an obscured sub-path (e.g., dev.mysite.com/mymagickeyword)
cat >.env.development <<EOF
VITE_BASE_URL=/mymagickeyword

# Bucket that receives local media/ uploads for dev builds.
# Default mode: dev site bucket.
# Optional public media mode: dev media bucket.
MEDIA_BUCKET=
EOF

cat >.env.production <<EOF
VITE_BASE_URL=

# Bucket that receives local media/ uploads for prod builds.
# Default mode: prod site bucket.
# Optional public media mode: prod media bucket.
MEDIA_BUCKET=
EOF

mkdir -p media

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
	npm pkg set description="A static site project"

	npm install --package-lock-only --quiet

	echo "✅ Updated Author to: $CURRENT_USER"
	echo "✅ Updated Project Name to: $PROJECT_NAME"
else
	echo "❌ Error: npm is not installed. Cannot update package.json."
	exit 1
fi

echo "🎉 Project initialized successfully!"
