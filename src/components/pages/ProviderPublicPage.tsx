import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, Tag, Clock, Users, DollarSign, Search, X, ChevronDown, Calendar, ArrowRight, Star } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-deep-charcoal via-deep-charcoal to-[#1a1a1a] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-deep-charcoal via-deep-charcoal to-[#1a1a1a] flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-gradient-to-br from-deep-charcoal via-deep-charcoal to-[#1a1a1a] text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-neon-teal/5 rounded-full blur-3xl"
            animate={{ y: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-neon-teal/5 rounded-full blur-3xl"
            animate={{ y: [0, -30, 0] }}
            transition={{ duration: 8, repeat: Infinity, delay: 1 }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-[100rem] mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-block mb-6 px-4 py-2 bg-neon-teal/10 border border-neon-teal/30 rounded-full"
          >
            <span className="text-neon-teal font-paragraph text-sm font-semibold">Welcome to</span>
          </motion.div>

          <h1 className="text-6xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight">
            {provider.displayName}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl text-light-gray/80 font-paragraph mb-8 max-w-2xl mx-auto"
          >
            {provider.categoryTags || 'Professional services at your convenience'}
          </motion.p>

          {/* Provider Info Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12"
          >
            {provider.addressText && (
              <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-colors">
                <MapPin className="w-5 h-5 text-neon-teal flex-shrink-0" />
                <p className="font-paragraph text-light-gray text-sm">{provider.addressText}</p>
              </motion.div>
            )}
            {provider.whatsappNumber && (
              <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-colors">
                <Phone className="w-5 h-5 text-neon-teal flex-shrink-0" />
                <p className="font-paragraph text-light-gray text-sm">{provider.whatsappNumber}</p>
              </motion.div>
            )}
            {provider.contactEmail && (
              <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-colors">
                <Mail className="w-5 h-5 text-neon-teal flex-shrink-0" />
                <p className="font-paragraph text-light-gray text-sm">{provider.contactEmail}</p>
              </motion.div>
            )}
            {provider.timezone && (
              <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-colors">
                <Clock className="w-5 h-5 text-neon-teal flex-shrink-0" />
                <p className="font-paragraph text-light-gray text-sm">{provider.timezone}</p>
              </motion.div>
            )}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-12"
          >
            <Button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-neon-teal text-deep-charcoal hover:opacity-90 px-8 py-6 text-lg font-semibold group"
            >
              Explore Services
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services-section" className="py-20 px-4 relative">
        <div className="max-w-[100rem] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-5xl font-heading font-bold text-white mb-4">Our Services</h2>
            <p className="text-light-gray/70 font-paragraph text-lg">Choose from our carefully curated selection of professional services</p>
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
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm"
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
              {filteredServices.map((service) => (
                <motion.div
                  key={service._id}
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                  className="group relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:border-neon-teal/30 transition-all duration-300 overflow-hidden"
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-teal/0 to-neon-teal/0 group-hover:from-neon-teal/5 group-hover:to-neon-teal/10 transition-all duration-300" />

                  <div className="relative z-10">
                    <h3 className="text-2xl font-heading font-semibold text-white mb-4 group-hover:text-neon-teal transition-colors">{service.name}</h3>

                    <div className="space-y-3 mb-6">
                      {service.category && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className="flex items-center gap-2 text-light-gray/70"
                        >
                          <Tag className="w-4 h-4 text-neon-teal flex-shrink-0" />
                          <span className="font-paragraph text-sm">{service.category}</span>
                        </motion.div>
                      )}
                      {service.durationMin && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 }}
                          className="flex items-center gap-2 text-light-gray/70"
                        >
                          <Clock className="w-4 h-4 text-neon-teal flex-shrink-0" />
                          <span className="font-paragraph text-sm">{service.durationMin} minutes</span>
                        </motion.div>
                      )}
                      {service.price !== undefined && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center gap-2 text-light-gray/70"
                        >
                          <DollarSign className="w-4 h-4 text-neon-teal flex-shrink-0" />
                          <span className="font-paragraph text-sm font-semibold text-neon-teal">${service.price}</span>
                        </motion.div>
                      )}
                      {service.maxPeoplePerBooking && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 }}
                          className="flex items-center gap-2 text-light-gray/70"
                        >
                          <Users className="w-4 h-4 text-neon-teal flex-shrink-0" />
                          <span className="font-paragraph text-sm">Up to {service.maxPeoplePerBooking} people</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Price Variants */}
                    {service.priceOptions && (() => {
                      try {
                        const opts = JSON.parse(service.priceOptions);
                        if (Array.isArray(opts) && opts.length > 0) {
                          return (
                            <motion.div
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="mb-6 p-3 bg-neon-teal/10 border border-neon-teal/20 rounded-lg"
                            >
                              <p className="text-neon-teal/80 font-paragraph text-xs font-semibold mb-2">VARIANTS</p>
                              <div className="space-y-1">
                                {opts.map((opt: PriceOption, idx: number) => (
                                  <div key={idx} className="text-xs text-light-gray/70 font-paragraph flex justify-between">
                                    <span>{opt.name}</span>
                                    <span className="text-neon-teal font-semibold">${opt.price}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          );
                        }
                      } catch {
                        return null;
                      }
                      return null;
                    })()}

                    <Button
                      onClick={() => {
                        setSelectedService(service);
                        setBookingSuccess(false);
                      }}
                      className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90 font-semibold group/btn"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Now
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </motion.div>
              ))}
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
            className="py-20 px-4 border-t border-white/10 relative"
          >
            <div className="max-w-[100rem] mx-auto">
              <div className="flex items-center justify-between mb-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h2 className="text-5xl font-heading font-bold text-white">
                    Select Your Time
                  </h2>
                  <p className="text-light-gray/70 font-paragraph mt-2">
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
                className="flex items-center justify-between mb-12 p-6 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm"
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
                      className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm hover:border-neon-teal/30 transition-all"
                    >
                      <h3 className="font-heading font-semibold text-white mb-4 text-center text-sm">
                        {format(parseISO(day.date), 'EEE')}
                        <div className="text-neon-teal text-lg mt-1">{format(parseISO(day.date), 'd')}</div>
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
                              className="w-full bg-gradient-to-r from-neon-teal/20 to-neon-teal/10 hover:from-neon-teal/30 hover:to-neon-teal/20 text-neon-teal border border-neon-teal/50 rounded px-3 py-2 text-xs font-paragraph font-semibold transition-all duration-200"
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
                className="bg-gradient-to-r from-neon-teal/20 to-neon-teal/10 border border-neon-teal/30 rounded-lg p-4"
              >
                <p className="font-paragraph text-xs text-light-gray/70 mb-2 uppercase tracking-wider">Selected Time</p>
                <p className="font-heading text-lg text-neon-teal mb-1">
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
                  className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90 font-semibold h-12"
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
                className="inline-block p-4 bg-neon-teal/20 rounded-full mb-4"
              >
                <Star className="w-8 h-8 text-neon-teal fill-neon-teal" />
              </motion.div>
              <DialogTitle className="font-heading text-3xl text-neon-teal">Booking Confirmed!</DialogTitle>
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
                className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90 font-semibold h-12"
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
