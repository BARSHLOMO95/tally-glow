#!/bin/bash
# Deploy Supabase Edge Functions
# Usage: ./deploy-functions.sh

set -e

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Project ID from config.toml
PROJECT_ID="osqanpfiprsbcontotlq"

echo ""
echo "📦 Deploying gmail-sync function..."
supabase functions deploy gmail-sync --project-ref $PROJECT_ID

echo ""
echo "📦 Deploying gmail-auth function..."
supabase functions deploy gmail-auth --project-ref $PROJECT_ID

echo ""
echo "📦 Deploying import-invoices function..."
supabase functions deploy import-invoices --project-ref $PROJECT_ID

echo ""
echo "✅ All functions deployed successfully!"
echo ""
echo "⚠️  Don't forget to set environment variables in Supabase Dashboard:"
echo "   - LOVABLE_API_KEY (required for PDF to image conversion)"
echo "   - GOOGLE_CLIENT_ID"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
