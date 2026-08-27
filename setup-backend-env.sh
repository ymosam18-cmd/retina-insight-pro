#!/bin/bash

# Backend Environment Variables Setup Script
# Generated from Vly for Git Sync
# Run this script to set up your Convex backend environment variables

echo 'Setting up Convex backend environment variables...'

# Check if Convex CLI is installed
if ! command -v npx &> /dev/null; then
    echo 'Error: npx is not installed. Please install Node.js and npm first.'
    exit 1
fi

echo "Setting JWKS..."
bunx convex env set "JWKS" -- "{\"keys\":[{\"kty\":\"RSA\",\"n\":\"uxpGwnnzoEjQGPSZ8caN-g_7KsUXG9GVvvYzXFve3L2qbQGIwo3za9oSZFIe_JRqU2FfJs9lmP8hhyJcJv21daELi9dJTslaB5qVWppNOsxnpT6mEzw3CcGSdqkxfvD4-wY0uX2a40wPPh_O7W9M9LY4cvwG2MeAl5zZ_5XEjJOL9rmeAOKQGYW7EOZMzND9JFBfPG5uf4yoY2aZpZOIJNHaxXvzY7Jj_lVUoTFqtIrUrZ581JO8DRFdB8hFcLmLOThs9HSZTcQyhcBn_kdt4lqLsSd_Adj91IUeBg6Ru0hL6I4AygEnIvJ8kwRH0IiN-HJPwuDd71P499qWuiZKLw\",\"e\":\"AQAB\",\"use\":\"sig\"}]}"

echo "Setting JWT_PRIVATE_KEY..."
bunx convex env set "JWT_PRIVATE_KEY" -- "-----BEGIN PRIVATE KEY----- MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7GkbCefOgSNAY 9Jnxxo36D/sqxRcb0ZW+9jNcW97cvaptAYjCjfNr2hJkUh78lGpTYV8mz2WY/yGH Ilwm/bV1oQuL10lOyVoHmpVamk06zGelPqYTPDcJwZJ2qTF+8Pj7BjS5fZrjTA8+ H87tb0z0tjhy/AbYx4CXnNn/lcSMk4v2uZ4A4pAZhbsQ5kzM0P0kUF88bm5/jKhj Zpmlk4gk0drFe/NjsmP+VVShMWq0itStnnzUk7wNEV0HyEVwuYs5OGz0dJlNxDKF wGf+R23iWouxJ38B2P3UhR4GDpG7SEvojgDKASci8nyTBEfQiI34ck/C4N3vU/j3 2pa6JkovAgMBAAECggEAVq8O120etUTmvJkedYhzIMakrCUR1r6cLRPtqb2anBR3 T/dlABY6D97BpJ7zYjv0otq69cUioeaaBvyhSyNCHdRWABznBsx8nIc+6PISE8q9 vi4vTTwZl7iJ/dXXa6ODBvHSHZoW13XWngaonRJyyfFeZ89h8K9FYXi2+xXNMP8i fkboQaguGXn0OmOJTag50cnIaUAHykFtFD7bEqEEqSJny5nLMS04UMCADs/6Wez2 bj7JuMgQNzvNzCJiAPIJ+/qOPHt11PtGQuI/2JkGGyeIvcs8fZRoK34CSv/SFql9 Gd3044RgkkZPYuTSyhRbdJogFiQHto8hCHCMl7V/eQKBgQD3y6wN0ttMOPTPaHVZ yTvDkWyi1I3YKWR8AAczRwPULzKCxkyT6L71mL9TqswSfLfnJTskQpM/gWPwbWh7 GzkF2fdR8bcoOMtFeeLuHePyvCZUZN6HjCNie5vhs9+sRTrD7cOzfEAReJ3JyYgh jtqI3reANPfWv5ueylc3MGP7MwKBgQDBTCr1bTv4qhL1ja6kz9oyjOX1zCWueRYG wOkDWzrunWWH4voyy2hPdmqZ2EmP4eXT7vyk+FfPRWtME1Yz6qSofy3dCkwJs6yR 5wqRq8UVnirxQ8UDoLOYBrZye9U6gx3UtcVhUNAEB6zIfvecog6P+Rh8O905t/8t wb9lPEqVFQKBgQCm+v3XVubmh18ZQTgLKBr438+ILpnjN4l6Mf6oJEvFOYTdMUm7 RlUgZS1Q8UCRmK/IuIMRHTfizIuPIfsNMjwL4GTUOIGHPjZkfA1bDpNkKDvgFRUL 3HifzdIulyq8CO7fxyJgmfMGkvQpXYA5tO043HRllcwJT5dLuuhozVgilwKBgQCH UsSsZ1nZ329Ae30toto2E5AWgWJMADdcaQd4MxFR5d0jwdK5Zs/S+arto470bQiS U7iJ4dbPo+DXNJ5f4ECAOfEo00GidSg2SNKMYv2qAb48g95UiNfScbie83S27v4e YVcapxHKEHl1L/Y3sPiS8KekqeBZvSenqAFPZWMtdQKBgAT99l1R1scaphy/jB3h F/vmn7O3dg2r72D4bFMLkH6INbOKSdPT9vn+nHsTaG+sfQQUjIrIW4ACG59bfPME 1u2DHbF3bNM2xTUlPHVFpo+WpigVWU8NZgvseMtYdKtFGyzUpz4OYJn1CxmutrQX w886vqIbj3pV5HXZzRYELE4h -----END PRIVATE KEY-----"

echo "Setting SITE_URL..."
bunx convex env set "SITE_URL" -- "https://fearless-manatee-974.convex.site"

echo "Setting VLY_APP_NAME..."
bunx convex env set "VLY_APP_NAME" -- "Retina Insight Pro"

echo "Setting VLY_CONVEX_AUTH_ISSUER..."
bunx convex env set "VLY_CONVEX_AUTH_ISSUER" -- "https://freebuff.com"

echo "Setting VLY_INTEGRATION_BASE_URL..."
bunx convex env set "VLY_INTEGRATION_BASE_URL" -- "https://integrations.vly.ai/"

echo "Setting VLY_INTEGRATION_KEY..."
bunx convex env set "VLY_INTEGRATION_KEY" -- "sk_391427ac53fb7973608b18271453fb0c63a4354f17a31a2b96d56a2b8abdd2f4"

echo "✅ All backend environment variables have been set!"
echo "You can now run: pnpm dev:backend"
