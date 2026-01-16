import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Users, DollarSign, Search, X, Calendar, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Providers, Services } from '@/entities';
import { PriceOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';

interface AvailabilitySlot {
  startAtISO: string;
  endAtISO: string;
}

interface DayAvailability {
  date: string;
  slots: AvailabilitySlot[];
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

// Helper to get dominant color from services
function getDominantColor(services: Services[]): string {
  if (services.length === 0) return '#00FFD4';
  
  // Count color occurrences
  const colorCounts: { [key: string]: number } = {};
  services.forEach(service => {
    const color = service.cardColor || '#00FFD4';
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });
  
  // Return most common color
  return Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
} as const;

export default function ProviderPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [provider, setProvider] = useState<Providers | null>(null);
  const [services, setServices] = useState<Services[]>([]);
  const [filteredServices, setFilteredServices] = useState<Services[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState('#00FFD4');

  // Filters
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Booking state
  const [selectedService, setSelectedService] = useState<Services | null>(null);
  const [selectedPriceOption, setSelectedPriceOption] = useState<PriceOption | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; slot: AvailabilitySlot } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    peopleCount: 1,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    loadProviderData();
  }, [slug]);

  useEffect(() => {
    applyFilters();
  }, [services, searchText, categoryFilter]);

  useEffect(() => {
    if (services.length > 0) {
      setDominantColor(getDominantColor(services));
    }
  }, [services]);

  useEffect(() => {
    if (selectedService && provider) {
      // Reset availability when service changes
      setAvailability([]);
      setLoadingAvailability(true);
      
      // Load availability immediately
      const loadData = async () => {
        if (!selectedService || !provider) return;

        try {
          const weekStartISO = weekStart.toISOString();

          const response = await fetch('/api/availability/getWeekAvailability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerId: provider._id,
              serviceId: selectedService._id,
              weekStartISO,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to load availability');
          }

          setAvailability(data.availability || []);
        } catch (err: any) {
          console.error('Error loading availability:', err);
          setAvailability([]);
        } finally {
          setLoadingAvailability(false);
        }
      };

      loadData();
    }
  }, [selectedService, weekStart, provider]);

  const loadProviderData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/availability/getProviderBySlug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Provider not found');
      }

      setProvider(data.provider);
      setServices(data.services || []);
      setFilteredServices(data.services || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...services];

    if (searchText) {
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          s.category?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }

    setFilteredServices(filtered);
  };

  const loadAvailability = async () => {
    if (!selectedService || !provider) return;

    try {
      setLoadingAvailability(true);
      const weekStartISO = weekStart.toISOString();

      const response = await fetch('/api/availability/getWeekAvailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider._id,
          serviceId: selectedService._id,
          weekStartISO,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load availability');
      }

      setAvailability(data.availability || []);
    } catch (err: any) {
      console.error('Error loading availability:', err);
      setAvailability([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleSlotClick = (date: string, slot: AvailabilitySlot) => {
    setSelectedSlot({ date, slot });
    setBookingForm({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      peopleCount: 1,
      notes: '',
    });
    setBookingError(null);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedService || !provider) return;

    try {
      setSubmitting(true);
      setBookingError(null);

      const response = await fetch('/api/appointments/createAppointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider._id,
          serviceId: selectedService._id,
          startAtISO: selectedSlot.slot.startAtISO,
          clientName: bookingForm.clientName,
          clientEmail: bookingForm.clientEmail,
          clientPhone: bookingForm.clientPhone,
          peopleCount: bookingForm.peopleCount,
          notes: bookingForm.notes,
          priceOption: selectedPriceOption || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'SLOT_TAKEN') {
          setBookingError('This time slot was just taken. Please choose another time.');
          await loadAvailability();
        } else {
          throw new Error(data.error || 'Failed to create appointment');
        }
        return;
      }

      setBookingSuccess(true);
      setShowBookingModal(false);
      setSelectedSlot(null);
      setSelectedPriceOption(null);
      await loadAvailability();
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
  const dominantRgb = hexToRgb(dominantColor);
  const dominantRgbString = dominantRgb ? `${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}` : '0, 255, 212';

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-charcoal flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-deep-charcoal flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="mb-6 inline-block p-4 bg-destructive/10 rounded-full">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-white mb-4">Provider Not Found</h1>
          <p className="text-light-gray font-paragraph">{error || 'The provider you are looking for does not exist.'}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-charcoal via-[#1a1a1a] to-deep-charcoal">
      {/* Sticky Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-deep-charcoal/80 border-b border-white/10"
      >
        <div className="max-w-[100rem] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: dominantColor }}>
                <span className="text-deep-charcoal font-heading font-bold text-lg">
                  {provider.displayName?.charAt(0) || 'P'}
                </span>
              </div>
              <div>
                <h1 className="text-white font-heading font-bold text-lg leading-tight">{provider.displayName}</h1>
                <p className="text-light-gray/60 text-xs">{provider.categoryTags || 'Professional Services'}</p>
              </div>
            </div>
            <Button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              size="sm"
              className="text-deep-charcoal font-semibold"
              style={{ backgroundColor: dominantColor }}
            >
              Book Now
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - Simplified */}
      <section className="relative py-12 px-4">
        <div className="max-w-[100rem] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4">
              Book Your Appointment
            </h2>
            <p className="text-light-gray/80 text-lg max-w-2xl mx-auto">
              Choose a service below and select your preferred time slot
            </p>
          </motion.div>

          {/* Provider Info Cards - Horizontal Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto"
          >
            {provider.addressText && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <MapPin className="w-4 h-4" style={{ color: dominantColor }} />
                <span className="text-light-gray text-sm">{provider.addressText}</span>
              </div>
            )}
            {provider.whatsappNumber && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <Phone className="w-4 h-4" style={{ color: dominantColor }} />
                <span className="text-light-gray text-sm">{provider.whatsappNumber}</span>
              </div>
            )}
            {provider.contactEmail && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <Mail className="w-4 h-4" style={{ color: dominantColor }} />
                <span className="text-light-gray text-sm">{provider.contactEmail}</span>
              </div>
            )}
            {provider.timezone && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <Clock className="w-4 h-4" style={{ color: dominantColor }} />
                <span className="text-light-gray text-sm">{provider.timezone}</span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Services Section - Redesigned */}
      <section id="services-section" className="py-12 px-4">
        <div className="max-w-[100rem] mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2">
                  Available Services
                </h2>
                <p className="text-light-gray/70">Select a service to view available time slots</p>
              </div>
              
              {/* Filters - Simplified */}
              <div className="flex gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-gray/50" />
                  <Input
                    placeholder="Search services..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-light-gray/50"
                  />
                </div>
                {categories.length > 0 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat!}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </motion.div>

          {/* Services Grid - Card Style */}
          {filteredServices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Search className="w-12 h-12 text-light-gray/30 mx-auto mb-4" />
              <p className="text-light-gray/70 text-lg">No services found</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service, index) => {
                const serviceColor = service.cardColor || dominantColor;
                const serviceRgb = hexToRgb(serviceColor);
                const serviceRgbString = serviceRgb ? `${serviceRgb.r}, ${serviceRgb.g}, ${serviceRgb.b}` : dominantRgbString;
                
                let priceOptions: PriceOption[] = [];
                try {
                  if (service.priceOptions) {
                    priceOptions = JSON.parse(service.priceOptions);
                  }
                } catch {}

                return (
                  <motion.div
                    key={service._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => {
                      setSelectedService(service);
                      setBookingSuccess(false);
                      setTimeout(() => {
                        document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all cursor-pointer overflow-hidden"
                  >
                    {/* Hover gradient effect */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `linear-gradient(135deg, rgba(${serviceRgbString}, 0.1), transparent)`,
                      }}
                    />

                    <div className="relative z-10">
                      {/* Service Header */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-heading font-bold text-white group-hover:text-white/90 transition-colors">
                            {service.name}
                          </h3>
                          {service.category && (
                            <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                              {service.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Service Details */}
                      <div className="space-y-3 mb-6">
                        {service.durationMin && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.2)` }}>
                              <Clock className="w-4 h-4" style={{ color: serviceColor }} />
                            </div>
                            <div>
                              <p className="text-xs text-light-gray/60 uppercase tracking-wide">Duration</p>
                              <p className="text-sm text-white font-medium">{service.durationMin} minutes</p>
                            </div>
                          </div>
                        )}

                        {service.price !== undefined && priceOptions.length === 0 && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.2)` }}>
                              <DollarSign className="w-4 h-4" style={{ color: serviceColor }} />
                            </div>
                            <div>
                              <p className="text-xs text-light-gray/60 uppercase tracking-wide">Price</p>
                              <p className="text-lg font-bold" style={{ color: serviceColor }}>
                                ${service.price}
                              </p>
                            </div>
                          </div>
                        )}

                        {priceOptions.length > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.2)` }}>
                              <DollarSign className="w-4 h-4" style={{ color: serviceColor }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-light-gray/60 uppercase tracking-wide mb-1">Price Options</p>
                              <div className="space-y-1">
                                {priceOptions.slice(0, 2).map((opt, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-light-gray/80">{opt.name}</span>
                                    <span className="font-semibold" style={{ color: serviceColor }}>${opt.price}</span>
                                  </div>
                                ))}
                                {priceOptions.length > 2 && (
                                  <p className="text-xs text-light-gray/60">+{priceOptions.length - 2} more</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {service.maxPeoplePerBooking && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.2)` }}>
                              <Users className="w-4 h-4" style={{ color: serviceColor }} />
                            </div>
                            <div>
                              <p className="text-xs text-light-gray/60 uppercase tracking-wide">Capacity</p>
                              <p className="text-sm text-white font-medium">Up to {service.maxPeoplePerBooking} people</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CTA Button */}
                      <Button
                        className="w-full font-semibold group/btn"
                        style={{ backgroundColor: serviceColor, color: '#222222' }}
                      >
                        Select & Book
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ... keep existing code (booking calendar section) */}
      <AnimatePresence>
        {selectedService && (
          <motion.section
            id="booking-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            className="py-8 md:py-16 px-4 relative z-10 border-t border-white/10"
          >
            <div className="max-w-[100rem] mx-auto">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 mb-6 md:mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h2 className="text-2xl md:text-4xl font-heading font-bold text-white mb-1">
                    Elige tu horario preferido
                  </h2>
                  <p className="text-light-gray/70 font-paragraph text-xs md:text-sm truncate">
                    {selectedService.name}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Button
                    onClick={() => {
                      setSelectedService(null);
                      setSelectedPriceOption(null);
                    }}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 h-8 md:h-9 w-full md:w-auto text-xs md:text-sm px-3 md:px-4"
                  >
                    <X className="w-3 h-3 mr-1.5" />
                    Change Service
                  </Button>
                </motion.div>
              </div>

              {/* Week Navigation - Mobile Optimized & Compact */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 mb-6 md:mb-8 p-3 md:p-4 rounded-lg backdrop-blur-sm border border-white/10"
                style={{ backgroundColor: `rgba(${dominantRgbString}, 0.05)` }}
              >
                <Button
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 h-8 md:h-9 w-full md:w-auto text-xs px-2.5 md:px-3"
                >
                  ← Previous
                </Button>
                <span className="font-heading text-sm md:text-base text-white text-center whitespace-nowrap">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                </span>
                <Button
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 h-8 md:h-9 w-full md:w-auto text-xs px-2.5 md:px-3"
                >
                  Next →
                </Button>
              </motion.div>

              {/* Availability Grid - Enhanced UX */}
              {loadingAvailability ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center py-8 md:py-12"
                >
                  <LoadingSpinner />
                </motion.div>
              ) : availability.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 md:py-12"
                >
                  <div className="inline-block p-2.5 md:p-3 bg-white/5 rounded-full mb-3">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-light-gray/50" />
                  </div>
                  <p className="text-light-gray font-paragraph text-sm md:text-base">No availability for this week.</p>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4"
                >
                  {availability.map((day) => (
                    <motion.div
                      key={day.date}
                      variants={itemVariants}
                      className="rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-lg"
                      style={{ backgroundColor: `rgba(${dominantRgbString}, 0.08)` }}
                    >
                      <h3 className="font-heading font-bold text-white mb-4 text-center pb-3 border-b border-white/10">
                        <div className="text-sm uppercase tracking-wide" style={{ color: dominantColor }}>
                          {format(parseISO(day.date), 'EEE')}
                        </div>
                        <div className="text-2xl md:text-3xl mt-1" style={{ color: dominantColor }}>
                          {format(parseISO(day.date), 'd')}
                        </div>
                        <div className="text-xs text-light-gray/60 mt-1">
                          {format(parseISO(day.date), 'MMM')}
                        </div>
                      </h3>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                        {day.slots.length === 0 ? (
                          <div className="text-center py-6">
                            <div className="inline-block p-2 bg-white/5 rounded-lg mb-2">
                              <Clock className="w-4 h-4 text-light-gray/40" />
                            </div>
                            <p className="text-light-gray/50 text-xs">No slots</p>
                          </div>
                        ) : (
                          day.slots.map((slot, idx) => (
                            <motion.button
                              key={idx}
                              onClick={() => handleSlotClick(day.date, slot)}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-full rounded-lg px-4 py-3 text-sm font-paragraph font-bold transition-all duration-200 border-2 shadow-md hover:shadow-xl touch-manipulation relative overflow-hidden group"
                              style={{
                                backgroundColor: `rgba(${dominantRgbString}, 0.15)`,
                                borderColor: `rgba(${dominantRgbString}, 0.6)`,
                                color: dominantColor,
                              }}
                            >
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                style={{
                                  background: `linear-gradient(135deg, rgba(${dominantRgbString}, 0.2), rgba(${dominantRgbString}, 0.1))`,
                                }}
                              />
                              <div className="relative z-10 flex items-center justify-center gap-2">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="whitespace-nowrap">{format(parseISO(slot.startAtISO), 'h:mm a')}</span>
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Booking Modal - Mobile Optimized & Compact */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-gradient-to-br from-deep-charcoal to-[#1a1a1a] border-white/20 text-white max-w-md w-[95vw] md:w-full rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg md:text-xl">Complete Your Booking</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <form onSubmit={handleBookingSubmit} className="space-y-3 md:space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Selected Time Display - Compact */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg p-2.5 md:p-3 border"
                style={{
                  backgroundColor: `rgba(${dominantRgbString}, 0.1)`,
                  borderColor: `rgba(${dominantRgbString}, 0.3)`,
                }}
              >
                <p className="font-paragraph text-xs text-light-gray/70 mb-1.5 uppercase tracking-wider">Selected Time</p>
                <p className="font-heading text-sm md:text-base mb-0.5" style={{ color: dominantColor }}>
                  {format(parseISO(selectedSlot.slot.startAtISO), 'EEE, MMM d')}
                </p>
                <p className="font-heading text-base md:text-lg text-white">
                  {format(parseISO(selectedSlot.slot.startAtISO), 'h:mm a')} -{' '}
                  {format(parseISO(selectedSlot.slot.endAtISO), 'h:mm a')}
                </p>
              </motion.div>

              {/* Error Message - Compact */}
              {bookingError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 text-destructive text-xs"
                >
                  {bookingError}
                </motion.div>
              )}

              {/* Price Option Selector - Compact */}
              {selectedService?.priceOptions && (() => {
                try {
                  const opts = JSON.parse(selectedService.priceOptions);
                  if (Array.isArray(opts) && opts.length > 0) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <Label htmlFor="priceOption" className="text-light-gray font-semibold text-xs md:text-sm">
                          Select Price Option *
                        </Label>
                        <Select
                          value={selectedPriceOption ? JSON.stringify(selectedPriceOption) : ''}
                          onValueChange={(val) => {
                            if (val) {
                              setSelectedPriceOption(JSON.parse(val));
                            } else {
                              setSelectedPriceOption(null);
                            }
                          }}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white mt-1.5 text-xs md:text-sm h-8 md:h-9">
                            <SelectValue placeholder="Choose a variant..." />
                          </SelectTrigger>
                          <SelectContent>
                            {opts.map((opt: PriceOption, idx: number) => (
                              <SelectItem key={idx} value={JSON.stringify(opt)}>
                                {opt.name} - ${opt.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    );
                  }
                } catch {
                  return null;
                }
                return null;
              })()}

              {/* Form Fields - Compact */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Label htmlFor="clientName" className="text-light-gray font-semibold text-xs md:text-sm">
                  Name *
                </Label>
                <Input
                  id="clientName"
                  required
                  value={bookingForm.clientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-1.5 text-xs md:text-sm h-8 md:h-9"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <Label htmlFor="clientEmail" className="text-light-gray font-semibold text-xs md:text-sm">
                  Email *
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  required
                  value={bookingForm.clientEmail}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-1.5 text-xs md:text-sm h-8 md:h-9"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
              >
                <Label htmlFor="clientPhone" className="text-light-gray font-semibold text-xs md:text-sm">
                  Phone *
                </Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  required
                  value={bookingForm.clientPhone}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-1.5 text-xs md:text-sm h-8 md:h-9"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
              >
                <Label htmlFor="peopleCount" className="text-light-gray font-semibold text-xs md:text-sm">
                  Number of People *
                </Label>
                <Input
                  id="peopleCount"
                  type="number"
                  min="1"
                  max={selectedService?.maxPeoplePerBooking || 1}
                  required
                  value={bookingForm.peopleCount}
                  onChange={(e) => setBookingForm({ ...bookingForm, peopleCount: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/20 text-white mt-1.5 text-xs md:text-sm h-8 md:h-9"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                <Label htmlFor="notes" className="text-light-gray font-semibold text-xs md:text-sm">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-1.5 text-xs md:text-sm"
                  rows={2}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-deep-charcoal hover:opacity-90 font-semibold h-8 md:h-9 rounded-lg text-xs md:text-sm"
                  style={{ backgroundColor: dominantColor }}
                >
                  {submitting ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                        ⏳
                      </motion.span>
                      {' '}Booking...
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <ArrowRight className="w-3 h-3 ml-1.5" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog - Mobile Optimized & Compact */}
      <Dialog open={bookingSuccess} onOpenChange={setBookingSuccess}>
        <DialogContent className="bg-gradient-to-br from-deep-charcoal to-[#1a1a1a] border-white/20 text-white max-w-md w-[95vw] md:w-full rounded-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="inline-block p-2.5 md:p-3 rounded-full mb-3"
                style={{ backgroundColor: `rgba(${dominantRgbString}, 0.2)` }}
              >
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" style={{ color: dominantColor }} />
              </motion.div>
              <DialogTitle className="font-heading text-lg md:text-xl" style={{ color: dominantColor }}>
                Booking Confirmed!
              </DialogTitle>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2 md:space-y-3"
            >
              <p className="font-paragraph text-light-gray/80 text-xs md:text-sm">
                Your appointment has been successfully booked. You will receive a confirmation email shortly.
              </p>
              <p className="font-paragraph text-light-gray/80 text-xs md:text-sm">
                We'll also send you a reminder 24 hours before your appointment.
              </p>
              <Button
                onClick={() => setBookingSuccess(false)}
                className="w-full text-deep-charcoal hover:opacity-90 font-semibold h-8 md:h-9 rounded-lg text-xs md:text-sm"
                style={{ backgroundColor: dominantColor }}
              >
                Done
              </Button>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
