import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, Tag, Clock, Users, DollarSign, Search, X, ChevronDown, Calendar, ArrowRight, Star, Sparkles, CheckCircle2 } from 'lucide-react';
import { Providers, Services, PriceOption } from '@/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
  const [durationFilter, setDurationFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [peopleFilter, setPeopleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

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
  }, [services, searchText, categoryFilter, durationFilter, priceFilter, peopleFilter]);

  useEffect(() => {
    if (services.length > 0) {
      setDominantColor(getDominantColor(services));
    }
  }, [services]);

  useEffect(() => {
    if (selectedService) {
      loadAvailability();
    }
  }, [selectedService, weekStart]);

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

    if (durationFilter !== 'all') {
      const duration = parseInt(durationFilter);
      filtered = filtered.filter((s) => s.durationMin === duration);
    }

    if (priceFilter !== 'all') {
      if (priceFilter === 'free') {
        filtered = filtered.filter((s) => !s.price || s.price === 0);
      } else {
        const [min, max] = priceFilter.split('-').map(Number);
        filtered = filtered.filter((s) => s.price && s.price >= min && s.price <= max);
      }
    }

    if (peopleFilter !== 'all') {
      const people = parseInt(peopleFilter);
      filtered = filtered.filter((s) => s.maxPeoplePerBooking && s.maxPeoplePerBooking >= people);
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
  const durations = Array.from(new Set(services.map((s) => s.durationMin).filter(Boolean)));
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
    <div className="min-h-screen overflow-hidden bg-deep-charcoal">
      {/* Animated background gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: dominantColor }}
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: dominantColor }}
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[700px] flex items-center justify-center px-4 py-20 overflow-hidden">
        <div className="relative z-10 max-w-[100rem] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-block mb-6 px-4 py-2 rounded-full border"
              style={{
                backgroundColor: `rgba(${dominantRgbString}, 0.1)`,
                borderColor: `rgba(${dominantRgbString}, 0.3)`,
              }}
            >
              <span className="font-paragraph text-sm font-semibold flex items-center gap-2" style={{ color: dominantColor }}>
                <Sparkles className="w-4 h-4" />
                Professional Services
              </span>
            </motion.div>

            {/* Main Title */}
            <h1 className="text-7xl md:text-8xl font-heading font-bold text-white mb-6 leading-tight">
              {provider.displayName}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl md:text-2xl text-light-gray/80 font-paragraph mb-12 max-w-3xl mx-auto"
            >
              {provider.categoryTags || 'Discover exceptional services tailored to your needs'}
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Button
                onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-6 text-lg font-semibold group rounded-lg"
                style={{
                  backgroundColor: dominantColor,
                  color: '#222222',
                }}
              >
                Explore Services
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Provider Info Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-20"
          >
            {provider.addressText && (
              <motion.div
                variants={itemVariants}
                className="group p-6 rounded-xl backdrop-blur-sm border transition-all hover:scale-105"
                style={{
                  backgroundColor: `rgba(${dominantRgbString}, 0.05)`,
                  borderColor: `rgba(${dominantRgbString}, 0.2)`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}>
                    <MapPin className="w-5 h-5" style={{ color: dominantColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-light-gray/60 font-paragraph uppercase tracking-wider mb-1">Location</p>
                    <p className="font-paragraph text-light-gray text-sm">{provider.addressText}</p>
                  </div>
                </div>
              </motion.div>
            )}
            {provider.whatsappNumber && (
              <motion.div
                variants={itemVariants}
                className="group p-6 rounded-xl backdrop-blur-sm border transition-all hover:scale-105"
                style={{
                  backgroundColor: `rgba(${dominantRgbString}, 0.05)`,
                  borderColor: `rgba(${dominantRgbString}, 0.2)`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}>
                    <Phone className="w-5 h-5" style={{ color: dominantColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-light-gray/60 font-paragraph uppercase tracking-wider mb-1">WhatsApp</p>
                    <p className="font-paragraph text-light-gray text-sm">{provider.whatsappNumber}</p>
                  </div>
                </div>
              </motion.div>
            )}
            {provider.contactEmail && (
              <motion.div
                variants={itemVariants}
                className="group p-6 rounded-xl backdrop-blur-sm border transition-all hover:scale-105"
                style={{
                  backgroundColor: `rgba(${dominantRgbString}, 0.05)`,
                  borderColor: `rgba(${dominantRgbString}, 0.2)`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}>
                    <Mail className="w-5 h-5" style={{ color: dominantColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-light-gray/60 font-paragraph uppercase tracking-wider mb-1">Email</p>
                    <p className="font-paragraph text-light-gray text-sm">{provider.contactEmail}</p>
                  </div>
                </div>
              </motion.div>
            )}
            {provider.timezone && (
              <motion.div
                variants={itemVariants}
                className="group p-6 rounded-xl backdrop-blur-sm border transition-all hover:scale-105"
                style={{
                  backgroundColor: `rgba(${dominantRgbString}, 0.05)`,
                  borderColor: `rgba(${dominantRgbString}, 0.2)`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}>
                    <Clock className="w-5 h-5" style={{ color: dominantColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-light-gray/60 font-paragraph uppercase tracking-wider mb-1">Timezone</p>
                    <p className="font-paragraph text-light-gray text-sm">{provider.timezone}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services-section" className="py-24 px-4 relative z-10">
        <div className="max-w-[100rem] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-6xl font-heading font-bold text-white mb-4">Our Services</h2>
            <div className="flex items-center gap-3">
              <div className="h-1 w-16 rounded-full" style={{ backgroundColor: dominantColor }} />
              <p className="text-light-gray/70 font-paragraph text-lg">Discover what we offer</p>
            </div>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-light-gray/50" />
                <Input
                  placeholder="Search services..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-12 bg-white/5 border-white/20 text-white placeholder:text-light-gray/50 h-12 rounded-lg"
                />
              </div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 h-12"
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-lg backdrop-blur-sm border border-white/10"
                  style={{ backgroundColor: `rgba(${dominantRgbString}, 0.05)` }}
                >
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-deep-charcoal border-white/20 text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat!}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={durationFilter} onValueChange={setDurationFilter}>
                    <SelectTrigger className="bg-deep-charcoal border-white/20 text-white">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Durations</SelectItem>
                      {durations.map((dur) => (
                        <SelectItem key={dur} value={dur!.toString()}>
                          {dur} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="bg-deep-charcoal border-white/20 text-white">
                      <SelectValue placeholder="Price" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="0-50">$0 - $50</SelectItem>
                      <SelectItem value="50-100">$50 - $100</SelectItem>
                      <SelectItem value="100-999999">$100+</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={peopleFilter} onValueChange={setPeopleFilter}>
                    <SelectTrigger className="bg-deep-charcoal border-white/20 text-white">
                      <SelectValue placeholder="People" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Group Size</SelectItem>
                      <SelectItem value="1">1 person</SelectItem>
                      <SelectItem value="2">2+ people</SelectItem>
                      <SelectItem value="5">5+ people</SelectItem>
                      <SelectItem value="10">10+ people</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-block p-4 bg-white/5 rounded-full mb-4">
                <Search className="w-8 h-8 text-light-gray/50" />
              </div>
              <p className="text-light-gray font-paragraph text-lg">No services found matching your filters.</p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredServices.map((service) => {
                const serviceColor = service.cardColor || dominantColor;
                const serviceRgb = hexToRgb(serviceColor);
                const serviceRgbString = serviceRgb ? `${serviceRgb.r}, ${serviceRgb.g}, ${serviceRgb.b}` : dominantRgbString;
                
                // Get text color and gradient
                const textColor = service.textColor || '#FFFFFF';
                const textGradient = service.textGradient;
                const getTextStyle = () => {
                  if (textGradient) {
                    const [color1, color2] = textGradient.split(' to ');
                    return {
                      backgroundImage: `linear-gradient(135deg, ${color1}, ${color2 || color1})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    };
                  }
                  return { color: textColor };
                };

                return (
                  <motion.div
                    key={service._id}
                    variants={itemVariants}
                    whileHover={{ y: -12, scale: 1.02 }}
                    className="group relative rounded-2xl overflow-hidden backdrop-blur-sm border transition-all duration-300 cursor-pointer"
                    style={{
                      backgroundColor: `rgba(${serviceRgbString}, 0.08)`,
                      borderColor: `rgba(${serviceRgbString}, 0.3)`,
                    }}
                    onClick={() => {
                      setSelectedService(service);
                      setBookingSuccess(false);
                    }}
                  >
                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: `linear-gradient(135deg, rgba(${serviceRgbString}, 0.1), rgba(${serviceRgbString}, 0.05))`,
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10 p-8">
                      {/* Header */}
                      <div className="mb-6">
                        <h3
                          className="text-2xl font-heading font-bold mb-2 group-hover:transition-colors"
                          style={getTextStyle()}
                        >
                          {service.name}
                        </h3>
                        {service.category && (
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" style={{ color: serviceColor }} />
                            <span className="text-sm text-light-gray/70 font-paragraph">{service.category}</span>
                          </div>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-4 mb-6">
                        {service.durationMin && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.1)` }}>
                              <Clock className="w-4 h-4" style={{ color: serviceColor }} />
                            </div>
                            <div>
                              <p className="text-xs text-light-gray/60 uppercase tracking-wider">Duration</p>
                              <p className="text-sm font-paragraph text-light-gray">{service.durationMin} minutes</p>
                            </div>
                          </div>
                        )}

                        {service.price !== undefined && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.1)` }}>
                              <DollarSign className="w-4 h-4" style={{ color: serviceColor }} />
                            </div>
                            <div>
                              <p className="text-xs text-light-gray/60 uppercase tracking-wider">Price</p>
                              <p className="text-sm font-semibold" style={{ color: serviceColor }}>
                                ${service.price}
                              </p>
                            </div>
                          </div>
                        )}

                        {service.maxPeoplePerBooking && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.1)` }}>
                              <Users className="w-4 h-4" style={{ color: serviceColor }} />
                            </div>
                            <div>
                              <p className="text-xs text-light-gray/60 uppercase tracking-wider">Group Size</p>
                              <p className="text-sm font-paragraph text-light-gray">Up to {service.maxPeoplePerBooking} people</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Price Variants */}
                      {service.priceOptions && (() => {
                        try {
                          const opts = JSON.parse(service.priceOptions);
                          if (Array.isArray(opts) && opts.length > 0) {
                            return (
                              <div className="mb-6 p-4 rounded-lg border" style={{
                                backgroundColor: `rgba(${serviceRgbString}, 0.1)`,
                                borderColor: `rgba(${serviceRgbString}, 0.2)`,
                              }}>
                                <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: serviceColor }}>
                                  Available Variants
                                </p>
                                <div className="space-y-2">
                                  {opts.map((opt: PriceOption, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                      <span className="text-light-gray/80 font-paragraph">{opt.name}</span>
                                      <span className="font-semibold" style={{ color: serviceColor }}>
                                        ${opt.price}
                                      </span>
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

                      {/* CTA Button */}
                      <Button
                        className="w-full text-deep-charcoal hover:opacity-90 font-semibold rounded-lg group/btn"
                        style={{ backgroundColor: serviceColor }}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Now
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Booking Calendar Section */}
      <AnimatePresence>
        {selectedService && (
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4 }}
            className="py-24 px-4 relative z-10 border-t border-white/10"
          >
            <div className="max-w-[100rem] mx-auto">
              <div className="flex items-center justify-between mb-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h2 className="text-5xl font-heading font-bold text-white mb-2">
                    Select Your Time
                  </h2>
                  <p className="text-light-gray/70 font-paragraph">
                    {selectedService.name}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Button
                    onClick={() => {
                      setSelectedService(null);
                      setSelectedPriceOption(null);
                    }}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 h-12"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Change Service
                  </Button>
                </motion.div>
              </div>

              {/* Week Navigation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between mb-12 p-6 rounded-lg backdrop-blur-sm border border-white/10"
                style={{ backgroundColor: `rgba(${dominantRgbString}, 0.05)` }}
              >
                <Button
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  ← Previous
                </Button>
                <span className="font-heading text-xl text-white">
                  {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
                </span>
                <Button
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Next →
                </Button>
              </motion.div>

              {/* Availability Grid */}
              {loadingAvailability ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center py-20"
                >
                  <LoadingSpinner />
                </motion.div>
              ) : availability.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="inline-block p-4 bg-white/5 rounded-full mb-4">
                    <Calendar className="w-8 h-8 text-light-gray/50" />
                  </div>
                  <p className="text-light-gray font-paragraph text-lg">No availability for this week.</p>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4"
                >
                  {availability.map((day) => (
                    <motion.div
                      key={day.date}
                      variants={itemVariants}
                      className="rounded-lg p-4 backdrop-blur-sm border border-white/10"
                      style={{ backgroundColor: `rgba(${dominantRgbString}, 0.05)` }}
                    >
                      <h3 className="font-heading font-semibold text-white mb-4 text-center text-sm">
                        {format(parseISO(day.date), 'EEE')}
                        <div className="text-lg mt-1" style={{ color: dominantColor }}>
                          {format(parseISO(day.date), 'd')}
                        </div>
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {day.slots.length === 0 ? (
                          <p className="text-light-gray/50 text-xs text-center py-4">No slots</p>
                        ) : (
                          day.slots.map((slot, idx) => (
                            <motion.button
                              key={idx}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSlotClick(day.date, slot)}
                              className="w-full rounded px-3 py-2 text-xs font-paragraph font-semibold transition-all duration-200 border"
                              style={{
                                backgroundColor: `rgba(${dominantRgbString}, 0.2)`,
                                borderColor: `rgba(${dominantRgbString}, 0.5)`,
                                color: dominantColor,
                              }}
                            >
                              {format(parseISO(slot.startAtISO), 'h:mm a')}
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

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-gradient-to-br from-deep-charcoal to-[#1a1a1a] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Complete Your Booking</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <form onSubmit={handleBookingSubmit} className="space-y-5">
              {/* Selected Time Display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: `rgba(${dominantRgbString}, 0.1)`,
                  borderColor: `rgba(${dominantRgbString}, 0.3)`,
                }}
              >
                <p className="font-paragraph text-xs text-light-gray/70 mb-2 uppercase tracking-wider">Selected Time</p>
                <p className="font-heading text-lg mb-1" style={{ color: dominantColor }}>
                  {format(parseISO(selectedSlot.slot.startAtISO), 'EEEE, MMMM d')}
                </p>
                <p className="font-heading text-xl text-white">
                  {format(parseISO(selectedSlot.slot.startAtISO), 'h:mm a')} -{' '}
                  {format(parseISO(selectedSlot.slot.endAtISO), 'h:mm a')}
                </p>
              </motion.div>

              {/* Error Message */}
              {bookingError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm"
                >
                  {bookingError}
                </motion.div>
              )}

              {/* Price Option Selector */}
              {selectedService?.priceOptions && (() => {
                try {
                  const opts = JSON.parse(selectedService.priceOptions);
                  if (Array.isArray(opts) && opts.length > 0) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Label htmlFor="priceOption" className="text-light-gray font-semibold">
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
                          <SelectTrigger className="bg-white/5 border-white/20 text-white mt-2">
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

              {/* Form Fields */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Label htmlFor="clientName" className="text-light-gray font-semibold">
                  Name *
                </Label>
                <Input
                  id="clientName"
                  required
                  value={bookingForm.clientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label htmlFor="clientEmail" className="text-light-gray font-semibold">
                  Email *
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  required
                  value={bookingForm.clientEmail}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Label htmlFor="clientPhone" className="text-light-gray font-semibold">
                  Phone *
                </Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  required
                  value={bookingForm.clientPhone}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label htmlFor="peopleCount" className="text-light-gray font-semibold">
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
                  className="bg-white/5 border-white/20 text-white mt-2"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Label htmlFor="notes" className="text-light-gray font-semibold">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="bg-white/5 border-white/20 text-white mt-2"
                  rows={3}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-deep-charcoal hover:opacity-90 font-semibold h-12 rounded-lg"
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
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={bookingSuccess} onOpenChange={setBookingSuccess}>
        <DialogContent className="bg-gradient-to-br from-deep-charcoal to-[#1a1a1a] border-white/20 text-white max-w-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <DialogHeader>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="inline-block p-4 rounded-full mb-4"
                style={{ backgroundColor: `rgba(${dominantRgbString}, 0.2)` }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: dominantColor }} />
              </motion.div>
              <DialogTitle className="font-heading text-3xl" style={{ color: dominantColor }}>
                Booking Confirmed!
              </DialogTitle>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <p className="font-paragraph text-light-gray/80">
                Your appointment has been successfully booked. You will receive a confirmation email shortly.
              </p>
              <p className="font-paragraph text-light-gray/80">
                We'll also send you a reminder 24 hours before your appointment.
              </p>
              <Button
                onClick={() => setBookingSuccess(false)}
                className="w-full text-deep-charcoal hover:opacity-90 font-semibold h-12 rounded-lg"
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
