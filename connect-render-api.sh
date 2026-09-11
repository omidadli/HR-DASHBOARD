#!/bin/bash
# Connect GitHub repo to Render via REST API
# Usage: RENDER_API_KEY=your_key ./connect-render-api.sh

API_KEY="${RENDER_API_KEY:-}"
if [ -z "$API_KEY" ]; then
  echo "ERROR: Set RENDER_API_KEY environment variable (or edit this script)"
  exit 1
fi

curl -s -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web_service",
    "name": "hr-seylane-sabz",
    "repo": "https://github.com/omidadli/HR-seylane-sabz-",
    "branch": "main",
    "buildCommand": "npm install && npm run build",
    "startCommand": "npm start",
    "region": "oregon",
    "plan": "starter",
    "autoDeploy": "yes"
  }' | jq .
