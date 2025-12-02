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
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Calendar, Clock, Users, DollarSign, Plus, Edit, Trash2, Save, X, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function ProviderDashboard() {
  const { member } = useMember();
  const { toast } = useToast();
  const [provider, setProvider] = useState<Providers | null>(null);
  const [services, setServices] = useState<Services[]>([]);
  const [appointments, setAppointments] = useState<Appointments[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');

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
  });

  // Appointments filter
  const [appointmentFilter, setAppointmentFilter] = useState<'today' | 'week' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadProviderData();
  }, [member]);

  useEffect(() => {
    if (provider) {
      loadAppointments();
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
      });
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
      });
    }
    setShowServiceModal(true);
  };

  const handleSaveService = async () => {
    if (!provider) return;

    try {
      if (editingService) {
        await BaseCrudService.update<Services>('services', {
          _id: editingService._id,
          ...serviceForm,
        });
        setServices(services.map((s) => (s._id === editingService._id ? { ...s, ...serviceForm } : s)));
        toast({
          title: 'Success',
          description: 'Service updated successfully',
        });
      } else {
        const newService: Services = {
          _id: `${provider._id}-${crypto.randomUUID()}`,
          ...serviceForm,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-charcoal flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-charcoal text-foreground">
      <div className="max-w-[100rem] mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl font-heading font-bold text-white mb-8">Provider Dashboard</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="today" className="data-[state=active]:bg-neon-teal data-[state=active]:text-deep-charcoal">
                Today
              </TabsTrigger>
              <TabsTrigger value="week" className="data-[state=active]:bg-neon-teal data-[state=active]:text-deep-charcoal">
                This Week
              </TabsTrigger>
              <TabsTrigger value="services" className="data-[state=active]:bg-neon-teal data-[state=active]:text-deep-charcoal">
                Services
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-neon-teal data-[state=active]:text-deep-charcoal">
                Profile
              </TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-neon-teal data-[state=active]:text-deep-charcoal">
                All Appointments
              </TabsTrigger>
            </TabsList>

            {/* Today Tab */}
            <TabsContent value="today">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-3xl font-heading font-bold text-white mb-6">Today's Appointments</h2>
                {appointments.length === 0 ? (
                  <p className="text-light-gray font-paragraph">No appointments for today.</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appt) => (
                      <div
                        key={appt._id}
                        className="bg-deep-charcoal border border-white/20 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-heading text-lg text-white">{appt.clientName}</p>
                          <p className="font-paragraph text-sm text-light-gray">
                            {appt.startAt && format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'h:mm a')} -{' '}
                            {appt.endAt && format(typeof appt.endAt === 'string' ? parseISO(appt.endAt) : appt.endAt, 'h:mm a')}
                          </p>
                          <p className="font-paragraph text-sm text-light-gray">{appt.clientEmail}</p>
                          <p className="font-paragraph text-sm text-light-gray">{appt.clientPhone}</p>
                          {appt.notes && <p className="font-paragraph text-sm text-light-gray mt-2">Notes: {appt.notes}</p>}
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 rounded text-sm font-paragraph ${
                              appt.status === 'CONFIRMED'
                                ? 'bg-neon-teal/20 text-neon-teal'
                                : appt.status === 'CANCELLED'
                                ? 'bg-destructive/20 text-destructive'
                                : 'bg-light-gray/20 text-light-gray'
                            }`}
                          >
                            {appt.status}
                          </span>
                          <p className="font-paragraph text-sm text-light-gray mt-2">
                            {appt.peopleCount} {appt.peopleCount === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Week Tab */}
            <TabsContent value="week">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-3xl font-heading font-bold text-white mb-6">This Week's Appointments</h2>
                {appointments.length === 0 ? (
                  <p className="text-light-gray font-paragraph">No appointments for this week.</p>
                ) : (
                  <div className="space-y-6">
                    {Array.from(
                      appointments.reduce((acc, appt) => {
                        const date = appt.startAt
                          ? format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'yyyy-MM-dd')
                          : 'unknown';
                        if (!acc.has(date)) acc.set(date, []);
                        acc.get(date)!.push(appt);
                        return acc;
                      }, new Map<string, Appointments[]>())
                    ).map(([date, dayAppointments]) => (
                      <div key={date}>
                        <h3 className="text-xl font-heading font-semibold text-neon-teal mb-3">
                          {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <div className="space-y-3">
                          {dayAppointments.map((appt) => (
                            <div
                              key={appt._id}
                              className="bg-deep-charcoal border border-white/20 rounded-lg p-4 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-heading text-lg text-white">{appt.clientName}</p>
                                <p className="font-paragraph text-sm text-light-gray">
                                  {appt.startAt && format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'h:mm a')} -{' '}
                                  {appt.endAt && format(typeof appt.endAt === 'string' ? parseISO(appt.endAt) : appt.endAt, 'h:mm a')}
                                </p>
                                <p className="font-paragraph text-sm text-light-gray">{appt.clientEmail}</p>
                              </div>
                              <span
                                className={`inline-block px-3 py-1 rounded text-sm font-paragraph ${
                                  appt.status === 'CONFIRMED'
                                    ? 'bg-neon-teal/20 text-neon-teal'
                                    : 'bg-light-gray/20 text-light-gray'
                                }`}
                              >
                                {appt.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-heading font-bold text-white">Manage Services</h2>
                  <Button onClick={() => handleOpenServiceModal()} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
                {services.length === 0 ? (
                  <p className="text-light-gray font-paragraph">No services yet. Create your first service!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                      <div
                        key={service._id}
                        className="bg-deep-charcoal border border-white/20 rounded-lg p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-heading font-semibold text-white">{service.name}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenServiceModal(service)}
                              className="text-neon-teal hover:text-neon-teal/80"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service._id)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {service.category && (
                            <p className="font-paragraph text-sm text-light-gray">Category: {service.category}</p>
                          )}
                          {service.durationMin && (
                            <p className="font-paragraph text-sm text-light-gray">Duration: {service.durationMin} min</p>
                          )}
                          {service.price !== undefined && (
                            <p className="font-paragraph text-sm text-light-gray">Price: ${service.price}</p>
                          )}
                          {service.maxPeoplePerBooking && (
                            <p className="font-paragraph text-sm text-light-gray">Max People: {service.maxPeoplePerBooking}</p>
                          )}
                          <p className="font-paragraph text-sm">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs ${
                                service.isActive !== false ? 'bg-neon-teal/20 text-neon-teal' : 'bg-light-gray/20 text-light-gray'
                              }`}
                            >
                              {service.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-heading font-bold text-white">Profile Settings</h2>
                  {!editingProfile ? (
                    <Button onClick={() => setEditingProfile(true)} className="bg-neon-teal text-deep-charcoal hover:opacity-90">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
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

                <div className="space-y-4 max-w-2xl">
                  <div>
                    <Label htmlFor="displayName" className="text-light-gray">
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                      disabled={!editingProfile}
                      className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug" className="text-light-gray">
                      Profile Slug (URL)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="slug"
                        value={profileForm.slug}
                        onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value })}
                        disabled={!editingProfile}
                        className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                      />
                      <Button
                        onClick={handleCopySlug}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {slugCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-light-gray mt-1">
                      Your public URL: {window.location.origin}/p/{profileForm.slug}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="categoryTags" className="text-light-gray">
                      Categories
                    </Label>
                    <Input
                      id="categoryTags"
                      value={profileForm.categoryTags}
                      onChange={(e) => setProfileForm({ ...profileForm, categoryTags: e.target.value })}
                      disabled={!editingProfile}
                      className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressText" className="text-light-gray">
                      Address
                    </Label>
                    <Textarea
                      id="addressText"
                      value={profileForm.addressText}
                      onChange={(e) => setProfileForm({ ...profileForm, addressText: e.target.value })}
                      disabled={!editingProfile}
                      className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="whatsappNumber" className="text-light-gray">
                      WhatsApp Number
                    </Label>
                    <Input
                      id="whatsappNumber"
                      value={profileForm.whatsappNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, whatsappNumber: e.target.value })}
                      disabled={!editingProfile}
                      className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactEmail" className="text-light-gray">
                      Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={profileForm.contactEmail}
                      onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                      disabled={!editingProfile}
                      className="bg-deep-charcoal border-white/20 text-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* All Appointments Tab */}
            <TabsContent value="appointments">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-3xl font-heading font-bold text-white mb-6">All Appointments</h2>

                <div className="flex gap-4 mb-6">
                  <Select
                    value={appointmentFilter}
                    onValueChange={(value: any) => {
                      setAppointmentFilter(value);
                      if (value === 'today') {
                        setActiveTab('today');
                      } else if (value === 'week') {
                        setActiveTab('week');
                      }
                    }}
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

                  {appointmentFilter === 'custom' && (
                    <>
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
                    </>
                  )}
                </div>

                {appointments.length === 0 ? (
                  <p className="text-light-gray font-paragraph">No appointments found.</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appt) => (
                      <div
                        key={appt._id}
                        className="bg-deep-charcoal border border-white/20 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-heading text-lg text-white">{appt.clientName}</p>
                            <p className="font-paragraph text-sm text-light-gray">
                              {appt.startAt &&
                                format(typeof appt.startAt === 'string' ? parseISO(appt.startAt) : appt.startAt, 'EEEE, MMMM d, yyyy - h:mm a')}
                            </p>
                            <p className="font-paragraph text-sm text-light-gray">{appt.clientEmail} | {appt.clientPhone}</p>
                            {appt.notes && <p className="font-paragraph text-sm text-light-gray mt-2">Notes: {appt.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-3 py-1 rounded text-sm font-paragraph ${
                                appt.status === 'CONFIRMED'
                                  ? 'bg-neon-teal/20 text-neon-teal'
                                  : appt.status === 'CANCELLED'
                                  ? 'bg-destructive/20 text-destructive'
                                  : 'bg-light-gray/20 text-light-gray'
                              }`}
                            >
                              {appt.status}
                            </span>
                            <p className="font-paragraph text-sm text-light-gray mt-2">
                              {appt.peopleCount} {appt.peopleCount === 1 ? 'person' : 'people'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Service Modal */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="bg-deep-charcoal border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {editingService ? 'Edit Service' : 'Create New Service'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceName" className="text-light-gray">
                Service Name *
              </Label>
              <Input
                id="serviceName"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                className="bg-deep-charcoal border-white/20 text-white"
              />
            </div>

            <div>
              <Label htmlFor="serviceCategory" className="text-light-gray">
                Category
              </Label>
              <Input
                id="serviceCategory"
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                className="bg-deep-charcoal border-white/20 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serviceDuration" className="text-light-gray">
                  Duration (minutes) *
                </Label>
                <Input
                  id="serviceDuration"
                  type="number"
                  min="1"
                  value={serviceForm.durationMin}
                  onChange={(e) => setServiceForm({ ...serviceForm, durationMin: parseInt(e.target.value) })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="servicePrice" className="text-light-gray">
                  Price ($)
                </Label>
                <Input
                  id="servicePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxPeople" className="text-light-gray">
                  Max People *
                </Label>
                <Input
                  id="maxPeople"
                  type="number"
                  min="1"
                  value={serviceForm.maxPeoplePerBooking}
                  onChange={(e) => setServiceForm({ ...serviceForm, maxPeoplePerBooking: parseInt(e.target.value) })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="bufferBefore" className="text-light-gray">
                  Buffer Before (min)
                </Label>
                <Input
                  id="bufferBefore"
                  type="number"
                  min="0"
                  value={serviceForm.bufferBeforeMin}
                  onChange={(e) => setServiceForm({ ...serviceForm, bufferBeforeMin: parseInt(e.target.value) })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="bufferAfter" className="text-light-gray">
                  Buffer After (min)
                </Label>
                <Input
                  id="bufferAfter"
                  type="number"
                  min="0"
                  value={serviceForm.bufferAfterMin}
                  onChange={(e) => setServiceForm({ ...serviceForm, bufferAfterMin: parseInt(e.target.value) })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="serviceActive"
                checked={serviceForm.isActive}
                onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="serviceActive" className="text-light-gray">
                Active
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
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
