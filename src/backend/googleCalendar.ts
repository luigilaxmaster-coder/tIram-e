import { BaseCrudService } from '@/integrations';
import { Appointments, Providers } from '@/entities';

/**
 * Google Calendar integration service
 * Handles OAuth flow and calendar synchronization
 */

interface GoogleCalendarConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  calendarId: string;
}

/**
 * Generate Google OAuth URL for the provider
 */
export function generateGoogleOAuthUrl(providerId: string): string {
  const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID || '';
  
  if (!clientId) {
    throw new Error('Google Client ID is not configured. Please set PUBLIC_GOOGLE_CLIENT_ID environment variable.');
  }

  // Ensure the redirect URI uses the correct protocol and path
  const protocol = window.location.protocol;
  const host = window.location.host;
  const redirectUri = `${protocol}//${host}/api/auth/google-callback`;
  
  const scope = 'https://www.googleapis.com/auth/calendar';
  const state = btoa(JSON.stringify({ providerId, timestamp: Date.now() }));

  // Log for debugging
  console.log('Google OAuth Configuration:', {
    clientId: clientId.substring(0, 20) + '...',
    redirectUri,
    scope,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Save Google Calendar configuration to provider
 */
export async function saveGoogleCalendarConfig(
  providerId: string,
  config: GoogleCalendarConfig
): Promise<void> {
  try {
    await BaseCrudService.update<Providers>('providers', {
      _id: providerId,
      googleCalendarData: JSON.stringify(config),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving Google Calendar config:', error);
    throw new Error('Failed to save Google Calendar configuration');
  }
}

/**
 * Get Google Calendar configuration from provider
 */
export async function getGoogleCalendarConfig(providerId: string): Promise<GoogleCalendarConfig | null> {
  try {
    const provider = await BaseCrudService.getById<Providers>('providers', providerId);
    if (!provider || !provider.googleCalendarData) {
      return null;
    }

    return JSON.parse(provider.googleCalendarData);
  } catch (error) {
    console.error('Error getting Google Calendar config:', error);
    return null;
  }
}

/**
 * Disconnect Google Calendar from provider
 */
export async function disconnectGoogleCalendar(providerId: string): Promise<void> {
  try {
    await BaseCrudService.update<Providers>('providers', {
      _id: providerId,
      googleCalendarData: undefined,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    throw new Error('Failed to disconnect Google Calendar');
  }
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  providerId: string,
  appointment: Appointments
): Promise<string | null> {
  try {
    const config = await getGoogleCalendarConfig(providerId);
    if (!config) {
      console.warn('No Google Calendar configuration found for provider:', providerId);
      return null;
    }

    // Check if token is expired and refresh if needed
    if (config.expiresAt < Date.now()) {
      // In a real implementation, you would refresh the token here
      // For now, we'll just return null
      console.warn('Google Calendar token expired for provider:', providerId);
      return null;
    }

    const eventData = {
      summary: appointment.clientName || 'Appointment',
      description: appointment.notes || '',
      start: {
        dateTime: appointment.startAt,
        timeZone: 'UTC',
      },
      end: {
        dateTime: appointment.endAt,
        timeZone: 'UTC',
      },
      attendees: appointment.clientEmail
        ? [
            {
              email: appointment.clientEmail,
              displayName: appointment.clientName,
            },
          ]
        : [],
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      console.error('Failed to create Google Calendar event:', await response.text());
      return null;
    }

    const event = await response.json();
    return event.id;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  providerId: string,
  eventId: string,
  appointment: Appointments
): Promise<boolean> {
  try {
    const config = await getGoogleCalendarConfig(providerId);
    if (!config) {
      return false;
    }

    if (config.expiresAt < Date.now()) {
      return false;
    }

    const eventData = {
      summary: appointment.clientName || 'Appointment',
      description: appointment.notes || '',
      start: {
        dateTime: appointment.startAt,
        timeZone: 'UTC',
      },
      end: {
        dateTime: appointment.endAt,
        timeZone: 'UTC',
      },
      attendees: appointment.clientEmail
        ? [
            {
              email: appointment.clientEmail,
              displayName: appointment.clientName,
            },
          ]
        : [],
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return false;
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  providerId: string,
  eventId: string
): Promise<boolean> {
  try {
    const config = await getGoogleCalendarConfig(providerId);
    if (!config) {
      return false;
    }

    if (config.expiresAt < Date.now()) {
      return false;
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return false;
  }
}
