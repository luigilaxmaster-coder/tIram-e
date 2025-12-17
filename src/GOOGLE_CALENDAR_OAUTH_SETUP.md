# Google Calendar OAuth 2.0 Integration Setup Guide

This guide provides step-by-step instructions to set up Google Calendar OAuth 2.0 integration for your Tirame application.

## Overview

The Google Calendar OAuth integration allows users to:
- Authorize the application to access their Google Calendar
- Automatically sync appointments to their calendar
- Prevent double-bookings
- Send automatic reminders to clients

## Prerequisites

- Google Cloud Console account
- Access to your Wix project
- Admin access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: `Tirame Calendar Integration`
5. Click "CREATE"
6. Wait for the project to be created

## Step 2: Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on "Google Calendar API"
4. Click the "ENABLE" button
5. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** as the User Type
3. Click "CREATE"
4. Fill in the OAuth consent screen form:
   - **App name**: `Tirame`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "SAVE AND CONTINUE"
6. On the "Scopes" page, click "ADD OR REMOVE SCOPES"
7. Search for and add these scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
8. Click "UPDATE"
9. Click "SAVE AND CONTINUE"
10. On the "Test users" page, add your email address as a test user
11. Click "SAVE AND CONTINUE"
12. Review the summary and click "BACK TO DASHBOARD"

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "CREATE CREDENTIALS" > "OAuth client ID"
3. Select **Web application** as the Application type
4. Fill in the form:
   - **Name**: `Tirame Web Client`
   - **Authorized JavaScript origins**: 
     - `https://tirameapp.com`
     - `http://localhost:3000` (for local development)
   - **Authorized redirect URIs**:
     - `https://tirameapp.com/gcal-callback`
     - `http://localhost:3000/gcal-callback` (for local development)
5. Click "CREATE"
6. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Wix Secrets

1. In your Wix project, go to **Secrets Manager** (or equivalent)
2. Create three new secrets:
   - **GOOGLE_CLIENT_ID**: Paste the Client ID from Step 4
   - **GOOGLE_CLIENT_SECRET**: Paste the Client Secret from Step 4
   - **GOOGLE_REDIRECT_URI**: Set to `https://tirameapp.com/gcal-callback`

For local development, you can also add:
   - **GOOGLE_REDIRECT_URI_DEV**: Set to `http://localhost:3000/gcal-callback`

## Step 6: Update Environment Variables

Make sure your `.env` file includes:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://tirameapp.com/gcal-callback
```

## Step 7: Test the Integration

1. Navigate to the Provider Dashboard (`/pro/dashboard`)
2. Go to the "Integrations" or "Settings" tab
3. Click the "Connect Google Calendar" button
4. You should be redirected to Google's login page
5. Sign in with your Google account
6. Grant the requested permissions
7. You should be redirected back to the dashboard with a success message

## Database Collections

The integration uses two database collections:

### GoogleOAuthStates
Stores temporary OAuth state values for CSRF protection:
- `_id`: The state value (unique identifier)
- `userId`: The user who initiated the OAuth request
- `createdAt`: When the state was created
- `expectedRedirectUri`: The expected redirect URI
- `requestedScopes`: The OAuth scopes requested
- `expirationTime`: When the state expires (10 minutes)

### UserGoogleCalendarAuth
Stores persistent authentication tokens:
- `userId`: The user ID
- `accessToken`: Google's OAuth access token
- `refreshToken`: Google's OAuth refresh token
- `expiryDate`: When the access token expires
- `scope`: The granted OAuth scopes
- `updatedAt`: When the tokens were last updated

## API Endpoints

### POST /api/auth/google-oauth-url
Generates the Google OAuth authorization URL.

**Request:**
```json
{
  "userId": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### POST /api/auth/google-calendar-callback
Handles the OAuth callback from Google.

**Request:**
```json
{
  "code": "authorization_code",
  "state": "state_value"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google Calendar connected successfully",
  "userId": "user@example.com"
}
```

## Frontend Components

### Connect Button
Located in the Provider Dashboard, the "Connect Google Calendar" button:
- Calls `/api/auth/google-oauth-url` to get the authorization URL
- Redirects the user to Google's login page
- Handles errors gracefully

### Callback Page
The `/gcal-callback` page:
- Handles the redirect from Google
- Exchanges the authorization code for tokens
- Displays success or error messages
- Redirects back to the dashboard

## Troubleshooting

### "Invalid redirect URI"
- Ensure the redirect URI in Google Cloud Console exactly matches the one in your Wix Secrets
- Check for trailing slashes and protocol (http vs https)

### "Invalid state"
- The state may have expired (10-minute limit)
- Ask the user to try connecting again

### "Token exchange failed"
- Verify that the Client ID and Client Secret are correct
- Check that the Google Calendar API is enabled
- Ensure the OAuth consent screen is configured

### "Permission denied"
- The user may have denied the requested permissions
- Ask them to try again and grant all permissions

## Security Considerations

1. **State Validation**: The state parameter is validated to prevent CSRF attacks
2. **Token Storage**: Tokens are stored securely in the database
3. **Token Expiration**: Access tokens are refreshed automatically when needed
4. **Scope Limitation**: Only necessary scopes are requested
5. **HTTPS Only**: The redirect URI should always use HTTPS in production

## Token Refresh

Access tokens expire after a certain period (typically 1 hour). The system automatically:
1. Checks if the token is expired before use
2. Uses the refresh token to obtain a new access token
3. Updates the token in the database

## Disconnecting Google Calendar

Users can disconnect their Google Calendar by:
1. Going to the Provider Dashboard
2. Clicking "Disconnect" in the Google Calendar section
3. The system will revoke the tokens and remove them from the database

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the Google OAuth 2.0 documentation: https://developers.google.com/identity/protocols/oauth2
3. Check the Google Calendar API documentation: https://developers.google.com/calendar/api/guides/overview
