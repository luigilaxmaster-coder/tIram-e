/**
 * Google Calendar OAuth Callback Handler
 * 
 * This API endpoint handles the callback from Google's OAuth flow.
 * It exchanges the authorization code for access tokens and stores them.
 */

import type { APIRoute } from 'astro';
import { BaseCrudService } from '@/integrations';

interface UserGoogleCalendarAuth {
  _id?: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: string;
  scope: string;
  updatedAt: string;
}

interface GoogleOAuthState {
  _id: string;
  userId: string;
  createdAt: string;
  expectedRedirectUri?: string;
  requestedScopes?: string;
  expirationTime?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { code, state } = body;

    if (!code || !state) {
      return new Response(
        JSON.stringify({
          error: 'Missing code or state parameter',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Google OAuth credentials not configured');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate state
    let stateRecord: GoogleOAuthState | null = null;
    try {
      stateRecord = await BaseCrudService.getById<GoogleOAuthState>(
        'googleoauthstates',
        state
      );
    } catch (error) {
      console.error('Error retrieving state:', error);
    }

    if (!stateRecord) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired state. OAuth request may have expired.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if state has expired
    const expirationTime = new Date(stateRecord.expirationTime || 0);
    if (expirationTime < new Date()) {
      // Delete expired state
      try {
        await BaseCrudService.delete('googleoauthstates', state);
      } catch (error) {
        console.warn('Error deleting expired state:', error);
      }
      return new Response(
        JSON.stringify({
          error: 'OAuth state has expired. Please try again.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to exchange authorization code',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return new Response(
        JSON.stringify({
          error: `Failed to exchange code for tokens: ${errorData.error_description || errorData.error}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    // Get user ID from state
    const userId = stateRecord.userId;
    const scope = tokenData.scope || stateRecord.requestedScopes || '';

    // Check if user already has auth record
    let existingAuth: { items: UserGoogleCalendarAuth[] } | null = null;
    try {
      existingAuth = await BaseCrudService.getAll<UserGoogleCalendarAuth>(
        'usergooglecalendarauth'
      );
    } catch (error) {
      console.warn('Error retrieving existing auth:', error);
    }

    const userAuthRecord = existingAuth?.items?.find(
      (item) => item.userId === userId
    );

    try {
      if (userAuthRecord && userAuthRecord._id) {
        // Update existing record
        await BaseCrudService.update<UserGoogleCalendarAuth>(
          'usergooglecalendarauth',
          {
            _id: userAuthRecord._id,
            userId: userId,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || userAuthRecord.refreshToken,
            expiryDate: expiryDate.toISOString(),
            scope: scope,
            updatedAt: new Date().toISOString(),
          }
        );
      } else {
        // Create new record
        await BaseCrudService.create('usergooglecalendarauth', {
          _id: crypto.randomUUID(),
          userId: userId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiryDate: expiryDate.toISOString(),
          scope: scope,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error saving authentication tokens:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to save authentication tokens',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete the state record after successful exchange
    try {
      await BaseCrudService.delete('googleoauthstates', state);
    } catch (error) {
      console.warn('Error deleting state after exchange:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Calendar connected successfully',
        userId: userId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in Google Calendar callback:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
