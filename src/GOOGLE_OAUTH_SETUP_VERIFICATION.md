# Google OAuth Setup Verification for tirameapp.com

## 🎯 Your Configuration

**Domain**: `tirameapp.com`
**Redirect URI**: `https://tirameapp.com/api/auth/google-callback`

## ✅ Verification Checklist

### Step 1: Verify Redirect URI in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your **OAuth 2.0 Client ID** (should be labeled as "Web application")
5. Under **Authorized redirect URIs**, verify you have:
   ```
   https://tirameapp.com/api/auth/google-callback
   ```

**If it's missing:**
- Click **Edit**
- Add the URI: `https://tirameapp.com/api/auth/google-callback`
- Click **Save**

---

### Step 2: Verify Google Calendar API is Enabled

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for **"Google Calendar API"**
3. Click on it
4. Verify the status shows **"API enabled"** (blue button)

**If it's not enabled:**
- Click the **Enable** button
- Wait for it to activate (usually instant)

---

### Step 3: Verify OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services** > **OAuth consent screen**
2. Verify the following:

#### User Type
- Should be **External** (for public access)

#### App Information
- **App name**: Your app name (e.g., "Tirame")
- **User support email**: Your email address
- **Developer contact information**: Your email address

#### Scopes
1. Click **Add or Remove Scopes**
2. Search for **"calendar"**
3. Select: `https://www.googleapis.com/auth/calendar`
4. Click **Update**

#### Test Users (if in Testing mode)
- If the app is in "Testing" mode, add your email as a test user
- Or publish the app (requires verification)

---

### Step 4: Verify Environment Variables

Make sure these are set in your Wix project settings:

```
PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**To get these values:**
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID
3. Copy the **Client ID** and **Client Secret**

---

## 🔍 Testing Your Configuration

### Test 1: Check the OAuth URL

When you click "Connect Google Calendar" in the dashboard, the URL should look like:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID.apps.googleusercontent.com&
  redirect_uri=https://tirameapp.com/api/auth/google-callback&
  response_type=code&
  scope=https://www.googleapis.com/auth/calendar&
  access_type=offline&
  prompt=consent&
  state=...
```

**Check in browser console:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for log message: "Google OAuth Configuration:"
4. Verify the `redirectUri` shows: `https://tirameapp.com/api/auth/google-callback`

### Test 2: Check the Callback

After clicking "Connect Google Calendar":
1. You should be redirected to Google's login page
2. After authorizing, you should be redirected back to: `https://tirameapp.com/api/auth/google-callback`
3. Then redirected to: `https://tirameapp.com/pro/dashboard?google_connected=true`

**If you get a 403 error:**
- Check that the redirect URI matches exactly in Google Cloud Console
- Check that the protocol is `https://` (not `http://`)
- Check that there are no trailing slashes or extra characters

---

## 🛠️ Common Issues for tirameapp.com

### Issue 1: "Invalid Redirect URI"
**Solution**: Make sure in Google Cloud Console you have exactly:
```
https://tirameapp.com/api/auth/google-callback
```
(No trailing slash, no extra characters)

### Issue 2: "403 Forbidden"
**Solution**: 
- Verify the redirect URI matches exactly
- Verify the domain is using HTTPS (not HTTP)
- Clear browser cache and try again
- Check that Google Calendar API is enabled

### Issue 3: "OAuth Consent Screen not configured"
**Solution**:
- Go to APIs & Services > OAuth consent screen
- Fill in all required fields
- Add the calendar scope
- Save

### Issue 4: "Scope not approved"
**Solution**:
- Go to OAuth consent screen
- Click "Edit App"
- Go to "Scopes" section
- Add: `https://www.googleapis.com/auth/calendar`
- Save

---

## 📋 Quick Checklist

- [ ] Redirect URI is `https://tirameapp.com/api/auth/google-callback` in Google Cloud Console
- [ ] Google Calendar API is enabled
- [ ] OAuth Consent Screen is configured
- [ ] Calendar scope is added to OAuth Consent Screen
- [ ] `PUBLIC_GOOGLE_CLIENT_ID` is set in environment variables
- [ ] `GOOGLE_CLIENT_SECRET` is set in environment variables
- [ ] Using HTTPS (not HTTP)
- [ ] No trailing slashes in redirect URI
- [ ] No typos in domain name

---

## 🚀 Next Steps

1. **Verify all items in the checklist above**
2. **Test the connection** by clicking "Connect Google Calendar" in the dashboard
3. **Check the browser console** for any error messages
4. **Check the server logs** for detailed error information

If you still see a 403 error after verifying everything, please:
1. Take a screenshot of your Google Cloud Console settings
2. Check the browser console for the exact error message
3. Check the server logs for detailed information

---

## 📚 Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)

---

## 💡 Pro Tips

1. **Use incognito mode** when testing to avoid cached credentials
2. **Clear browser cache** if you make changes to Google Cloud Console
3. **Check server logs** - they contain detailed error messages
4. **Test with a different browser** to rule out browser-specific issues
5. **Use the OAuth 2.0 Playground** to test your credentials manually

