import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCalendarCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Check for errors from Google
        if (error) {
          setErrorMessage(
            errorDescription || 'Google Calendar connection failed. Please try again.'
          );
          setStatus('error');
          return;
        }

        // Validate code and state
        if (!code || !state) {
          setErrorMessage('Invalid callback parameters. Please try again.');
          setStatus('error');
          return;
        }

        // Call backend to exchange code for tokens
        const response = await fetch('/api/auth/google-calendar-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.error || 'Failed to connect Google Calendar. Please try again.'
          );
          setStatus('error');
          return;
        }

        // Success
        setStatus('success');

        // Redirect to dashboard with success message
        setTimeout(() => {
          navigate('/pro/dashboard?gcal=connected', { replace: true });
        }, 2000);
      } catch (error) {
        console.error('Error handling Google Calendar callback:', error);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-deep-charcoal flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {status === 'loading' && (
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-light-gray font-paragraph mt-6">
              Connecting your Google Calendar...
            </p>
          </div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="inline-block p-4 rounded-full mb-6"
              style={{ backgroundColor: 'rgba(0, 255, 212, 0.1)' }}
            >
              <CheckCircle2 className="w-8 h-8 text-neon-teal" />
            </motion.div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Connected!
            </h1>
            <p className="text-light-gray/80 font-paragraph mb-6">
              Your Google Calendar has been successfully connected. Redirecting to your dashboard...
            </p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="inline-block p-4 rounded-full mb-6"
              style={{ backgroundColor: 'rgba(255, 65, 54, 0.1)' }}
            >
              <AlertCircle className="w-8 h-8 text-destructive" />
            </motion.div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Connection Failed
            </h1>
            <p className="text-light-gray/80 font-paragraph mb-6">
              {errorMessage}
            </p>
            <Button
              onClick={() => navigate('/pro/dashboard', { replace: true })}
              className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90 font-semibold"
            >
              Back to Dashboard
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
