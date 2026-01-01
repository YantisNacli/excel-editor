# 🚀 Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] Supabase database is set up and running
- [ ] Database tables created (run `supabase-setup.sql`)
- [ ] Environment variables ready (Supabase URL and key)
- [ ] Code is committed to GitHub
- [ ] Build test passed locally (`npm run build`)

## 📋 Deployment Steps

### Method 1: Vercel Dashboard (Easiest)

1. **Go to [vercel.com](https://vercel.com) and sign in with GitHub**

2. **Click "Add New Project"**

3. **Import your repository**: `YantisNacli/excel-editor`

4. **Configure Project Settings**:
   - Framework Preset: **Next.js** ✅ (auto-detected)
   - Root Directory: `.` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

5. **Add Environment Variables** (CRITICAL!):
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   Get these from: **Supabase Dashboard** → **Settings** → **API**

6. **Click "Deploy"**

7. **Wait for deployment** (2-3 minutes)

### Method 2: Vercel CLI (Advanced)

Run in PowerShell:
```powershell
.\deploy.ps1
```

Or manually:
```powershell
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## 🔧 Post-Deployment Setup

### 1. Set Up Admin User
Run this SQL in Supabase SQL Editor:
```sql
-- Edit set-admin.sql with your email and name, then run it
INSERT INTO users (email, name, role)
VALUES ('your-email@example.com', 'Your Name', 'admin');
```

### 2. Test the Deployment
- [ ] Visit your Vercel URL
- [ ] Enter your email address when prompted
- [ ] Verify you have admin access
- [ ] Go to `/admin` and add test users
- [ ] Test stock transactions
- [ ] Test import/export features

### 3. Environment Variables Verification
Check these are set in Vercel:
```
Project Settings → Environment Variables
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 🐛 Troubleshooting

### Build Fails
```powershell
# Test build locally first
npm run build

# Check for TypeScript errors
npm run lint
```

### Database Connection Issues
- Verify Supabase URL is correct (should end with `.supabase.co`)
- Verify anon key is correct (long JWT token)
- Check Supabase project is not paused
- Verify Row Level Security policies allow access

### Email Authentication Not Working
1. Go to Supabase SQL Editor
2. Run: `SELECT * FROM users;`
3. Verify your email is in the database
4. Run `set-admin.sql` if needed

### Changes Not Showing Up
```powershell
# Redeploy with latest changes
git add .
git commit -m "Update deployment"
git push origin main

# Trigger redeploy in Vercel dashboard
# Or run: vercel --prod
```

## 📱 Access Your App

After deployment, you'll get:
- **Production URL**: `https://excel-editor-xxx.vercel.app`
- **Custom Domain**: Can be added in Vercel project settings

## 🔒 Security Checklist

- [ ] Environment variables are set in Vercel (not in code)
- [ ] Supabase RLS policies are enabled
- [ ] Admin user is created with your email
- [ ] Test user roles (viewer/operator/admin) work correctly
- [ ] Only whitelisted emails can access the system

## 🎯 Quick Commands

```powershell
# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Open project in browser
vercel open
```

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Current Status

Your project is ready to deploy! ✅
- ✅ Code is on GitHub: `YantisNacli/excel-editor`
- ✅ All changes are committed
- ✅ Email authentication system is implemented
- ✅ Admin page ready for user management

**Next Step**: Choose deployment method above and start deploying! 🚀
