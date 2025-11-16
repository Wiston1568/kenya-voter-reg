#!/bin/bash
# render-env.example
# Copy this to .env on Render and update values

# ===== SERVER CONFIGURATION =====
# Port for the application (Render will set this to 4000 by default)
PORT=4000

# Environment: development, staging, or production
NODE_ENV=production

# ===== CORS CONFIGURATION =====
# Comma-separated list of allowed origins
# On Render, update this with your actual domain
# Example: https://kenya-voter-reg.onrender.com,https://yourdomain.com
CORS_ORIGIN=https://kenya-voter-reg.onrender.com

# ===== FILE UPLOAD CONFIGURATION =====
# Maximum photo size in bytes (default: 2MB = 2097152)
MAX_PHOTO_SIZE=2097152

# ===== DATABASE CONFIGURATION =====
# For future migration to PostgreSQL
# DATABASE_URL=postgresql://user:password@host:port/dbname

# ===== LOGGING =====
# Log level: info, warn, error
LOG_LEVEL=info

# ===== API CONFIGURATION =====
# API base URL for documentation
API_BASE_URL=https://kenya-voter-reg.onrender.com
