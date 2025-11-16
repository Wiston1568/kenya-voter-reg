#!/bin/bash
# setup.sh - Setup script for Kenya Voter Registration System
# Run with: bash setup.sh

echo "=========================================="
echo "Kenya Voter Registration System - Setup"
echo "=========================================="
echo ""

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Download from: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✓ npm $(npm --version)"
echo ""

# Navigate to backend
echo "Installing backend dependencies..."
cd backend || exit 1
npm install
if [ $? -eq 0 ]; then
    echo "✓ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo ""

# Create .env file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created (please edit with your settings)"
else
    echo "✓ .env file already exists"
fi
echo ""

# Create required directories
echo "Creating required directories..."
mkdir -p data uploads
echo "✓ data/ directory created"
echo "✓ uploads/ directory created"
echo ""

# Verify db.json
if [ ! -f data/db.json ]; then
    echo "Creating initial database..."
    cat > data/db.json << 'EOF'
{
  "users": [
    {
      "username": "wiston",
      "password": "password",
      "role": "superadmin",
      "first_name": "Wiston",
      "last_name": "Admin"
    },
    {
      "username": "charles",
      "password": "password",
      "role": "superadmin",
      "first_name": "Charles",
      "last_name": "Admin"
    }
  ],
  "voters": [],
  "settings": {
    "registration_open": true
  }
}
EOF
    echo "✓ Initial database created at data/db.json"
else
    echo "✓ Database already exists at data/db.json"
fi
echo ""

# Verify regions data
if [ ! -f data/kenya_regions.json ]; then
    echo "Creating Kenya regions data..."
    node scripts/fetch_regions.js
fi
echo ""

echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit backend/.env with your configuration"
echo "2. Change default passwords in backend/data/db.json"
echo "3. Start the server: npm run dev"
echo "4. Visit http://localhost:4000"
echo ""
echo "For deployment on Render:"
echo "1. Create GitHub repository: git init && git add . && git commit -m 'Initial commit'"
echo "2. Push to GitHub: git push origin main"
echo "3. Connect to Render.com and deploy"
echo ""
