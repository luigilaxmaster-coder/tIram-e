# 🔗 Google Calendar Integration - Complete Setup Guide

## Overview

The Google Calendar integration allows providers to:
- ✅ Authorize their Google Calendar
- ✅ Auto-sync appointments to their calendar
- ✅ Prevent double-bookings
- ✅ Send automatic reminders to clients

## Current Status

✅ **Frontend**: Fully implemented with OAuth button and connection UI
✅ **Backend**: OAuth callback handler ready
✅ **Database**: Provider model supports Google Calendar data storage

⚠️ **Missing**: Environment variables configuration

---

## 🚀 Setup Instructions

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Enter project name: `Tirame Calendar Integration`
4. Click **Create**
5. Wait for the project to be created

### Step 2: Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **"Google Calendar API"**
3. Click on it
4. Click the **Enable** button
5. Wait for it to activate (usually instant)

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. If prompted, configure the **OAuth consent screen** first:
   - Select **External** as User Type
   - Fill in App name: `Tirame`
   - Add your email for User support email
   - Add your email for Developer contact
   - Click **Save and Continue**
   - Click **Add or Remove Scopes**
   - Search for and select: `https://www.googleapis.com/auth/calendar`
   - Click **Update** → **Save and Continue**
   - Click **Back to Credentials**

4. Now create the OAuth client:
   - Application type: **Web application**
   - Name: `Tirame Web App`
   - Authorized JavaScript origins:
     - `https://tirameapp.com`
     - `http://localhost:3000` (for local testing)
   - Authorized redirect URIs:
     - `https://tirameapp.com/api/auth/google-callback`
     - `http://localhost:3000/api/auth/google-callback` (for local testing)
   - Click **Create**

5. Copy your credentials:
   - **Client ID**: Copy this value
   - **Client Secret**: Copy this value

### Step 4: Configure Environment Variables

Add these to your Wix project environment variables:

```
PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Important:**
- `PUBLIC_GOOGLE_CLIENT_ID` is public (used in browser)
- `GOOGLE_CLIENT_SECRET` is private (server-only)

### Step 5: Test the Integration

1. Go to your provider dashboard: `https://tirameapp.com/pro/dashboard`
2. Click on the **Integrations** tab
3. Click **Connect Google Calendar** button
4. You should be redirected to Google's login page
5. Authorize the app to access your calendar
6. You should be redirected back to the dashboard with a success message

---

## 🔍 Troubleshooting

### Error: "Google Client ID is not configured"

**Solution**: 
- Verify `PUBLIC_GOOGLE_CLIENT_ID` is set in environment variables
- Restart your development server
- Check the browser console for the exact error

### Error: "Invalid Redirect URI"

**Solution**:
- Verify the redirect URI in Google Cloud Console matches exactly:
  - `https://tirameapp.com/api/auth/google-callback`
- No trailing slashes
- No extra characters
- Must use HTTPS (not HTTP)

### Error: "403 Forbidden"

**Solution**:
- Clear browser cache
- Try in incognito/private mode
- Verify Google Calendar API is enabled
- Verify OAuth consent screen is configured
- Check that the domain is using HTTPS

### Error: "Scope not approved"

**Solution**:
- Go to Google Cloud Console > APIs & Services > OAuth consent screen
- Click **Edit App**
- Go to **Scopes** section
- Add: `https://www.googleapis.com/auth/calendar`
- Save

---

## 📋 How It Works

### 1. User Clicks "Connect Google Calendar"

```
User clicks button
  ↓
Frontend calls handleConnectGoogleCalendar()
  ↓
Generates OAuth URL with:
  - Client ID
  - Redirect URI
  - Scope (calendar access)
  - State (provider ID + timestamp)
  ↓
Redirects to Google login
```

### 2. User Authorizes

```
User logs in to Google
  ↓
User grants calendar access
  ↓
Google redirects to callback URL with authorization code
```

### 3. Backend Exchanges Code for Tokens

```
Callback handler receives authorization code
  ↓
Exchanges code for access token + refresh token
  ↓
Fetches primary calendar ID
  ↓
Saves tokens to provider database
  ↓
Redirects back to dashboard with success message
```

### 4. Appointments Auto-Sync

```
When appointment is created/updated:
  ↓
Check if provider has Google Calendar connected
  ↓
If yes, create/update event in Google Calendar
  ↓
Event appears in provider's calendar automatically
```

---

## 🔐 Security Notes

1. **Client Secret**: Never expose in frontend code
   - Only used on server-side in `/api/auth/google-callback.ts`
   - Never commit to version control

2. **Access Tokens**: Stored encrypted in database
   - Used only for API calls to Google Calendar
   - Automatically refreshed when expired

3. **State Parameter**: Prevents CSRF attacks
   - Contains provider ID + timestamp
   - Validated on callback
   - Expires after 10 minutes

4. **Scopes**: Limited to calendar access only
   - Cannot access email, contacts, or other data
   - User can revoke access anytime

---

## 📊 Database Schema

The provider model stores Google Calendar data:

```typescript
interface Providers {
  _id: string;
  // ... other fields ...
  googleCalendarData?: string; // JSON string containing:
  // {
  //   accessToken: string;
  //   refreshToken: string | null;
  //   expiresAt: number;
  //   calendarId: string;
  // }
}
```

---

## 🎯 Next Steps

1. ✅ Create Google Cloud Project
2. ✅ Enable Google Calendar API
3. ✅ Create OAuth 2.0 credentials
4. ✅ Set environment variables
5. ✅ Test the connection
6. ✅ Verify appointments sync to calendar

---

## 📚 Useful Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)

---

## 💬 Support

If you encounter issues:

1. Check the browser console (F12) for error messages
2. Check the server logs for detailed information
3. Verify all environment variables are set
4. Try in incognito/private mode
5. Clear browser cache and try again

