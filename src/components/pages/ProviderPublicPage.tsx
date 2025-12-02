import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Tag, Calendar, Clock, Users, DollarSign, Search, X, ChevronDown } from 'lucide-react';
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
      <div className="min-h-screen bg-deep-charcoal flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-deep-charcoal flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-heading font-bold text-white mb-4">Provider Not Found</h1>
          <p className="text-light-gray font-paragraph">{error || 'The provider you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-charcoal text-foreground">
      {/* Provider Header */}
      <section className="py-16 px-4 border-b border-white/10">
        <div className="max-w-[100rem] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm"
          >
            <h1 className="text-5xl font-heading font-bold text-white mb-6">{provider.displayName}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {provider.addressText && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-neon-teal mt-1 flex-shrink-0" />
                  <p className="font-paragraph text-light-gray">{provider.addressText}</p>
                </div>
              )}
              {provider.whatsappNumber && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-neon-teal mt-1 flex-shrink-0" />
                  <p className="font-paragraph text-light-gray">{provider.whatsappNumber}</p>
                </div>
              )}
              {provider.contactEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-neon-teal mt-1 flex-shrink-0" />
                  <p className="font-paragraph text-light-gray">{provider.contactEmail}</p>
                </div>
              )}
              {provider.categoryTags && (
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-neon-teal mt-1 flex-shrink-0" />
                  <p className="font-paragraph text-light-gray">{provider.categoryTags}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4">
        <div className="max-w-[100rem] mx-auto">
          <h2 className="text-4xl font-heading font-bold text-white mb-8">Services</h2>

          {/* Filters */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-gray" />
                <Input
                  placeholder="Search services..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10 bg-deep-charcoal border-white/20 text-white"
                />
              </div>
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
            </div>
          </div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-light-gray font-paragraph text-lg">No services found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <motion.div
                  key={service._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  <h3 className="text-2xl font-heading font-semibold text-white mb-4">{service.name}</h3>
                  <div className="space-y-2 mb-6">
                    {service.category && (
                      <div className="flex items-center gap-2 text-light-gray">
                        <Tag className="w-4 h-4 text-neon-teal" />
                        <span className="font-paragraph text-sm">{service.category}</span>
                      </div>
                    )}
                    {service.durationMin && (
                      <div className="flex items-center gap-2 text-light-gray">
                        <Clock className="w-4 h-4 text-neon-teal" />
                        <span className="font-paragraph text-sm">{service.durationMin} minutes</span>
                      </div>
                    )}
                    {service.price !== undefined && (
                      <div className="flex items-center gap-2 text-light-gray">
                        <DollarSign className="w-4 h-4 text-neon-teal" />
                        <span className="font-paragraph text-sm">${service.price}</span>
                      </div>
                    )}
                    {service.priceOptions && (() => {
                      try {
                        const opts = JSON.parse(service.priceOptions);
                        if (Array.isArray(opts) && opts.length > 0) {
                          return (
                            <div className="text-sm">
                              <p className="text-light-gray/70 font-paragraph mb-2">Variants available:</p>
                              <div className="space-y-1">
                                {opts.map((opt: PriceOption, idx: number) => (
                                  <div key={idx} className="text-xs text-light-gray/60 font-paragraph">
                                    • {opt.name}: ${opt.price}
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
                    {service.maxPeoplePerBooking && (
                      <div className="flex items-center gap-2 text-light-gray">
                        <Users className="w-4 h-4 text-neon-teal" />
                        <span className="font-paragraph text-sm">Up to {service.maxPeoplePerBooking} people</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedService(service);
                      setBookingSuccess(false);
                    }}
                    className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90"
                  >
                    Book Now
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Agenda Section */}
      {selectedService && (
        <section className="py-16 px-4 border-t border-white/10">
          <div className="max-w-[100rem] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-heading font-bold text-white">
                Book: {selectedService.name}
              </h2>
              <Button
                onClick={() => setSelectedService(null)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-8">
              <Button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Previous Week
              </Button>
              <span className="font-paragraph text-light-gray">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </span>
              <Button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Next Week
              </Button>
            </div>

            {/* Availability Grid */}
            {loadingAvailability ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : availability.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-light-gray font-paragraph text-lg">No availability for this week.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                {availability.map((day) => (
                  <div key={day.date} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <h3 className="font-heading font-semibold text-white mb-4 text-center">
                      {format(parseISO(day.date), 'EEE, MMM d')}
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {day.slots.length === 0 ? (
                        <p className="text-light-gray text-sm text-center">No slots</p>
                      ) : (
                        day.slots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSlotClick(day.date, slot)}
                            className="w-full bg-neon-teal/20 hover:bg-neon-teal/30 text-neon-teal border border-neon-teal/50 rounded px-3 py-2 text-sm font-paragraph transition-colors"
                          >
                            {format(parseISO(slot.startAtISO), 'h:mm a')}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-deep-charcoal border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Complete Your Booking</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="bg-neon-teal/10 border border-neon-teal/30 rounded-lg p-4 mb-4">
                <p className="font-paragraph text-sm text-light-gray mb-1">Selected Time</p>
                <p className="font-heading text-lg text-neon-teal">
                  {format(parseISO(selectedSlot.slot.startAtISO), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="font-heading text-xl text-white">
                  {format(parseISO(selectedSlot.slot.startAtISO), 'h:mm a')} -{' '}
                  {format(parseISO(selectedSlot.slot.endAtISO), 'h:mm a')}
                </p>
              </div>

              {bookingError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
                  {bookingError}
                </div>
              )}

              {selectedService?.priceOptions && (() => {
                try {
                  const opts = JSON.parse(selectedService.priceOptions);
                  if (Array.isArray(opts) && opts.length > 0) {
                    return (
                      <div>
                        <Label htmlFor="priceOption" className="text-light-gray">
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
                          <SelectTrigger className="bg-deep-charcoal border-white/20 text-white">
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
                      </div>
                    );
                  }
                } catch {
                  return null;
                }
                return null;
              })()}

              <div>
                <Label htmlFor="clientName" className="text-light-gray">
                  Name *
                </Label>
                <Input
                  id="clientName"
                  required
                  value={bookingForm.clientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="clientEmail" className="text-light-gray">
                  Email *
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  required
                  value={bookingForm.clientEmail}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="clientPhone" className="text-light-gray">
                  Phone *
                </Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  required
                  value={bookingForm.clientPhone}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="peopleCount" className="text-light-gray">
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
                  className="bg-deep-charcoal border-white/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-light-gray">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="bg-deep-charcoal border-white/20 text-white"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90"
              >
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={bookingSuccess} onOpenChange={setBookingSuccess}>
        <DialogContent className="bg-deep-charcoal border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-neon-teal">Booking Confirmed!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-paragraph text-light-gray">
              Your appointment has been successfully booked. You will receive a confirmation email shortly.
            </p>
            <p className="font-paragraph text-light-gray">
              We'll also send you a reminder 24 hours before your appointment.
            </p>
            <Button
              onClick={() => setBookingSuccess(false)}
              className="w-full bg-neon-teal text-deep-charcoal hover:opacity-90"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
