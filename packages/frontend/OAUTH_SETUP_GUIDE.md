# OAuth Setup Guide

## Why Setup OAuth?

OAuth allows users to sign in with their existing Google/GitHub accounts instead of creating new passwords. This is:
- More secure (no password storage)
- Faster for users (one-click sign in)
- Better UX (fewer forms to fill)

## GitHub OAuth Setup

### Step 1: Go to GitHub Settings
Visit: https://github.com/settings/developers

### Step 2: Register New Application
1. Click "New OAuth App"
2. Fill in the form:
   ```
   Application name: TruthTalent
   Homepage URL: http://localhost:3000
   Application description: Transparent hiring platform
   Authorization callback URL: http://localhost:3000/api/auth/callback/github
   ```
3. Click "Register application"

### Step 3: Get Credentials
1. You'll see your **Client ID** - copy it
2. Click "Generate a new client secret"
3. Copy the **Client Secret** (you'll only see it once!)

### Step 4: Add to .env.local
Open `packages/frontend/.env.local` and add:
```bash
GITHUB_CLIENT_ID="your_client_id_here"
GITHUB_CLIENT_SECRET="your_client_secret_here"
```

### Step 5: Restart Dev Server
```bash
# Stop the server (Ctrl+C)
# Start it again
bun dev
```

---

## Google OAuth Setup

### Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials

### Step 2: Create Project (if needed)
1. Click project dropdown at top
2. Click "New Project"
3. Name it "TruthTalent"
4. Click "Create"

### Step 3: Enable APIs
1. Go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click "Enable"

### Step 4: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: TruthTalent
   - User support email: your email
   - Developer contact: your email
   - Click "Save and Continue"
4. Back to Create OAuth client ID:
   ```
   Application type: Web application
   Name: TruthTalent Web Client
   
   Authorized JavaScript origins:
   http://localhost:3000
   
   Authorized redirect URIs:
   http://localhost:3000/api/auth/callback/google
   ```
5. Click "Create"

### Step 5: Get Credentials
1. Copy the **Client ID**
2. Copy the **Client Secret**

### Step 6: Add to .env.local
Open `packages/frontend/.env.local` and add:
```bash
GOOGLE_CLIENT_ID="your_client_id_here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret_here"
```

### Step 7: Restart Dev Server
```bash
# Stop the server (Ctrl+C)
# Start it again
bun dev
```

---

## Testing OAuth

### Test GitHub OAuth:
1. Go to http://localhost:3000
2. Toggle to Employee or Recruiter
3. Click "Apply Now" or "Start Recruiting"
4. Click "Continue with GitHub"
5. Authorize the app on GitHub
6. You should be redirected to the dashboard!

### Test Google OAuth:
1. Go to http://localhost:3000
2. Toggle to Employee or Recruiter
3. Click "Apply Now" or "Start Recruiting"
4. Click "Continue with Google"
5. Select your Google account
6. You should be redirected to the dashboard!

---

## Troubleshooting

### "Redirect URI mismatch" Error
- Double-check your callback URLs match exactly:
  - GitHub: `http://localhost:3000/api/auth/callback/github`
  - Google: `http://localhost:3000/api/auth/callback/google`
- No trailing slashes!
- Use `http://` not `https://` for localhost

### "Client ID not found" Error
- Make sure you copied the entire Client ID
- Check for extra spaces in `.env.local`
- Restart the dev server after adding credentials

### Google "App not verified" Warning
- This is normal for development
- Click "Advanced" > "Go to TruthTalent (unsafe)"
- For production, you'll need to verify your app

### Environment Variables Not Loading
```bash
# Check if .env.local exists
cat .env.local

# Make sure it's in the right location
ls -la packages/frontend/.env.local

# Restart dev server
bun dev
```

---

## Production Setup

When deploying to production:

1. **Update callback URLs** to your production domain:
   ```
   https://yourapp.com/api/auth/callback/github
   https://yourapp.com/api/auth/callback/google
   ```

2. **Add production URLs** to OAuth apps:
   - GitHub: Add new callback URL
   - Google: Add new authorized redirect URI

3. **Use separate OAuth apps** for production:
   - Create new GitHub OAuth App for production
   - Create new Google OAuth Client for production
   - Keep dev and prod credentials separate

4. **Secure your secrets**:
   - Use environment variable management (Vercel, Railway, etc.)
   - Never commit `.env.local` to Git
   - Rotate secrets if exposed

---

## Security Best Practices

✅ **Do:**
- Use separate OAuth apps for dev/staging/production
- Rotate secrets regularly
- Use HTTPS in production
- Set up proper CORS headers
- Monitor OAuth usage

❌ **Don't:**
- Commit secrets to Git
- Share OAuth credentials
- Use production credentials in development
- Ignore security warnings

---

## Quick Reference

### Callback URLs
```
GitHub:  http://localhost:3000/api/auth/callback/github
Google:  http://localhost:3000/api/auth/callback/google
```

### .env.local Template
```bash
# Better-Auth
DATABASE_URL="file:./db.sqlite"
BETTER_AUTH_SECRET="change-this-to-random-string"
BETTER_AUTH_URL="http://localhost:3000"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# App URL
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

Need help? Check the [Better-Auth documentation](https://better-auth.com) for more details.
