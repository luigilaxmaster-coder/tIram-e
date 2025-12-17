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
import { Providers, Services, Appointments, PriceOption } from '@/entities';
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Calendar, Clock, Users, DollarSign, Plus, Edit, Trash2, Save, X, Copy, Check, TrendingUp, AlertCircle, CheckCircle, Eye, Settings, BarChart3, Zap, Minus, LogOut, Link2, MapPin, Mail, MessageCircle, Globe, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  const [appointmentFilter, setAppointmentFilter] = useState<'today' | 'week' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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
  }, [provider, appointmentFilter, customStartDate, customEndDate]);

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
      let filtered = allAppointments.filter((a) => a.providerId === provider._id);

      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (appointmentFilter === 'today') {
        startDate = startOfDay(now);
        endDate = endOfDay(now);
      } else if (appointmentFilter === 'week') {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
      } else if (appointmentFilter === 'custom' && customStartDate && customEndDate) {
        startDate = startOfDay(new Date(customStartDate));
        endDate = endOfDay(new Date(customEndDate));
      } else {
        setAppointments(filtered);
        return;
      }

      filtered = filtered.filter((a) => {
        if (!a.startAt) return false;
        const apptDate = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
        return apptDate >= startDate && apptDate <= endDate;
      });

      filtered.sort((a, b) => {
        const dateA = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
        const dateB = typeof b.startAt === 'string' ? parseISO(b.startAt) : b.startAt;
        return dateA!.getTime() - dateB!.getTime();
      });

      setAppointments(filtered);
    } catch (error) {
      console.error('Error loading appointments:', error);
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
  const todayAppointments = appointments.filter((a) => {
    if (!a.startAt) return false;
    const apptDate = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
    return apptDate >= startOfDay(new Date()) && apptDate <= endOfDay(new Date());
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
    <div className="min-h-screen bg-gradient-to-br from-deep-charcoal via-deep-charcoal to-[#1a1a1a] pb-24 md:pb-0">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-teal/5 to-transparent opacity-50" />
        <div className="relative max-w-[100rem] mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-6xl font-heading font-bold text-white mb-2">
                  {provider?.displayName || 'Dashboard'}
                </h1>
                <p className="text-light-gray font-paragraph">Welcome back! Manage your services and appointments</p>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="hidden lg:block"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-teal/20 to-neon-teal/5 border border-neon-teal/30 flex items-center justify-center">
                  <Zap className="w-12 h-12 text-neon-teal" />
                </div>
              </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Today's Appointments",
                  value: todayAppointments.length,
                  icon: Calendar,
                  color: 'from-blue-500/20 to-blue-500/5',
                  iconColor: 'text-blue-400',
                },
                {
                  label: 'Total Services',
                  value: services.length,
                  icon: BarChart3,
                  color: 'from-purple-500/20 to-purple-500/5',
                  iconColor: 'text-purple-400',
                },
                {
                  label: 'Confirmed Bookings',
                  value: confirmedAppointments,
                  icon: CheckCircle,
                  color: 'from-green-500/20 to-green-500/5',
                  iconColor: 'text-green-400',
                },
                {
                  label: 'Potential Revenue',
                  value: `${totalRevenue.toFixed(2)}`,
                  icon: TrendingUp,
                  color: 'from-neon-teal/20 to-neon-teal/5',
                  iconColor: 'text-neon-teal',
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`bg-gradient-to-br ${stat.color} border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:border-white/20 transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-light-gray font-paragraph text-sm mb-2">{stat.label}</p>
                      <p className="text-3xl font-heading font-bold text-white">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center ${stat.iconColor}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[100rem] mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Desktop Navigation - Top */}
          <TabsList className="hidden md:grid bg-white/5 border border-white/10 rounded-lg p-1 w-full grid-cols-5 gap-1">
            {[
              { value: 'overview', label: 'Overview', icon: BarChart3 },
              { value: 'appointments', label: 'Appointments', icon: Calendar },
              { value: 'services', label: 'Services', icon: Zap },
              { value: 'integrations', label: 'Integrations', icon: Link2 },
              { value: 'profile', label: 'Profile', icon: Settings },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-neon-teal data-[state=active]:text-deep-charcoal data-[state=active]:shadow-lg data-[state=active]:shadow-neon-teal/20 rounded-md transition-all"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Upcoming Appointments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-neon-teal" />
                  Upcoming Appointments
                </h2>
                <Button
                  onClick={() => setActiveTab('appointments')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  View All
                </Button>
              </div>

              {todayAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-light-gray/50 mx-auto mb-4" />
                  <p className="text-light-gray font-paragraph">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.slice(0, 5).map((appt, idx) => (
                    <motion.div
                      key={appt._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-deep-charcoal border border-white/10 rounded-lg p-4 hover:border-neon-teal/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-neon-teal/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-neon-teal" />
                          </div>
                          <div className="flex-1">
                            <p className="font-heading font-semibold text-white">{appt.clientName}</p>
                            <p className="text-sm text-light-gray">
                              {appt.startAt && format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'h:mm a')} •{' '}
                              {appt.peopleCount} {appt.peopleCount === 1 ? 'person' : 'people'}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-paragraph bg-neon-teal/20 text-neon-teal">
                          {appt.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Services Summary */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                <h3 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-neon-teal" />
                  Services
                </h3>
                <p className="text-3xl font-heading font-bold text-neon-teal mb-4">{services.length}</p>
                <Button
                  onClick={() => setActiveTab('services')}
                  className="w-full bg-neon-teal/20 text-neon-teal border border-neon-teal/30 hover:bg-neon-teal/30"
                >
                  Manage Services
                </Button>
              </div>

              {/* Profile Status */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                <h3 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-neon-teal" />
                  Public Profile
                </h3>
                <p className="text-sm text-light-gray mb-4 font-paragraph">
                  Share your profile link with clients
                </p>
                <Button
                  onClick={handleCopySlug}
                  className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90"
                >
                  {slugCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy Profile URL
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading font-bold text-white">All Appointments</h2>
                <Select
                  value={appointmentFilter}
                  onValueChange={(value: any) => setAppointmentFilter(value)}
                >
                  <SelectTrigger className="bg-deep-charcoal border-white/20 text-white w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {appointmentFilter === 'custom' && (
                <div className="flex gap-4 mb-6">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-deep-charcoal border-white/20 text-white"
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-deep-charcoal border-white/20 text-white"
                  />
                </div>
              )}

              {appointments.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-light-gray/50 mx-auto mb-4" />
                  <p className="text-light-gray font-paragraph">No appointments found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt, idx) => (
                    <motion.div
                      key={appt._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-deep-charcoal border border-white/10 rounded-lg p-4 hover:border-neon-teal/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-heading font-semibold text-white">{appt.clientName}</p>
                          <p className="text-sm text-light-gray">
                            {appt.startAt &&
                              format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'EEE, MMM d • h:mm a')}
                          </p>
                          <p className="text-xs text-light-gray/70 mt-1">{appt.clientEmail} • {appt.clientPhone}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-paragraph ${
                              appt.status === 'CONFIRMED'
                                ? 'bg-green-500/20 text-green-400'
                                : appt.status === 'CANCELLED'
                                ? 'bg-destructive/20 text-destructive'
                                : 'bg-light-gray/20 text-light-gray'
                            }`}
                          >
                            {appt.status}
                          </span>
                          <p className="text-sm text-light-gray mt-2">{appt.peopleCount} people</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-heading font-bold text-white">Your Services</h2>
                <Button onClick={() => handleOpenServiceModal()} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-light-gray/50 mx-auto mb-4" />
                  <p className="text-light-gray font-paragraph mb-4">No services yet. Create your first service!</p>
                  <Button onClick={() => handleOpenServiceModal()} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
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
                      className="bg-deep-charcoal border border-white/10 rounded-lg p-6 hover:border-neon-teal/30 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-heading font-semibold text-white group-hover:text-neon-teal transition-colors">
                            {service.name}
                          </h3>
                          {service.category && (
                            <p className="text-xs text-neon-teal/70 mt-1">{service.category}</p>
                          )}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenServiceModal(service)}
                            className="p-2 rounded-lg bg-neon-teal/20 text-neon-teal hover:bg-neon-teal/30 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service._id)}
                            className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-light-gray flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neon-teal/50" />
                            Duration
                          </span>
                          <span className="font-heading font-semibold text-white">{service.durationMin} min</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-light-gray flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-neon-teal/50" />
                            Price
                          </span>
                          <span className="font-heading font-semibold text-neon-teal">${service.price}</span>
                        </div>
                        {service.priceOptions && (() => {
                          try {
                            const opts = JSON.parse(service.priceOptions);
                            if (Array.isArray(opts) && opts.length > 0) {
                              return (
                                <div className="text-sm">
                                  <p className="text-light-gray mb-2">Variants:</p>
                                  <div className="space-y-1">
                                    {opts.map((opt: PriceOption, idx: number) => (
                                      <div key={idx} className="text-xs text-light-gray/70">
                                        {opt.name}: ${opt.price}
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
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-light-gray flex items-center gap-2">
                            <Users className="w-4 h-4 text-neon-teal/50" />
                            Max People
                          </span>
                          <span className="font-heading font-semibold text-white">{service.maxPeoplePerBooking}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-paragraph ${
                            service.isActive !== false ? 'bg-green-500/20 text-green-400' : 'bg-light-gray/20 text-light-gray'
                          }`}
                        >
                          {service.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
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

      {/* Mobile Navigation - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-deep-charcoal border-t border-white/10 backdrop-blur-sm z-50">
        <div className="flex items-center justify-around h-20">
          {[
            { value: 'overview', label: 'Upcoming', icon: Calendar },
            { value: 'appointments', label: 'All Appts', icon: BarChart3 },
            { value: 'services', label: 'Services', icon: Zap },
            { value: 'integrations', label: 'Integrations', icon: Link2 },
            { value: 'profile', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all ${
                activeTab === tab.value
                  ? 'bg-neon-teal/10 text-neon-teal'
                  : 'text-light-gray hover:text-white'
              }`}
            >
              <tab.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-paragraph">{tab.label}</span>
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
          <div className="space-y-8">
            {/* Step 1: Basic Info */}
            <div className="space-y-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-neon-teal/20 flex items-center justify-center text-neon-teal font-semibold">1</div>
                <h3 className="text-lg font-heading font-semibold text-white">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="serviceName" className="text-light-gray font-semibold">
                    Service Name *
                  </Label>
                  <Input
                    id="serviceName"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g., Personal Training Session"
                    className="bg-white/5 border-white/20 text-white mt-2"
                  />
                  <p className="text-xs text-light-gray/60 mt-1">What is the name of this service?</p>
                </div>

                <div>
                  <Label htmlFor="serviceCategory" className="text-light-gray font-semibold">
                    Category
                  </Label>
                  <Input
                    id="serviceCategory"
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    placeholder="e.g., Fitness"
                    className="bg-white/5 border-white/20 text-white mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="serviceDuration" className="text-light-gray font-semibold">
                    Duration (minutes) *
                  </Label>
                  <Input
                    id="serviceDuration"
                    type="number"
                    min="1"
                    value={serviceForm.durationMin}
                    onChange={(e) => setServiceForm({ ...serviceForm, durationMin: parseInt(e.target.value) })}
                    className="bg-white/5 border-white/20 text-white mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="servicePrice" className="text-light-gray font-semibold">
                    Base Price ($)
                  </Label>
                  <Input
                    id="servicePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) })}
                    className="bg-white/5 border-white/20 text-white mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="maxPeople" className="text-light-gray font-semibold">
                    Max People Per Booking *
                  </Label>
                  <Input
                    id="maxPeople"
                    type="number"
                    min="1"
                    value={serviceForm.maxPeoplePerBooking}
                    onChange={(e) => setServiceForm({ ...serviceForm, maxPeoplePerBooking: parseInt(e.target.value) })}
                    className="bg-white/5 border-white/20 text-white mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="serviceActive" className="text-light-gray font-semibold flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="serviceActive"
                      checked={serviceForm.isActive}
                      onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Active
                  </Label>
                </div>
              </div>
            </div>

            {/* Step 2: Visual Design */}
            <div className="space-y-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-neon-teal/20 flex items-center justify-center text-neon-teal font-semibold">2</div>
                <h3 className="text-lg font-heading font-semibold text-white">Visual Design</h3>
              </div>

              <div>
                <Label className="text-light-gray font-semibold block mb-3">Card Background Color</Label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { name: 'Teal', value: '#00FFD4' },
                    { name: 'Red', value: '#FF4136' },
                    { name: 'Green', value: '#2ECC40' },
                    { name: 'Blue', value: '#0074D9' },
                    { name: 'Purple', value: '#B10DC9' },
                    { name: 'Orange', value: '#FF851B' },
                    { name: 'Pink', value: '#F012BE' },
                    { name: 'Yellow', value: '#FFDC00' },
                  ].map((color) => (
                    <motion.button
                      key={color.value}
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setServiceForm({ ...serviceForm, cardColor: color.value })}
                      className={`w-14 h-14 rounded-lg border-2 transition-all flex items-center justify-center ${
                        serviceForm.cardColor === color.value
                          ? 'border-white scale-110 ring-2 ring-white/30'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {serviceForm.cardColor === color.value && <Check className="w-6 h-6 text-deep-charcoal" />}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-light-gray font-semibold block mb-3">Text Color</Label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { name: 'White', value: '#FFFFFF' },
                    { name: 'Black', value: '#000000' },
                    { name: 'Teal', value: '#00FFD4' },
                    { name: 'Red', value: '#FF4136' },
                    { name: 'Green', value: '#2ECC40' },
                    { name: 'Blue', value: '#0074D9' },
                    { name: 'Purple', value: '#B10DC9' },
                    { name: 'Orange', value: '#FF851B' },
                  ].map((color) => (
                    <motion.button
                      key={color.value}
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setServiceForm({ ...serviceForm, textColor: color.value, textGradient: '' })}
                      className={`w-14 h-14 rounded-lg border-2 transition-all flex items-center justify-center ${
                        serviceForm.textColor === color.value && !serviceForm.textGradient
                          ? 'border-white scale-110 ring-2 ring-white/30'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {serviceForm.textColor === color.value && !serviceForm.textGradient && <Check className="w-6 h-6" style={{ color: color.value === '#FFFFFF' ? '#000000' : '#FFFFFF' }} />}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="textGradient" className="text-light-gray font-semibold">
                  Text Gradient (Optional)
                </Label>
                <p className="text-xs text-light-gray/60 mb-2">Format: #color1 to #color2 (e.g., #FF4136 to #00FFD4)</p>
                <Input
                  id="textGradient"
                  placeholder="e.g., #FF4136 to #00FFD4"
                  value={serviceForm.textGradient}
                  onChange={(e) => setServiceForm({ ...serviceForm, textGradient: e.target.value })}
                  className="bg-white/5 border-white/20 text-white"
                />
                {serviceForm.textGradient && (
                  <div className="mt-3 p-4 rounded-lg border border-white/10 bg-white/5">
                    <p className="text-xs text-light-gray/70 mb-2">Preview:</p>
                    <div
                      className="text-2xl font-heading font-bold py-2 px-4 rounded"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${serviceForm.textGradient.split(' to ')[0]}, ${serviceForm.textGradient.split(' to ')[1] || serviceForm.textGradient.split(' to ')[0]})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {serviceForm.name || 'Sample Text'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Price Variants */}
            <div className="space-y-4 pb-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neon-teal/20 flex items-center justify-center text-neon-teal font-semibold">3</div>
                  <h3 className="text-lg font-heading font-semibold text-white">Price Variants (Optional)</h3>
                </div>
                <Button
                  onClick={handleAddPriceOption}
                  size="sm"
                  className="bg-neon-teal/20 text-neon-teal border border-neon-teal/30 hover:bg-neon-teal/30"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Variant
                </Button>
              </div>
              
              <p className="text-sm text-light-gray/70 font-paragraph">
                Add different price options for this service (e.g., Regular, Premium, Deluxe)
              </p>

              {priceOptions.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                  <p className="text-light-gray/70 font-paragraph text-sm">No price variants yet. Add one to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priceOptions.map((option, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 items-end bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex-1">
                        <Label htmlFor={`optionName-${idx}`} className="text-light-gray text-xs">
                          Variant Name
                        </Label>
                        <Input
                          id={`optionName-${idx}`}
                          placeholder="e.g., Regular, Premium, Deluxe"
                          value={option.name}
                          onChange={(e) => handleUpdatePriceOption(idx, 'name', e.target.value)}
                          className="bg-deep-charcoal border-white/20 text-white mt-1"
                        />
                      </div>
                      <div className="w-32">
                        <Label htmlFor={`optionPrice-${idx}`} className="text-light-gray text-xs">
                          Price ($)
                        </Label>
                        <Input
                          id={`optionPrice-${idx}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={option.price}
                          onChange={(e) => handleUpdatePriceOption(idx, 'price', e.target.value)}
                          className="bg-deep-charcoal border-white/20 text-white mt-1"
                        />
                      </div>
                      <Button
                        onClick={() => handleRemovePriceOption(idx)}
                        size="sm"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 4: Availability Schedule */}
            <div className="space-y-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-neon-teal/20 flex items-center justify-center text-neon-teal font-semibold">4</div>
                <h3 className="text-lg font-heading font-semibold text-white">Availability Schedule</h3>
              </div>
              <p className="text-sm text-light-gray/70 font-paragraph">
                Set the days and hours when this service is available for booking
              </p>

              <div className="space-y-3">
                {serviceSchedule.map((day) => {
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  return (
                    <motion.div
                      key={day.dayOfWeek}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`day-${day.dayOfWeek}`}
                          checked={day.isActive}
                          onChange={(e) => handleUpdateScheduleDay(day.dayOfWeek, 'isActive', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`day-${day.dayOfWeek}`} className="text-light-gray font-semibold flex-1">
                          {dayNames[day.dayOfWeek]}
                        </Label>
                      </div>

                      {day.isActive && (
                        <div className="flex gap-3 ml-7">
                          <div className="flex-1">
                            <Label htmlFor={`start-${day.dayOfWeek}`} className="text-light-gray text-xs">
                              Start Time
                            </Label>
                            <Input
                              id={`start-${day.dayOfWeek}`}
                              type="time"
                              value={day.startTime}
                              onChange={(e) => handleUpdateScheduleDay(day.dayOfWeek, 'startTime', e.target.value)}
                              className="bg-deep-charcoal border-white/20 text-white mt-1"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`end-${day.dayOfWeek}`} className="text-light-gray text-xs">
                              End Time
                            </Label>
                            <Input
                              id={`end-${day.dayOfWeek}`}
                              type="time"
                              value={day.endTime}
                              onChange={(e) => handleUpdateScheduleDay(day.dayOfWeek, 'endTime', e.target.value)}
                              className="bg-deep-charcoal border-white/20 text-white mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Advanced Settings */}
            <div className="space-y-4 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-neon-teal/20 flex items-center justify-center text-neon-teal font-semibold">5</div>
                <h3 className="text-lg font-heading font-semibold text-white">Advanced Settings</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bufferBefore" className="text-light-gray font-semibold">
                    Buffer Before (min)
                  </Label>
                  <Input
                    id="bufferBefore"
                    type="number"
                    min="0"
                    value={serviceForm.bufferBeforeMin}
                    onChange={(e) => setServiceForm({ ...serviceForm, bufferBeforeMin: parseInt(e.target.value) })}
                    className="bg-white/5 border-white/20 text-white mt-2"
                  />
                  <p className="text-xs text-light-gray/60 mt-1">Time before appointment to block</p>
                </div>

                <div>
                  <Label htmlFor="bufferAfter" className="text-light-gray font-semibold">
                    Buffer After (min)
                  </Label>
                  <Input
                    id="bufferAfter"
                    type="number"
                    min="0"
                    value={serviceForm.bufferAfterMin}
                    onChange={(e) => setServiceForm({ ...serviceForm, bufferAfterMin: parseInt(e.target.value) })}
                    className="bg-white/5 border-white/20 text-white mt-2"
                  />
                  <p className="text-xs text-light-gray/60 mt-1">Time after appointment to block</p>
                </div>

                <div>
                  <Label className="text-light-gray font-semibold block mb-2">Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="serviceActive"
                      checked={serviceForm.isActive}
                      onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="serviceActive" className="text-light-gray cursor-pointer">
                      {serviceForm.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
              <Button
                onClick={() => setShowServiceModal(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveService} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                {editingService ? 'Update' : 'Create'} Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
