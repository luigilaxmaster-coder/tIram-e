/**
 * Google OAuth URL Generator
 * 
 * This API endpoint generates the Google OAuth authorization URL
 * and creates a state record for CSRF protection.
 */

import type { APIRoute } from 'astro';
import { BaseCrudService } from '@/integrations';
import crypto from 'crypto';

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
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: 'Missing userId parameter',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error('Google OAuth credentials not configured');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error. Google OAuth is not properly configured.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expirationTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Save state to database
    try {
      await BaseCrudService.create('googleoauthstates', {
        _id: state,
        userId: userId,
        createdAt: now.toISOString(),
        expectedRedirectUri: redirectUri,
        requestedScopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
        expirationTime: expirationTime.toISOString(),
      });
    } catch (error) {
      console.error('Error saving OAuth state:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to create OAuth state',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return new Response(
      JSON.stringify({
        success: true,
        authUrl: authUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in Google OAuth URL generation:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
