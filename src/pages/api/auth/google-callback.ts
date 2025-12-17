import type { APIRoute } from 'astro';
import { BaseCrudService } from '@/integrations';
import { Providers } from '@/entities';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleCalendarConfig {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  calendarId: string;
}

/**
 * Google OAuth callback endpoint
 * Handles the authorization code from Google and exchanges it for tokens
 */
export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle user denial
    if (error) {
      console.error('Google OAuth error:', error);
      return redirect('/pro/dashboard?google_error=user_denied');
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters');
      return redirect('/pro/dashboard?google_error=missing_params');
    }

    // Decode and validate state
    let stateData: { providerId: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch (error) {
      console.error('Invalid state parameter:', error);
      return redirect('/pro/dashboard?google_error=invalid_state');
    }

    const { providerId, timestamp } = stateData;

    // Validate state timestamp (must be within 10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      console.error('State timestamp expired');
      return redirect('/pro/dashboard?google_error=state_expired');
    }

    // Exchange authorization code for tokens
    const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
    
    // Construct redirect URI to match what was sent to Google
    const protocol = url.protocol;
    const host = url.host;
    const redirectUri = `${protocol}//${host}/api/auth/google-callback`;

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth credentials in environment');
      console.error('PUBLIC_GOOGLE_CLIENT_ID:', clientId ? 'set' : 'missing');
      console.error('GOOGLE_CLIENT_SECRET:', clientSecret ? 'set' : 'missing');
      return redirect('/pro/dashboard?google_error=missing_credentials');
    }

    console.log('Google OAuth Callback - Token Exchange:', {
      clientId: clientId.substring(0, 20) + '...',
      redirectUri,
      hasCode: !!code,
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to exchange authorization code:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
      });
      return redirect('/pro/dashboard?google_error=token_exchange_failed');
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get the primary calendar ID
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.text();
      console.error('Failed to get calendar info:', {
        status: calendarResponse.status,
        statusText: calendarResponse.statusText,
        error: errorData,
      });
      return redirect('/pro/dashboard?google_error=calendar_fetch_failed');
    }

    const calendarData = await calendarResponse.json();

    // Save the configuration to the provider
    const googleCalendarConfig: GoogleCalendarConfig = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      calendarId: calendarData.id,
    };

    try {
      await BaseCrudService.update<Providers>('providers', {
        _id: providerId,
        googleCalendarData: JSON.stringify(googleCalendarConfig),
        updatedAt: new Date().toISOString(),
      });

      // Redirect back to dashboard with success message
      return redirect('/pro/dashboard?google_connected=true');
    } catch (error) {
      console.error('Failed to save Google Calendar configuration:', error);
      return redirect('/pro/dashboard?google_error=save_failed');
    }
  } catch (error) {
    console.error('Unexpected error in Google OAuth callback:', error);
    return redirect('/pro/dashboard?google_error=unexpected');
  }
};
