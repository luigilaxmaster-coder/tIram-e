# Google OAuth 403 Error - Troubleshooting Guide

## 🔴 Error: 403 Forbidden

A 403 error during Google OAuth typically means **permission denied**. This can happen for several reasons.

## ✅ Common Causes & Solutions

### 1. **Redirect URI Mismatch** (Most Common)

**Problem**: The redirect URI sent to Google doesn't match what's configured in Google Cloud Console.

**How to Fix**:

1. Check your Google Cloud Console:
   - Go to APIs & Services > Credentials
   - Click on your OAuth 2.0 Client ID
   - Look at "Authorized redirect URIs"

2. Verify the exact format:
   ```
   https://yourdomain.com/api/auth/google-callback
   http://localhost:3000/api/auth/google-callback (for development)
   ```

3. **Important**: The protocol (http vs https) and exact path must match exactly!

4. If you're testing locally, make sure you have:
   ```
   http://localhost:3000/api/auth/google-callback
   ```

5. If you're in production, make sure you have:
   ```
   https://yourdomain.com/api/auth/google-callback
   ```

### 2. **Missing or Incorrect Environment Variables**

**Problem**: `PUBLIC_GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are not set correctly.

**How to Fix**:

1. In Wix, go to your project settings
2. Add these environment variables:
   ```
   PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

3. Get these values from Google Cloud Console:
   - Go to APIs & Services > Credentials
   - Click on your OAuth 2.0 Client ID
   - Copy the "Client ID" and "Client Secret"

4. **Important**: 
   - `PUBLIC_GOOGLE_CLIENT_ID` can be public (it's used in the browser)
   - `GOOGLE_CLIENT_SECRET` must be private (only on the server)

### 3. **OAuth Consent Screen Not Configured**

**Problem**: The OAuth consent screen is not set up or is in "Testing" mode.

**How to Fix**:

1. Go to Google Cloud Console
2. Go to APIs & Services > OAuth consent screen
3. Make sure you have:
   - **User Type**: External (for public access)
   - **App name**: Your app name
   - **User support email**: Your email
   - **Scopes**: `https://www.googleapis.com/auth/calendar`

4. If in "Testing" mode:
   - Add test users (your email)
   - Or publish the app (requires verification)

### 4. **Google Calendar API Not Enabled**

**Problem**: The Google Calendar API is not enabled for your project.

**How to Fix**:

1. Go to Google Cloud Console
2. Go to APIs & Services > Library
3. Search for "Google Calendar API"
4. Click on it and press "Enable"

### 5. **Scope Issues**

**Problem**: The requested scope is not properly configured.

**How to Fix**:

1. Verify the scope is exactly:
   ```
   https://www.googleapis.com/auth/calendar
   ```

2. Make sure it's added to your OAuth consent screen:
   - Go to APIs & Services > OAuth consent screen
   - Click "Edit App"
   - Go to "Scopes"
   - Make sure the calendar scope is listed

## 🔍 Debugging Steps

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Look for any error messages
4. Check the Network tab to see the request to Google

### Step 2: Check Server Logs
1. Look at your Wix project logs
2. Check for messages like:
   - "Missing Google OAuth credentials"
   - "Failed to exchange authorization code"
   - "Failed to get calendar info"

### Step 3: Verify the OAuth URL
The OAuth URL should look like:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID.apps.googleusercontent.com&
  redirect_uri=https://yourdomain.com/api/auth/google-callback&
  response_type=code&
  scope=https://www.googleapis.com/auth/calendar&
  access_type=offline&
  prompt=consent&
  state=...
```

### Step 4: Test the Redirect URI
1. Manually construct the redirect URI
2. Make sure it's accessible from your browser
3. Check that the endpoint exists at `/api/auth/google-callback`

## 🛠️ Advanced Debugging

### Enable Detailed Logging

The code now includes detailed logging. Check your server logs for:

```
Google OAuth Configuration: {
  clientId: "...",
  redirectUri: "https://yourdomain.com/api/auth/google-callback",
  scope: "https://www.googleapis.com/auth/calendar"
}
```

### Test with cURL

You can test the token exchange manually:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=YOUR_AUTH_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=https://yourdomain.com/api/auth/google-callback&grant_type=authorization_code"
```

## 📋 Checklist

- [ ] Redirect URI matches exactly in Google Cloud Console
- [ ] `PUBLIC_GOOGLE_CLIENT_ID` is set in environment variables
- [ ] `GOOGLE_CLIENT_SECRET` is set in environment variables
- [ ] Google Calendar API is enabled
- [ ] OAuth consent screen is configured
- [ ] Calendar scope is added to OAuth consent screen
- [ ] Testing locally? Using `http://localhost:3000`
- [ ] In production? Using `https://yourdomain.com`
- [ ] No typos in environment variables
- [ ] Client ID and Secret are from the correct OAuth app

## 🆘 Still Having Issues?

1. **Check the exact error message** in the dashboard toast notification
2. **Look at server logs** for detailed error information
3. **Verify all environment variables** are set correctly
4. **Test in incognito mode** to avoid cached credentials
5. **Clear browser cache** and try again
6. **Check Google Cloud Console** for any warnings or errors

## 📚 Useful Links

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) - Test OAuth flow

## 🔐 Security Notes

- Never commit `GOOGLE_CLIENT_SECRET` to version control
- Always use HTTPS in production
- The `state` parameter prevents CSRF attacks
- Tokens are stored securely in the database
- Access tokens expire after 1 hour (Google standard)
