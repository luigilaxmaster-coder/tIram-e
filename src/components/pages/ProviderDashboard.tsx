import { useState, useEffect } from 'react';
import { useMember } from '@/integrations';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BaseCrudService } from '@/integrations';
import { Providers, Services, Appointments } from '@/entities';
import { PriceOption } from '@/types';
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Calendar, Clock, Users, DollarSign, Plus, Edit, Trash2, Save, X, Copy, Check, TrendingUp, AlertCircle, CheckCircle, Eye, Settings, BarChart3, Zap, Minus, LogOut, Link2, MapPin, Mail, MessageCircle, Globe, Info, Palette, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { disconnectGoogleCalendar } from '@/backend/googleCalendar';

interface ServiceScheduleDay {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export default function ProviderDashboard() {
  const { member } = useMember();
  const { toast } = useToast();
  const [provider, setProvider] = useState<Providers | null>(null);
  const [services, setServices] = useState<Services[]>([]);
  const [appointments, setAppointments] = useState<Appointments[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    slug: '',
    categoryTags: '',
    addressText: '',
    whatsappNumber: '',
    contactEmail: '',
  });
  const [slugCopied, setSlugCopied] = useState(false);

  // Service editing
  const [editingService, setEditingService] = useState<Services | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: '',
    durationMin: 30,
    price: 0,
    maxPeoplePerBooking: 1,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    isActive: true,
    cardColor: '#00FFD4',
    textColor: '#FFFFFF',
    textGradient: '',
  });
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);
  const [serviceSchedule, setServiceSchedule] = useState<ServiceScheduleDay[]>([
    { dayOfWeek: 0, isActive: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 6, isActive: false, startTime: '09:00', endTime: '17:00' },
  ]);

  // Google Calendar integration
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState<string | null>(null);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  // Email Notifications
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [emailNotificationSettings, setEmailNotificationSettings] = useState({
    sendConfirmation: true,
    sendReminder24h: true,
    sendReminder2h: false,
    customMessage: '',
  });
  const [showEmailSettings, setShowEmailSettings] = useState(false);

  // Appointments filter
  const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'all'>('upcoming');

  // Theme customization
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [dashboardTheme, setDashboardTheme] = useState({
    primaryColor: '#00FFD4',
    secondaryColor: '#6678FF',
    accentColor: '#FF4136',
    backgroundGradient: 'from-[#0a0a0f] via-[#12121a] to-[#1a1a28]',
    cardStyle: 'glass', // 'glass', 'solid', 'gradient'
  });

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboardTheme');
    if (savedTheme) {
      try {
        setDashboardTheme(JSON.parse(savedTheme));
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    }
  }, []);

  // Save theme to localStorage
  const handleSaveTheme = () => {
    localStorage.setItem('dashboardTheme', JSON.stringify(dashboardTheme));
    toast({
      title: 'Theme Saved',
      description: 'Your dashboard theme has been saved successfully',
    });
    setShowThemeCustomizer(false);
  };

  // Reset theme to default
  const handleResetTheme = () => {
    const defaultTheme = {
      primaryColor: '#00FFD4',
      secondaryColor: '#6678FF',
      accentColor: '#FF4136',
      backgroundGradient: 'from-[#0a0a0f] via-[#12121a] to-[#1a1a28]',
      cardStyle: 'glass',
    };
    setDashboardTheme(defaultTheme);
    localStorage.setItem('dashboardTheme', JSON.stringify(defaultTheme));
    toast({
      title: 'Theme Reset',
      description: 'Dashboard theme has been reset to default',
    });
  };

  useEffect(() => {
    loadProviderData();
    // Check for Google OAuth callback messages
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_connected') === 'true') {
      toast({
        title: 'Success',
        description: 'Google Calendar connected successfully!',
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('google_error')) {
      const errorMap: Record<string, string> = {
        user_denied: 'You denied the authorization request',
        missing_params: 'Missing required parameters',
        invalid_state: 'Invalid state parameter',
        state_expired: 'Authorization request expired',
        missing_credentials: 'Server configuration error',
        token_exchange_failed: 'Failed to exchange authorization code',
        calendar_fetch_failed: 'Failed to fetch calendar information',
        save_failed: 'Failed to save calendar configuration',
        unexpected: 'An unexpected error occurred',
      };
      const errorCode = urlParams.get('google_error') || 'unexpected';
      toast({
        title: 'Error',
        description: errorMap[errorCode] || 'Failed to connect Google Calendar',
        variant: 'destructive',
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [member, toast]);

  useEffect(() => {
    if (provider) {
      loadAppointments();
      checkGoogleCalendarStatus();
    }
  }, [provider]);

  const loadProviderData = async () => {
    if (!member) return;

    try {
      setLoading(true);
      const { items: providers } = await BaseCrudService.getAll<Providers>('providers');
      const myProvider = providers.find((p) => p.memberId === member.loginEmail);

      if (myProvider) {
        setProvider(myProvider);
        setProfileForm({
          displayName: myProvider.displayName || '',
          slug: myProvider.slug || '',
          categoryTags: myProvider.categoryTags || '',
          addressText: myProvider.addressText || '',
          whatsappNumber: myProvider.whatsappNumber || '',
          contactEmail: myProvider.contactEmail || '',
        });

        const { items: providerServices } = await BaseCrudService.getAll<Services>('services');
        setServices(providerServices.filter((s) => s._id.startsWith(myProvider._id)));
      } else {
        // Create new provider
        const newProvider: Providers = {
          _id: crypto.randomUUID(),
          memberId: member.loginEmail,
          slug: `provider-${Date.now()}`,
          displayName: member.profile?.nickname || member.contact?.firstName || 'My Business',
          isActive: true,
          timezone: 'America/Santo_Domingo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await BaseCrudService.create('providers', newProvider);
        setProvider(newProvider);
        setProfileForm({
          displayName: newProvider.displayName || '',
          slug: newProvider.slug || '',
          categoryTags: '',
          addressText: '',
          whatsappNumber: '',
          contactEmail: '',
        });
      }
    } catch (error) {
      console.error('Error loading provider data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load provider data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    if (!provider) return;

    try {
      const { items: allAppointments } = await BaseCrudService.getAll<Appointments>('appointments');
      
      // Filter appointments for this provider
      let filtered = allAppointments.filter((a) => a.providerId === provider._id);

      // Sort all appointments by date (earliest first)
      filtered.sort((a, b) => {
        const dateA = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
        const dateB = typeof b.startAt === 'string' ? parseISO(b.startAt) : b.startAt;
        return dateA!.getTime() - dateB!.getTime();
      });

      setAppointments(filtered);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load appointments',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!provider) return;

    try {
      await BaseCrudService.update<Providers>('providers', {
        _id: provider._id,
        ...profileForm,
        updatedAt: new Date().toISOString(),
      });

      setProvider({ ...provider, ...profileForm });
      setEditingProfile(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleCopySlug = () => {
    const url = `${window.location.origin}/p/${profileForm.slug}`;
    navigator.clipboard.writeText(url);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Profile URL copied to clipboard',
    });
  };

  const handleOpenServiceModal = (service?: Services) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name || '',
        category: service.category || '',
        durationMin: service.durationMin || 30,
        price: service.price || 0,
        maxPeoplePerBooking: service.maxPeoplePerBooking || 1,
        bufferBeforeMin: service.bufferBeforeMin || 0,
        bufferAfterMin: service.bufferAfterMin || 0,
        isActive: service.isActive !== false,
        cardColor: service.cardColor || '#00FFD4',
        textColor: service.textColor || '#FFFFFF',
        textGradient: service.textGradient || '',
      });
      if (service.priceOptions) {
        try {
          const parsed = JSON.parse(service.priceOptions);
          setPriceOptions(Array.isArray(parsed) ? parsed : []);
        } catch {
          setPriceOptions([]);
        }
      } else {
        setPriceOptions([]);
      }
      if (service.serviceSchedule) {
        try {
          const parsed = JSON.parse(service.serviceSchedule);
          setServiceSchedule(Array.isArray(parsed) ? parsed : getDefaultSchedule());
        } catch {
          setServiceSchedule(getDefaultSchedule());
        }
      } else {
        setServiceSchedule(getDefaultSchedule());
      }
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        category: '',
        durationMin: 30,
        price: 0,
        maxPeoplePerBooking: 1,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        isActive: true,
        cardColor: '#00FFD4',
        textColor: '#FFFFFF',
        textGradient: '',
      });
      setPriceOptions([]);
      setServiceSchedule(getDefaultSchedule());
    }
    setShowServiceModal(true);
  };

  const getDefaultSchedule = () => [
    { dayOfWeek: 0, isActive: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 6, isActive: false, startTime: '09:00', endTime: '17:00' },
  ];

  const handleSaveService = async () => {
    if (!provider) return;

    try {
      const serviceData = {
        ...serviceForm,
        priceOptions: priceOptions.length > 0 ? JSON.stringify(priceOptions) : undefined,
        serviceSchedule: JSON.stringify(serviceSchedule),
      };

      if (editingService) {
        await BaseCrudService.update<Services>('services', {
          _id: editingService._id,
          ...serviceData,
        });
        setServices(services.map((s) => (s._id === editingService._id ? { ...s, ...serviceData } : s)));
        toast({
          title: 'Success',
          description: 'Service updated successfully',
        });
      } else {
        const newService: Services = {
          _id: `${provider._id}-${crypto.randomUUID()}`,
          ...serviceData,
        };
        await BaseCrudService.create('services', newService);
        setServices([...services, newService]);
        toast({
          title: 'Success',
          description: 'Service created successfully',
        });
      }
      setShowServiceModal(false);
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: 'Error',
        description: 'Failed to save service',
        variant: 'destructive',
      });
    }
  };

  const handleAddPriceOption = () => {
    setPriceOptions([...priceOptions, { name: '', price: 0 }]);
  };

  const handleRemovePriceOption = (index: number) => {
    setPriceOptions(priceOptions.filter((_, i) => i !== index));
  };

  const handleUpdatePriceOption = (index: number, field: 'name' | 'price', value: string | number) => {
    const updated = [...priceOptions];
    if (field === 'name') {
      updated[index].name = value as string;
    } else {
      updated[index].price = parseFloat(value as string) || 0;
    }
    setPriceOptions(updated);
  };

  const handleUpdateScheduleDay = (dayOfWeek: number, field: 'isActive' | 'startTime' | 'endTime', value: any) => {
    const updated = serviceSchedule.map((day) => {
      if (day.dayOfWeek === dayOfWeek) {
        return { ...day, [field]: value };
      }
      return day;
    });
    setServiceSchedule(updated);
  };

  const checkGoogleCalendarStatus = async () => {
    if (!provider) return;

    try {
      if (provider.googleCalendarData) {
        const calendarData = JSON.parse(provider.googleCalendarData);
        setGoogleCalendarConnected(true);
        setGoogleCalendarEmail(calendarData.calendarId || 'Connected');
      } else {
        setGoogleCalendarConnected(false);
        setGoogleCalendarEmail(null);
      }
    } catch (error) {
      console.error('Error checking Google Calendar status:', error);
      setGoogleCalendarConnected(false);
      setGoogleCalendarEmail(null);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    if (!member) return;

    try {
      // Call backend to get OAuth URL
      const response = await fetch('/api/auth/google-oauth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: member.loginEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to initiate Google Calendar connection',
          variant: 'destructive',
        });
        return;
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect Google Calendar. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    if (!provider) return;

    try {
      setDisconnectingGoogle(true);
      await disconnectGoogleCalendar(provider._id);
      setGoogleCalendarConnected(false);
      setGoogleCalendarEmail(null);
      toast({
        title: 'Success',
        description: 'Google Calendar disconnected successfully',
      });
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Calendar',
        variant: 'destructive',
      });
    } finally {
      setDisconnectingGoogle(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await BaseCrudService.delete('services', serviceId);
      setServices(services.filter((s) => s._id !== serviceId));
      toast({
        title: 'Success',
        description: 'Service deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service',
        variant: 'destructive',
      });
    }
  };

  const handleSaveEmailNotifications = async () => {
    if (!provider) return;

    try {
      await BaseCrudService.update<Providers>('providers', {
        _id: provider._id,
        emailNotificationsEnabled: emailNotificationsEnabled,
        emailNotificationSettings: JSON.stringify(emailNotificationSettings),
        updatedAt: new Date().toISOString(),
      });

      setProvider({
        ...provider,
        emailNotificationsEnabled,
      });

      setShowEmailSettings(false);
      toast({
        title: 'Success',
        description: 'Email notification settings saved',
      });
    } catch (error) {
      console.error('Error saving email notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email notification settings',
        variant: 'destructive',
      });
    }
  };

  // Calculate stats
  const now = new Date();
  const todayAppointments = appointments.filter((a) => {
    if (!a.startAt) return false;
    const apptDate = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
    return apptDate >= startOfDay(now) && apptDate <= endOfDay(now);
  });

  const upcomingAppointments = appointments.filter((a) => {
    if (!a.startAt) return false;
    const apptDate = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
    return apptDate >= now;
  });

  const totalRevenue = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const confirmedAppointments = appointments.filter((a) => a.status === 'CONFIRMED').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-charcoal flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${dashboardTheme.backgroundGradient} pb-24 md:pb-0`}>
      {/* Modern Header with animated gradient */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-fuchsia-600/10 to-cyan-600/10 animate-pulse" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative max-w-[100rem] mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-12">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 mb-4"
                >
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                  <span className="text-sm font-paragraph text-emerald-400 font-semibold">Active</span>
                </motion.div>
                <h1 className="text-7xl font-heading font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent mb-3">
                  {provider?.displayName || 'Dashboard'}
                </h1>
                <p className="text-xl text-white/60 font-paragraph">Manage your business with ease</p>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="hidden lg:block"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur-2xl opacity-40 animate-pulse" />
                  <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600/30 via-fuchsia-600/30 to-cyan-600/30 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                    <Zap className="w-14 h-14 text-white drop-shadow-2xl" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Modern Stats Grid with enhanced visuals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: "Today's Appointments",
                  value: todayAppointments.length,
                  icon: Calendar,
                  gradient: 'from-blue-600 to-cyan-500',
                  bgGradient: 'from-blue-600/20 to-cyan-500/20',
                  iconBg: 'bg-blue-500/20',
                  subtitle: todayAppointments.length === 0 ? 'No bookings yet' : todayAppointments.length === 1 ? '1 booking today' : `${todayAppointments.length} bookings today`,
                  trend: null,
                },
                {
                  label: 'Total Services',
                  value: services.length,
                  icon: BarChart3,
                  gradient: 'from-purple-600 to-pink-500',
                  bgGradient: 'from-purple-600/20 to-pink-500/20',
                  iconBg: 'bg-purple-500/20',
                  subtitle: services.filter(s => s.isActive !== false).length === services.length ? 'All active' : `${services.filter(s => s.isActive !== false).length} active`,
                  trend: null,
                },
                {
                  label: 'Confirmed Bookings',
                  value: confirmedAppointments,
                  icon: CheckCircle,
                  gradient: 'from-green-600 to-emerald-500',
                  bgGradient: 'from-green-600/20 to-emerald-500/20',
                  iconBg: 'bg-green-500/20',
                  subtitle: appointments.length > 0 ? `${Math.round((confirmedAppointments / appointments.length) * 100)}% confirmation rate` : 'No bookings yet',
                  trend: confirmedAppointments > 0 ? '+' + confirmedAppointments : null,
                },
                {
                  label: 'Potential Revenue',
                  value: `${totalRevenue.toFixed(0)}`,
                  icon: TrendingUp,
                  gradient: 'from-orange-600 to-amber-500',
                  bgGradient: 'from-orange-600/20 to-amber-500/20',
                  iconBg: 'bg-orange-500/20',
                  subtitle: services.length > 0 ? `Avg ${(totalRevenue / services.length).toFixed(0)} per service` : 'Add services to start',
                  trend: totalRevenue > 0 ? `${totalRevenue.toFixed(2)}` : null,
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
                  className="group relative"
                >
                  {/* Animated glow effect on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Main card */}
                  <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-white/20 transition-all duration-300 overflow-hidden">
                    {/* Decorative corner gradient */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl opacity-20 -translate-y-16 translate-x-16 group-hover:opacity-40 transition-opacity duration-500`} />
                    
                    {/* Header with icon and pulse indicator */}
                    <div className="relative flex items-start justify-between mb-4">
                      <div className={`w-16 h-16 rounded-xl ${stat.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative`}>
                        <stat.icon className={`w-8 h-8 text-white`} style={{ 
                          filter: `drop-shadow(0 0 8px ${stat.gradient.includes('blue') ? '#0EA5E9' : stat.gradient.includes('purple') ? '#A855F7' : stat.gradient.includes('green') ? '#10B981' : '#F59E0B'})` 
                        }} />
                        {/* Pulse ring animation */}
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-20 animate-pulse`} />
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.1 + 0.3 }}
                        className="flex flex-col items-end gap-1"
                      >
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.gradient} animate-pulse`} />
                        {stat.trend && (
                          <motion.span 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 + 0.5 }}
                            className={`text-xs font-semibold font-paragraph px-2 py-0.5 rounded-full bg-gradient-to-r ${stat.bgGradient} border border-white/10`}
                          >
                            {stat.trend}
                          </motion.span>
                        )}
                      </motion.div>
                    </div>
                    
                    {/* Label */}
                    <p className="relative text-white/60 font-paragraph text-sm mb-2 font-medium tracking-wide uppercase">{stat.label}</p>
                    
                    {/* Value with enhanced styling */}
                    <div className="relative flex items-baseline gap-2 mb-3">
                      <motion.p 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.1 + 0.2, type: "spring", stiffness: 200 }}
                        className={`text-5xl font-heading font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent leading-none`}
                      >
                        {stat.value}
                      </motion.p>
                    </div>
                    
                    {/* Subtitle/description */}
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 + 0.4 }}
                      className="relative text-white/40 font-paragraph text-xs font-medium"
                    >
                      {stat.subtitle}
                    </motion.p>
                    
                    {/* Bottom accent line */}
                    <motion.div 
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: idx * 0.1 + 0.5, duration: 0.5 }}
                      className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[100rem] mx-auto px-6 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Modern Desktop Navigation with gradient pills */}
          <div className="flex items-center justify-between mb-4">
            <TabsList className="hidden md:flex bg-gradient-to-r from-white/[0.07] to-white/[0.03] border border-white/10 rounded-2xl p-2 flex-1 gap-2 backdrop-blur-xl">
              {[
                { value: 'overview', label: 'Overview', icon: BarChart3, gradient: 'from-violet-600 to-fuchsia-600' },
                { value: 'appointments', label: 'Appointments', icon: Calendar, gradient: 'from-blue-600 to-cyan-500' },
                { value: 'services', label: 'Services', icon: Zap, gradient: 'from-orange-600 to-amber-500' },
                { value: 'integrations', label: 'Integrations', icon: Link2, gradient: 'from-green-600 to-emerald-500' },
                { value: 'profile', label: 'Profile', icon: Settings, gradient: 'from-pink-600 to-rose-500' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`flex-1 relative group data-[state=active]:bg-gradient-to-r data-[state=active]:${tab.gradient} data-[state=active]:text-white rounded-xl transition-all duration-300 py-4 font-semibold hover:bg-white/5`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <tab.icon className="w-5 h-5" />
                    <span className="hidden lg:inline">{tab.label}</span>
                  </div>
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} rounded-xl -z-10`}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Theme Customizer Button */}
            <motion.button
              onClick={() => setShowThemeCustomizer(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex items-center gap-2 ml-4 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 hover:border-purple-500/50 transition-all backdrop-blur-xl"
            >
              <Palette className="w-5 h-5" />
              <span className="font-semibold text-sm">Customize</span>
            </motion.button>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Upcoming Appointments with modern card design */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-heading font-bold text-white">Upcoming Appointments</h2>
                      <p className="text-white/50 text-sm font-paragraph mt-1">Today's schedule</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab('appointments')}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90 rounded-xl px-6 font-semibold"
                  >
                    View All
                  </Button>
                </div>

                {todayAppointments.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="w-10 h-10 text-white/30" />
                    </div>
                    <p className="text-white/40 font-paragraph text-lg">No appointments scheduled for today</p>
                    <p className="text-white/30 font-paragraph text-sm mt-2">Your schedule is clear</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.slice(0, 5).map((appt, idx) => (
                      <motion.div
                        key={appt._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ x: 4 }}
                        className="bg-gradient-to-r from-white/[0.05] to-transparent border border-white/10 rounded-2xl p-5 hover:border-cyan-500/30 transition-all group/item"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5 flex-1">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                              <Clock className="w-7 h-7 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-heading font-bold text-white text-lg mb-1">{appt.clientName}</p>
                              <div className="flex items-center gap-3 text-sm text-white/50">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {appt.startAt && format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'h:mm a')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {appt.peopleCount} {appt.peopleCount === 1 ? 'person' : 'people'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="px-4 py-2 rounded-xl text-sm font-paragraph font-semibold bg-gradient-to-r from-green-600/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                            {appt.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Services Summary */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-amber-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600/20 to-amber-500/20 flex items-center justify-center">
                      <Zap className="w-7 h-7 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white">Services</h3>
                  </div>
                  <p className="text-6xl font-heading font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent mb-6">
                    {services.length}
                  </p>
                  <Button
                    onClick={() => setActiveTab('services')}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:opacity-90 rounded-xl py-6 font-semibold text-lg"
                  >
                    Manage Services
                  </Button>
                </div>
              </div>

              {/* Profile Status */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 flex items-center justify-center">
                      <Eye className="w-7 h-7 text-fuchsia-400" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white">Public Profile</h3>
                  </div>
                  <p className="text-white/50 mb-6 font-paragraph">
                    Share your profile link with clients to start receiving bookings
                  </p>
                  <Button
                    onClick={handleCopySlug}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 rounded-xl py-6 font-semibold text-lg"
                  >
                    {slugCopied ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-2" />
                        Copy Profile URL
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-white">All Appointments</h2>
                  </div>
                  <Select
                    value={appointmentFilter}
                    onValueChange={(value: any) => setAppointmentFilter(value)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white w-48 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a28] border-white/20">
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="all">All Appointments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(() => {
                  const displayAppointments = appointmentFilter === 'upcoming' ? upcomingAppointments : appointments;
                  
                  if (displayAppointments.length === 0) {
                    return (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center mx-auto mb-6">
                          <AlertCircle className="w-10 h-10 text-white/30" />
                        </div>
                        <p className="text-white/40 font-paragraph text-lg">
                          {appointmentFilter === 'upcoming' ? 'No upcoming appointments' : 'No appointments found'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {displayAppointments.map((appt, idx) => (
                        <motion.div
                          key={appt._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ x: 4 }}
                          className="bg-gradient-to-r from-white/[0.05] to-transparent border border-white/10 rounded-2xl p-5 hover:border-cyan-500/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-heading font-bold text-white text-lg mb-2">{appt.clientName}</p>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {appt.startAt &&
                                    format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'EEE, MMM d • h:mm a')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  {appt.clientEmail}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4" />
                                  {appt.clientPhone}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-3">
                              <span
                                className={`inline-block px-4 py-2 rounded-xl text-sm font-paragraph font-semibold ${
                                  appt.status === 'CONFIRMED'
                                    ? 'bg-gradient-to-r from-green-600/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                    : appt.status === 'CANCELLED'
                                    ? 'bg-gradient-to-r from-red-600/20 to-rose-500/20 text-rose-400 border border-rose-500/20'
                                    : 'bg-white/5 text-white/50 border border-white/10'
                                }`}
                              >
                                {appt.status}
                              </span>
                              <span className="flex items-center gap-1 text-sm text-white/50">
                                <Users className="w-4 h-4" />
                                {appt.peopleCount} people
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-amber-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-600/20 to-amber-500/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-amber-400" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-white">Your Services</h2>
                  </div>
                  <Button 
                    onClick={() => handleOpenServiceModal()} 
                    className="bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:opacity-90 rounded-xl px-6 font-semibold"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Service
                  </Button>
                </div>

                {services.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="w-10 h-10 text-white/30" />
                    </div>
                    <p className="text-white/40 font-paragraph text-lg mb-2">No services yet</p>
                    <p className="text-white/30 font-paragraph text-sm mb-6">Create your first service to get started</p>
                    <Button 
                      onClick={() => handleOpenServiceModal()} 
                      className="bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:opacity-90 rounded-xl px-8 py-6 font-semibold text-lg"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Service
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, idx) => (
                      <motion.div
                        key={service._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ y: -8 }}
                        className="relative group/card"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                        <div className="relative bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all backdrop-blur-sm">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                              <h3 className="text-xl font-heading font-bold text-white group-hover/card:text-amber-400 transition-colors mb-2">
                                {service.name}
                              </h3>
                              {service.category && (
                                <span className="inline-block px-3 py-1 rounded-lg text-xs font-paragraph bg-amber-500/20 text-amber-400 border border-amber-500/20">
                                  {service.category}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenServiceModal(service)}
                                className="p-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors border border-blue-500/20"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service._id)}
                                className="p-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors border border-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                              <span className="text-white/50 flex items-center gap-2 font-paragraph">
                                <Clock className="w-4 h-4 text-blue-400" />
                                Duration
                              </span>
                              <span className="font-heading font-bold text-white">{service.durationMin} min</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                              <span className="text-white/50 flex items-center gap-2 font-paragraph">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                Price
                              </span>
                              <span className="font-heading font-bold text-green-400">${service.price}</span>
                            </div>
                            {service.priceOptions && (() => {
                              try {
                                const opts = JSON.parse(service.priceOptions);
                                if (Array.isArray(opts) && opts.length > 0) {
                                  return (
                                    <div className="p-3 rounded-xl bg-white/5">
                                      <p className="text-white/50 mb-2 text-sm font-paragraph">Variants:</p>
                                      <div className="space-y-1">
                                        {opts.map((opt: PriceOption, idx: number) => (
                                          <div key={idx} className="text-xs text-white/40 flex justify-between">
                                            <span>{opt.name}</span>
                                            <span className="text-green-400">${opt.price}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                              } catch {
                                return null;
                              }
                              return null;
                            })()}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                              <span className="text-white/50 flex items-center gap-2 font-paragraph">
                                <Users className="w-4 h-4 text-purple-400" />
                                Max People
                              </span>
                              <span className="font-heading font-bold text-white">{service.maxPeoplePerBooking}</span>
                            </div>
                          </div>

                          <div className="mt-6 pt-6 border-t border-white/10">
                            <span
                              className={`inline-block px-4 py-2 rounded-xl text-sm font-paragraph font-semibold ${
                                service.isActive !== false 
                                  ? 'bg-gradient-to-r from-green-600/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-white/5 text-white/50 border border-white/10'
                              }`}
                            >
                              {service.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-8">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-neon-teal/10 to-neon-teal/5 border border-neon-teal/30 rounded-xl p-8 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-heading font-bold text-white mb-2">Integrations</h2>
                  <p className="text-light-gray font-paragraph">Connect your favorite tools to streamline your booking workflow</p>
                </div>
                <div className="hidden lg:flex w-16 h-16 rounded-lg bg-neon-teal/20 items-center justify-center">
                  <Link2 className="w-8 h-8 text-neon-teal" />
                </div>
              </div>
            </motion.div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Google Calendar - Active Integration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm hover:border-blue-500/30 transition-all group"
              >
                {/* Status Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Calendar className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-bold text-white">Google Calendar</h3>
                      <p className="text-xs text-light-gray/70 mt-1">Calendar Sync</p>
                    </div>
                  </div>
                  {googleCalendarConnected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 flex items-center gap-1"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs font-paragraph text-green-400">Connected</span>
                    </motion.div>
                  )}
                </div>

                {/* Benefits Section */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <p className="text-sm text-light-gray font-paragraph mb-4">Benefits:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-light-gray/80">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Auto-sync appointments to your calendar</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/80">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Prevent double-booking with real-time updates</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/80">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Send automatic reminders to clients</span>
                    </li>
                  </ul>
                </div>

                {/* Connection Status */}
                {googleCalendarConnected ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-paragraph font-semibold text-green-400">Successfully Connected</p>
                          <p className="text-xs text-green-400/70 mt-1">{googleCalendarEmail}</p>
                          <p className="text-xs text-green-400/60 mt-2">Your appointments are being synced automatically</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleDisconnectGoogleCalendar}
                      disabled={disconnectingGoogle}
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {disconnectingGoogle ? 'Disconnecting...' : 'Disconnect Calendar'}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-sm text-blue-200 font-paragraph">
                        <span className="font-semibold">Ready to connect?</span> Click the button below to authorize access to your Google Calendar.
                      </p>
                    </div>
                    <Button
                      onClick={handleConnectGoogleCalendar}
                      className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect Google Calendar
                    </Button>
                  </motion.div>
                )}
              </motion.div>

              {/* Outlook Calendar - Coming Soon */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm opacity-60"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-blue-300/50" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-bold text-white/70">Outlook Calendar</h3>
                      <p className="text-xs text-light-gray/50 mt-1">Calendar Sync</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                    <span className="text-xs font-paragraph text-amber-400 font-semibold">Coming Soon</span>
                  </div>
                </div>

                <div className="mb-6 pb-6 border-b border-white/10">
                  <p className="text-sm text-light-gray/60 font-paragraph mb-4">Benefits:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className="w-4 h-4 text-light-gray/40 flex-shrink-0 mt-0.5" />
                      <span>Sync with Outlook and Microsoft 365</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className="w-4 h-4 text-light-gray/40 flex-shrink-0 mt-0.5" />
                      <span>Prevent scheduling conflicts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className="w-4 h-4 text-light-gray/40 flex-shrink-0 mt-0.5" />
                      <span>Integrated meeting invitations</span>
                    </li>
                  </ul>
                </div>

                <Button
                  disabled
                  className="w-full bg-light-gray/10 text-light-gray/50 cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </motion.div>

              {/* Slack - Coming Soon */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm opacity-60"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <MessageCircle className="w-7 h-7 text-purple-300/50" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-bold text-white/70">Slack</h3>
                      <p className="text-xs text-light-gray/50 mt-1">Notifications</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                    <span className="text-xs font-paragraph text-amber-400 font-semibold">Coming Soon</span>
                  </div>
                </div>

                <div className="mb-6 pb-6 border-b border-white/10">
                  <p className="text-sm text-light-gray/60 font-paragraph mb-4">Benefits:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className="w-4 h-4 text-light-gray/40 flex-shrink-0 mt-0.5" />
                      <span>Get booking notifications in Slack</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className="w-4 h-4 text-light-gray/40 flex-shrink-0 mt-0.5" />
                      <span>Manage appointments from Slack</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className="w-4 h-4 text-light-gray/40 flex-shrink-0 mt-0.5" />
                      <span>Team collaboration features</span>
                    </li>
                  </ul>
                </div>

                <Button
                  disabled
                  className="w-full bg-light-gray/10 text-light-gray/50 cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </motion.div>

              {/* Email Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`bg-gradient-to-br ${emailNotificationsEnabled ? 'from-green-500/10 to-green-500/5 border-green-500/30' : 'from-white/5 to-white/[0.02] border-white/10'} border rounded-xl p-8 backdrop-blur-sm`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-lg ${emailNotificationsEnabled ? 'bg-green-500/20' : 'bg-green-500/10'} flex items-center justify-center`}>
                      <Mail className={`w-7 h-7 ${emailNotificationsEnabled ? 'text-green-300' : 'text-green-300/50'}`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-heading font-bold ${emailNotificationsEnabled ? 'text-green-300' : 'text-white/70'}`}>Email Notifications</h3>
                      <p className="text-xs text-light-gray/50 mt-1">Communication</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full ${emailNotificationsEnabled ? 'bg-green-500/20 border border-green-500/30' : 'bg-amber-500/20 border border-amber-500/30'}`}>
                    <span className={`text-xs font-paragraph font-semibold ${emailNotificationsEnabled ? 'text-green-400' : 'text-amber-400'}`}>
                      {emailNotificationsEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="mb-6 pb-6 border-b border-white/10">
                  <p className="text-sm text-light-gray/60 font-paragraph mb-4">Features:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className={`w-4 h-4 ${emailNotificationsEnabled ? 'text-green-400' : 'text-light-gray/40'} flex-shrink-0 mt-0.5`} />
                      <span>Automated email confirmations</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className={`w-4 h-4 ${emailNotificationsEnabled ? 'text-green-400' : 'text-light-gray/40'} flex-shrink-0 mt-0.5`} />
                      <span>24-hour reminder emails</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-light-gray/60">
                      <CheckCircle className={`w-4 h-4 ${emailNotificationsEnabled ? 'text-green-400' : 'text-light-gray/40'} flex-shrink-0 mt-0.5`} />
                      <span>2-hour reminder emails</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={() => setShowEmailSettings(true)}
                  className={`w-full ${emailNotificationsEnabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-neon-teal text-deep-charcoal hover:opacity-90'}`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {emailNotificationsEnabled ? 'Manage Settings' : 'Enable Notifications'}
                </Button>
              </motion.div>
            </div>

            {/* Info Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 flex items-start gap-4"
            >
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-paragraph text-blue-200">
                  <span className="font-semibold">💡 Pro Tip:</span> Connect Google Calendar to automatically sync your appointments and prevent double-bookings. Your clients will receive automatic reminders before their scheduled time.
                </p>
              </div>
            </motion.div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-neon-teal/10 to-neon-teal/5 border border-neon-teal/30 rounded-xl p-8 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-heading font-bold text-white mb-2">Profile Settings</h2>
                  <p className="text-light-gray font-paragraph">Manage your business profile and contact information</p>
                </div>
                {!editingProfile ? (
                  <Button onClick={() => setEditingProfile(true)} className="bg-neon-teal text-deep-charcoal hover:opacity-90 whitespace-nowrap">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2 whitespace-nowrap">
                    <Button onClick={handleSaveProfile} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingProfile(false)}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Main Profile Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* Business Name Card */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-neon-teal/20 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-neon-teal" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-white">Business Name</h3>
                  </div>
                  <Label htmlFor="displayName" className="text-light-gray font-paragraph text-sm mb-3 block">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="Your business name"
                    className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                  />
                  <p className="text-xs text-light-gray/70 mt-2 font-paragraph">This is how clients will see your business</p>
                </div>

                {/* Categories Card */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-white">Categories</h3>
                  </div>
                  <Label htmlFor="categoryTags" className="text-light-gray font-paragraph text-sm mb-3 block">
                    Service Categories
                  </Label>
                  <Input
                    id="categoryTags"
                    value={profileForm.categoryTags}
                    onChange={(e) => setProfileForm({ ...profileForm, categoryTags: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="e.g., Consulting, Coaching, Design"
                    className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                  />
                  <p className="text-xs text-light-gray/70 mt-2 font-paragraph">Separate multiple categories with commas</p>
                </div>

                {/* Address Card */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-white">Location</h3>
                  </div>
                  <Label htmlFor="addressText" className="text-light-gray font-paragraph text-sm mb-3 block">
                    Business Address
                  </Label>
                  <Textarea
                    id="addressText"
                    value={profileForm.addressText}
                    onChange={(e) => setProfileForm({ ...profileForm, addressText: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="Street address, city, state, zip code"
                    className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                    rows={3}
                  />
                  <p className="text-xs text-light-gray/70 mt-2 font-paragraph">Help clients find your location</p>
                </div>
              </motion.div>

              {/* Right Column - Contact Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                {/* Email Card */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-white">Email</h3>
                  </div>
                  <Label htmlFor="contactEmail" className="text-light-gray font-paragraph text-sm mb-3 block">
                    Contact Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={profileForm.contactEmail}
                    onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="your@email.com"
                    className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                  />
                  <p className="text-xs text-light-gray/70 mt-2 font-paragraph">For client inquiries</p>
                </div>

                {/* WhatsApp Card */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-white">WhatsApp</h3>
                  </div>
                  <Label htmlFor="whatsappNumber" className="text-light-gray font-paragraph text-sm mb-3 block">
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsappNumber"
                    value={profileForm.whatsappNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, whatsappNumber: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="+1 (555) 000-0000"
                    className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                  />
                  <p className="text-xs text-light-gray/70 mt-2 font-paragraph">For direct messaging</p>
                </div>

                {/* Public Profile Card */}
                <div className="bg-gradient-to-br from-neon-teal/10 to-neon-teal/5 border border-neon-teal/30 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-neon-teal/20 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-neon-teal" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-white">Public Profile</h3>
                  </div>
                  <Label htmlFor="slug" className="text-light-gray font-paragraph text-sm mb-3 block">
                    Profile URL
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-light-gray text-xs">
                        {window.location.origin}/p/
                      </span>
                      <Input
                        id="slug"
                        value={profileForm.slug}
                        onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value })}
                        disabled={!editingProfile}
                        className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50 pl-[180px] text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleCopySlug}
                      variant="outline"
                      className="border-neon-teal/30 text-neon-teal hover:bg-neon-teal/10"
                    >
                      {slugCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-light-gray/70 mt-2 font-paragraph">Share this link with clients</p>
                </div>
              </motion.div>
            </div>

            {/* Info Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3"
            >
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-paragraph text-blue-200">
                  <span className="font-semibold">Pro Tip:</span> Keep your profile information up-to-date so clients can easily reach you and learn about your services.
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Navigation - Bottom with modern gradient */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-t from-[#0a0a0f] to-[#12121a] border-t border-white/10 backdrop-blur-2xl z-50">
        <div className="flex items-center justify-around h-20 px-2">
          {[
            { value: 'overview', label: 'Overview', icon: Calendar, gradient: 'from-violet-600 to-fuchsia-600' },
            { value: 'appointments', label: 'Bookings', icon: BarChart3, gradient: 'from-blue-600 to-cyan-500' },
            { value: 'services', label: 'Services', icon: Zap, gradient: 'from-orange-600 to-amber-500' },
            { value: 'integrations', label: 'Connect', icon: Link2, gradient: 'from-green-600 to-emerald-500' },
            { value: 'profile', label: 'Profile', icon: Settings, gradient: 'from-pink-600 to-rose-500' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-all group ${
                activeTab === tab.value
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {activeTab === tab.value && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-20 rounded-2xl`}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-all ${
                activeTab === tab.value 
                  ? `bg-gradient-to-r ${tab.gradient}` 
                  : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                <tab.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-paragraph font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Email Notifications Settings Modal */}
      <Dialog open={showEmailSettings} onOpenChange={setShowEmailSettings}>
        <DialogContent className="bg-deep-charcoal border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Email Notification Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-heading font-semibold text-white mb-1">Enable Email Notifications</h3>
                  <p className="text-sm text-light-gray/70 font-paragraph">
                    Send automatic emails to clients when they book, and reminder emails before their appointment
                  </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className={`text-sm font-semibold ${emailNotificationsEnabled ? 'text-green-400' : 'text-light-gray'}`}>
                    {emailNotificationsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            {/* Notification Options */}
            {emailNotificationsEnabled && (
              <div className="space-y-4">
                <h3 className="text-lg font-heading font-semibold text-white">Notification Types</h3>

                {/* Confirmation Email */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      id="sendConfirmation"
                      checked={emailNotificationSettings.sendConfirmation}
                      onChange={(e) =>
                        setEmailNotificationSettings({
                          ...emailNotificationSettings,
                          sendConfirmation: e.target.checked,
                        })
                      }
                      className="w-5 h-5 mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="sendConfirmation" className="text-light-gray font-semibold cursor-pointer block">
                        Booking Confirmation Email
                      </Label>
                      <p className="text-sm text-light-gray/70 font-paragraph mt-2">
                        Send an email immediately when a client books an appointment with details about their booking
                      </p>
                      <div className="mt-4 bg-deep-charcoal border border-white/10 rounded-lg p-4">
                        <p className="text-xs text-light-gray/70 font-paragraph mb-2">Preview:</p>
                        <div className="text-xs text-light-gray/60 space-y-1">
                          <p>✓ Booking Confirmed!</p>
                          <p>Service: [Service Name]</p>
                          <p>Provider: [Provider Name]</p>
                          <p>Date & Time: [Appointment Date & Time]</p>
                          <p>Duration: [Duration] minutes</p>
                          <p>Price: $[Price]</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 24h Reminder */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      id="sendReminder24h"
                      checked={emailNotificationSettings.sendReminder24h}
                      onChange={(e) =>
                        setEmailNotificationSettings({
                          ...emailNotificationSettings,
                          sendReminder24h: e.target.checked,
                        })
                      }
                      className="w-5 h-5 mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="sendReminder24h" className="text-light-gray font-semibold cursor-pointer block">
                        24-Hour Reminder Email
                      </Label>
                      <p className="text-sm text-light-gray/70 font-paragraph mt-2">
                        Send a reminder email 24 hours before the appointment
                      </p>
                      <div className="mt-4 bg-deep-charcoal border border-white/10 rounded-lg p-4">
                        <p className="text-xs text-light-gray/70 font-paragraph mb-2">Preview:</p>
                        <div className="text-xs text-light-gray/60 space-y-1">
                          <p>⏰ Appointment Reminder</p>
                          <p>Hi [Client Name],</p>
                          <p>This is a friendly reminder that your appointment is tomorrow!</p>
                          <p>Service: [Service Name]</p>
                          <p>Date & Time: [Appointment Date & Time]</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2h Reminder */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      id="sendReminder2h"
                      checked={emailNotificationSettings.sendReminder2h}
                      onChange={(e) =>
                        setEmailNotificationSettings({
                          ...emailNotificationSettings,
                          sendReminder2h: e.target.checked,
                        })
                      }
                      className="w-5 h-5 mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="sendReminder2h" className="text-light-gray font-semibold cursor-pointer block">
                        2-Hour Reminder Email
                      </Label>
                      <p className="text-sm text-light-gray/70 font-paragraph mt-2">
                        Send a reminder email 2 hours before the appointment
                      </p>
                      <div className="mt-4 bg-deep-charcoal border border-white/10 rounded-lg p-4">
                        <p className="text-xs text-light-gray/70 font-paragraph mb-2">Preview:</p>
                        <div className="text-xs text-light-gray/60 space-y-1">
                          <p>⏰ Appointment Reminder</p>
                          <p>Hi [Client Name],</p>
                          <p>This is a friendly reminder that your appointment is in 2 hours!</p>
                          <p>Service: [Service Name]</p>
                          <p>Date & Time: [Appointment Date & Time]</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-paragraph text-blue-200">
                  <span className="font-semibold">Note:</span> Email notifications are sent automatically when appointments are created. Reminders are sent at the scheduled times.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
              <Button
                onClick={() => setShowEmailSettings(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEmailNotifications} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Modal */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="bg-deep-charcoal border-white/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {editingService ? 'Edit Service' : 'Create New Service'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="serviceName" className="text-light-gray font-paragraph">Service Name</Label>
                <Input
                  id="serviceName"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g., Consultation, Haircut, Massage"
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </div>
              <div>
                <Label htmlFor="serviceCategory" className="text-light-gray font-paragraph">Category</Label>
                <Input
                  id="serviceCategory"
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                  placeholder="e.g., Health, Beauty, Business"
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </div>
            </div>

            {/* Duration and Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="serviceDuration" className="text-light-gray font-paragraph">Duration (minutes)</Label>
                <Input
                  id="serviceDuration"
                  type="number"
                  value={serviceForm.durationMin}
                  onChange={(e) => setServiceForm({ ...serviceForm, durationMin: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </div>
              <div>
                <Label htmlFor="servicePrice" className="text-light-gray font-paragraph">Base Price ($)</Label>
                <Input
                  id="servicePrice"
                  type="number"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </div>
              <div>
                <Label htmlFor="serviceMaxPeople" className="text-light-gray font-paragraph">Max People</Label>
                <Input
                  id="serviceMaxPeople"
                  type="number"
                  value={serviceForm.maxPeoplePerBooking}
                  onChange={(e) => setServiceForm({ ...serviceForm, maxPeoplePerBooking: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </div>
            </div>

            {/* Price Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-light-gray font-paragraph">Price Variants (Optional)</Label>
                <Button
                  type="button"
                  onClick={handleAddPriceOption}
                  size="sm"
                  className="bg-neon-teal/20 text-neon-teal hover:bg-neon-teal/30"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Variant
                </Button>
              </div>
              {priceOptions.map((option, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input
                      value={option.name}
                      onChange={(e) => handleUpdatePriceOption(idx, 'name', e.target.value)}
                      placeholder="Variant name (e.g., Small, Medium, Large)"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      value={option.price}
                      onChange={(e) => handleUpdatePriceOption(idx, 'price', e.target.value)}
                      placeholder="Price"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleRemovePriceOption(idx)}
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Buffer Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="bufferBefore" className="text-light-gray font-paragraph">Buffer Before (minutes)</Label>
                <Input
                  id="bufferBefore"
                  type="number"
                  value={serviceForm.bufferBeforeMin}
                  onChange={(e) => setServiceForm({ ...serviceForm, bufferBeforeMin: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
                <p className="text-xs text-light-gray/60 mt-1">Time before appointment starts</p>
              </div>
              <div>
                <Label htmlFor="bufferAfter" className="text-light-gray font-paragraph">Buffer After (minutes)</Label>
                <Input
                  id="bufferAfter"
                  type="number"
                  value={serviceForm.bufferAfterMin}
                  onChange={(e) => setServiceForm({ ...serviceForm, bufferAfterMin: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
                <p className="text-xs text-light-gray/60 mt-1">Time after appointment ends</p>
              </div>
            </div>

            {/* Service Schedule */}
            <div className="space-y-4">
              <Label className="text-light-gray font-paragraph">Service Availability</Label>
              <div className="space-y-3">
                {serviceSchedule.map((day) => {
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  return (
                    <div key={day.dayOfWeek} className="flex items-center gap-4 bg-white/5 p-4 rounded-lg">
                      <div className="flex items-center gap-3 w-32">
                        <input
                          type="checkbox"
                          checked={day.isActive}
                          onChange={(e) => handleUpdateScheduleDay(day.dayOfWeek, 'isActive', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-white font-paragraph">{dayNames[day.dayOfWeek]}</span>
                      </div>
                      {day.isActive && (
                        <>
                          <Input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => handleUpdateScheduleDay(day.dayOfWeek, 'startTime', e.target.value)}
                            className="bg-white/5 border-white/20 text-white w-32"
                          />
                          <span className="text-white/50">to</span>
                          <Input
                            type="time"
                            value={day.endTime}
                            onChange={(e) => handleUpdateScheduleDay(day.dayOfWeek, 'endTime', e.target.value)}
                            className="bg-white/5 border-white/20 text-white w-32"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="serviceActive"
                checked={serviceForm.isActive}
                onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                className="w-5 h-5"
              />
              <Label htmlFor="serviceActive" className="text-light-gray font-paragraph cursor-pointer">
                Service is active and available for booking
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
              <Button
                onClick={() => setShowServiceModal(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveService} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                <Save className="w-4 h-4 mr-2" />
                {editingService ? 'Update Service' : 'Create Service'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Theme Customizer Modal */}
      <Dialog open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer}>
        <DialogContent className="bg-deep-charcoal border-white/20 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl flex items-center gap-3">
              <Palette className="w-7 h-7 text-purple-400" />
              Dashboard Theme Customizer
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* Background Gradient Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-semibold">1</div>
                <h3 className="text-lg font-heading font-semibold text-white">Background Style</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'Dark Cosmic', value: 'from-[#0a0a0f] via-[#12121a] to-[#1a1a28]' },
                  { name: 'Deep Ocean', value: 'from-[#0f172a] via-[#1e293b] to-[#334155]' },
                  { name: 'Purple Night', value: 'from-[#1a0a2e] via-[#2d1b4e] to-[#4a2c6d]' },
                  { name: 'Forest Dark', value: 'from-[#0a1f0a] via-[#1a2f1a] to-[#2a4f2a]' },
                  { name: 'Midnight Blue', value: 'from-[#0a0f2e] via-[#1a1f4e] to-[#2a2f6d]' },
                  { name: 'Crimson Shadow', value: 'from-[#2e0a0a] via-[#4e1a1a] to-[#6d2a2a]' },
                ].map((bg) => (
                  <motion.button
                    key={bg.value}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setDashboardTheme({ ...dashboardTheme, backgroundGradient: bg.value })}
                    className={`relative h-24 rounded-xl border-2 transition-all overflow-hidden ${
                      dashboardTheme.backgroundGradient === bg.value
                        ? 'border-white ring-2 ring-white/30'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${bg.value}`} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-white text-xs font-semibold text-center px-2">{bg.name}</span>
                    </div>
                    {dashboardTheme.backgroundGradient === bg.value && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Primary Color Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-semibold">2</div>
                <h3 className="text-lg font-heading font-semibold text-white">Primary Color</h3>
              </div>
              
              <div className="grid grid-cols-8 gap-3">
                {[
                  { name: 'Neon Teal', value: '#00FFD4' },
                  { name: 'Electric Blue', value: '#0EA5E9' },
                  { name: 'Cyber Purple', value: '#A855F7' },
                  { name: 'Hot Pink', value: '#EC4899' },
                  { name: 'Lime Green', value: '#84CC16' },
                  { name: 'Amber', value: '#F59E0B' },
                  { name: 'Rose', value: '#F43F5E' },
                  { name: 'Emerald', value: '#10B981' },
                ].map((color) => (
                  <motion.button
                    key={color.value}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setDashboardTheme({ ...dashboardTheme, primaryColor: color.value })}
                    className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                      dashboardTheme.primaryColor === color.value
                        ? 'border-white scale-110 ring-2 ring-white/30'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {dashboardTheme.primaryColor === color.value && <Check className="w-5 h-5 text-deep-charcoal" />}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Secondary Color Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-semibold">3</div>
                <h3 className="text-lg font-heading font-semibold text-white">Secondary Color</h3>
              </div>
              
              <div className="grid grid-cols-8 gap-3">
                {[
                  { name: 'Violet', value: '#6678FF' },
                  { name: 'Sky Blue', value: '#38BDF8' },
                  { name: 'Fuchsia', value: '#D946EF' },
                  { name: 'Orange', value: '#FB923C' },
                  { name: 'Teal', value: '#14B8A6' },
                  { name: 'Indigo', value: '#6366F1' },
                  { name: 'Pink', value: '#F472B6' },
                  { name: 'Cyan', value: '#22D3EE' },
                ].map((color) => (
                  <motion.button
                    key={color.value}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setDashboardTheme({ ...dashboardTheme, secondaryColor: color.value })}
                    className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                      dashboardTheme.secondaryColor === color.value
                        ? 'border-white scale-110 ring-2 ring-white/30'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {dashboardTheme.secondaryColor === color.value && <Check className="w-5 h-5 text-white" />}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Card Style Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-semibold">4</div>
                <h3 className="text-lg font-heading font-semibold text-white">Card Style</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'Glass', value: 'glass', desc: 'Frosted glass effect' },
                  { name: 'Solid', value: 'solid', desc: 'Solid background' },
                  { name: 'Gradient', value: 'gradient', desc: 'Gradient overlay' },
                ].map((style) => (
                  <motion.button
                    key={style.value}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setDashboardTheme({ ...dashboardTheme, cardStyle: style.value })}
                    className={`relative h-28 rounded-xl border-2 transition-all overflow-hidden ${
                      dashboardTheme.cardStyle === style.value
                        ? 'border-white ring-2 ring-white/30'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                  >
                    <div className={`absolute inset-0 ${
                      style.value === 'glass' ? 'bg-white/5 backdrop-blur-xl' :
                      style.value === 'solid' ? 'bg-white/10' :
                      'bg-gradient-to-br from-purple-600/20 to-pink-600/20'
                    }`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white text-sm font-semibold mb-1">{style.name}</span>
                      <span className="text-white/60 text-xs">{style.desc}</span>
                    </div>
                    {dashboardTheme.cardStyle === style.value && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-heading font-semibold text-white">Preview</h3>
              </div>
              
              <div className={`relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br ${dashboardTheme.backgroundGradient}`}>
                <div className="absolute inset-0 p-6 space-y-4">
                  <div className={`h-16 rounded-xl ${
                    dashboardTheme.cardStyle === 'glass' ? 'bg-white/5 backdrop-blur-xl border border-white/10' :
                    dashboardTheme.cardStyle === 'solid' ? 'bg-white/10 border border-white/20' :
                    'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
                  } flex items-center px-4`}>
                    <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: dashboardTheme.primaryColor }} />
                    <div className="ml-4 flex-1">
                      <div className="h-3 w-32 rounded" style={{ backgroundColor: dashboardTheme.primaryColor, opacity: 0.3 }} />
                      <div className="h-2 w-24 rounded mt-2" style={{ backgroundColor: dashboardTheme.secondaryColor, opacity: 0.3 }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-20 rounded-xl ${
                          dashboardTheme.cardStyle === 'glass' ? 'bg-white/5 backdrop-blur-xl border border-white/10' :
                          dashboardTheme.cardStyle === 'solid' ? 'bg-white/10 border border-white/20' :
                          'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-between pt-4 border-t border-white/10">
              <Button
                onClick={handleResetTheme}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowThemeCustomizer(false)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTheme} 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Theme
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
