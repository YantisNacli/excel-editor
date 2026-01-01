# Deploy to Vercel Script
# Run this in PowerShell

# Step 1: Install Vercel CLI (if not already installed)
Write-Host "Checking Vercel CLI installation..." -ForegroundColor Cyan
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
} else {
    Write-Host "Vercel CLI already installed!" -ForegroundColor Green
}

# Step 2: Build locally to check for errors
Write-Host "`nBuilding project locally..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
} else {
    Write-Host "Build failed! Fix errors before deploying." -ForegroundColor Red
    exit 1
}

# Step 3: Deploy to Vercel
Write-Host "`nDeploying to Vercel..." -ForegroundColor Cyan
vercel --prod

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "`nDon't forget to:" -ForegroundColor Yellow
Write-Host "1. Set environment variables in Vercel dashboard" -ForegroundColor Yellow
Write-Host "   - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Yellow
Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
Write-Host "2. Run set-admin.sql in Supabase to give yourself admin access" -ForegroundColor Yellow
