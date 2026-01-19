import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Users, DollarSign, Calendar, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
import { format, addDays, startOfWeek, parseISO, isSameDay } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState('#00FFD4');

  // Booking flow state
  const [step, setStep] = useState<'service' | 'date' | 'time' | 'details'>('service');
  const [selectedService, setSelectedService] = useState<Services | null>(null);
  const [selectedPriceOption, setSelectedPriceOption] = useState<PriceOption | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
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
    if (services.length > 0) {
      setDominantColor(getDominantColor(services));
    }
  }, [services]);

  useEffect(() => {
    if (selectedService && provider && step === 'time') {
      loadAvailability();
    }
  }, [selectedService, weekStart, provider, step]);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const handleServiceSelect = (service: Services) => {
    setSelectedService(service);
    setSelectedPriceOption(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookingSuccess(false);
    setStep('date');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep('time');
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setBookingForm({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      peopleCount: 1,
      notes: '',
    });
    setBookingError(null);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('time');
      setSelectedSlot(null);
    } else if (step === 'time') {
      setStep('date');
      setSelectedSlot(null);
    } else if (step === 'date') {
      setStep('service');
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedSlot(null);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedService || !provider || !selectedDate) return;

    try {
      setSubmitting(true);
      setBookingError(null);

      const response = await fetch('/api/appointments/createAppointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider._id,
          serviceId: selectedService._id,
          startAtISO: selectedSlot.startAtISO,
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
          setStep('time');
          setSelectedSlot(null);
          await loadAvailability();
        } else {
          throw new Error(data.error || 'Failed to create appointment');
        }
        return;
      }

      setBookingSuccess(true);
      setStep('service');
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setSelectedPriceOption(null);
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
      {/* Header */}
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
          </div>
        </div>
      </motion.header>

      {/* Enhanced Progress Indicator with Selection Summary */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {['service', 'date', 'time', 'details'].map((s, idx) => {
            const stepIndex = ['service', 'date', 'time', 'details'].indexOf(step);
            const currentIndex = idx;
            const isActive = currentIndex === stepIndex;
            const isCompleted = currentIndex < stepIndex;
            
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    animate={{
                      scale: isActive ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.5 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-lg ${
                      isActive
                        ? 'ring-4 ring-offset-2 ring-offset-deep-charcoal'
                        : isCompleted
                        ? 'bg-opacity-100'
                        : 'bg-white/10'
                    }`}
                    style={{
                      backgroundColor: isActive || isCompleted ? dominantColor : undefined,
                      color: isActive || isCompleted ? '#222222' : '#EAEAEA',
                      ringColor: isActive ? dominantColor : undefined,
                    }}
                  >
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                  </motion.div>
                  <span className={`text-sm mt-3 font-medium ${isActive ? 'text-white font-bold' : isCompleted ? 'text-light-gray' : 'text-light-gray/60'}`}>
                    {s === 'service' ? '1. Servicio' : s === 'date' ? '2. Fecha' : s === 'time' ? '3. Hora' : '4. Confirmar'}
                  </span>
                </div>
                {idx < 3 && (
                  <motion.div 
                    className={`h-1 flex-1 mx-4 rounded-full transition-all ${isCompleted ? 'opacity-100' : 'bg-white/10'}`} 
                    style={{ backgroundColor: isCompleted ? dominantColor : undefined }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Selection Summary Bar - Shows what has been selected */}
        {(selectedService || selectedDate || selectedSlot) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-light-gray/70 text-sm font-medium">Tu selección:</span>
              
              {selectedService && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.2)` }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: dominantColor }} />
                  <span className="text-white font-medium text-sm">{selectedService.name}</span>
                  {step !== 'service' && (
                    <button
                      onClick={() => {
                        setStep('service');
                        setSelectedService(null);
                        setSelectedDate(null);
                        setSelectedSlot(null);
                      }}
                      className="ml-2 text-light-gray/60 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              
              {selectedDate && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.2)` }}>
                  <Calendar className="w-4 h-4" style={{ color: dominantColor }} />
                  <span className="text-white font-medium text-sm">{format(selectedDate, 'MMM d, yyyy')}</span>
                  {step !== 'date' && step !== 'service' && (
                    <button
                      onClick={() => {
                        setStep('date');
                        setSelectedDate(null);
                        setSelectedSlot(null);
                      }}
                      className="ml-2 text-light-gray/60 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              
              {selectedSlot && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.2)` }}>
                  <Clock className="w-4 h-4" style={{ color: dominantColor }} />
                  <span className="text-white font-medium text-sm">{format(parseISO(selectedSlot.startAtISO), 'h:mm a')}</span>
                  {step === 'details' && (
                    <button
                      onClick={() => {
                        setStep('time');
                        setSelectedSlot(null);
                      }}
                      className="ml-2 text-light-gray/60 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Service Selection */}
          {step === 'service' && (
            <motion.div
              key="service"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-block mb-4 px-6 py-2 rounded-full border-2"
                  style={{ borderColor: dominantColor, backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}
                >
                  <span className="text-sm font-bold" style={{ color: dominantColor }}>PASO 1 DE 4</span>
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-3">
                  ¿Qué servicio necesitas?
                </h2>
                <p className="text-light-gray/70 text-lg">Selecciona el servicio que deseas reservar</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service, index) => {
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
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      onClick={() => handleServiceSelect(service)}
                      className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/10 hover:border-white/30 transition-all cursor-pointer overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                          background: `linear-gradient(135deg, rgba(${serviceRgbString}, 0.15), transparent)`,
                        }}
                      />

                      <div className="relative z-10">
                        <div className="mb-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-xl font-heading font-bold text-white">
                              {service.name}
                            </h3>
                            {service.category && (
                              <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                                {service.category}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 mb-6">
                          {service.durationMin && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.2)` }}>
                                <Clock className="w-4 h-4" style={{ color: serviceColor }} />
                              </div>
                              <div>
                                <p className="text-xs text-light-gray/60 uppercase tracking-wide">Duración</p>
                                <p className="text-sm text-white font-medium">{service.durationMin} minutos</p>
                              </div>
                            </div>
                          )}

                          {service.price !== undefined && priceOptions.length === 0 && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgba(${serviceRgbString}, 0.2)` }}>
                                <DollarSign className="w-4 h-4" style={{ color: serviceColor }} />
                              </div>
                              <div>
                                <p className="text-xs text-light-gray/60 uppercase tracking-wide">Precio</p>
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
                                <p className="text-xs text-light-gray/60 uppercase tracking-wide mb-1">Opciones</p>
                                <div className="space-y-1">
                                  {priceOptions.slice(0, 2).map((opt, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-light-gray/80">{opt.name}</span>
                                      <span className="font-semibold" style={{ color: serviceColor }}>${opt.price}</span>
                                    </div>
                                  ))}
                                  {priceOptions.length > 2 && (
                                    <p className="text-xs text-light-gray/60">+{priceOptions.length - 2} más</p>
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
                                <p className="text-xs text-light-gray/60 uppercase tracking-wide">Capacidad</p>
                                <p className="text-sm text-white font-medium">Hasta {service.maxPeoplePerBooking} personas</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full font-semibold"
                          style={{ backgroundColor: serviceColor, color: '#222222' }}
                        >
                          Seleccionar
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Date Selection */}
          {step === 'date' && selectedService && (
            <motion.div
              key="date"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-block mb-4 px-6 py-2 rounded-full border-2"
                  style={{ borderColor: dominantColor, backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}
                >
                  <span className="text-sm font-bold" style={{ color: dominantColor }}>PASO 2 DE 4</span>
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-3">
                  ¿Qué día prefieres?
                </h2>
                <p className="text-light-gray/70 text-lg">Selecciona la fecha para tu cita de <span className="font-semibold" style={{ color: dominantColor }}>{selectedService.name}</span></p>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg backdrop-blur-sm border border-white/10" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.05)` }}>
                <Button
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                <span className="font-heading text-base text-white text-center">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </span>
                <Button
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const date = addDays(weekStart, idx);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isPast = date < new Date() && !isSameDay(date, new Date());

                  return (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={!isPast ? { scale: 1.05, y: -4 } : {}}
                      whileTap={!isPast ? { scale: 0.95 } : {}}
                      onClick={() => !isPast && handleDateSelect(date)}
                      disabled={isPast}
                      className={`rounded-2xl p-6 border-2 transition-all ${
                        isPast
                          ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10'
                          : isSelected
                          ? 'border-white/50 shadow-lg'
                          : 'border-white/10 hover:border-white/30 bg-white/5'
                      }`}
                      style={isSelected ? { backgroundColor: `rgba(${dominantRgbString}, 0.2)`, borderColor: dominantColor } : {}}
                    >
                      <div className="text-center">
                        <div className={`text-xs uppercase tracking-wide mb-2 ${isSelected ? 'font-bold' : 'text-light-gray/60'}`} style={isSelected ? { color: dominantColor } : {}}>
                          {format(date, 'EEE')}
                        </div>
                        <div className={`text-4xl font-bold mb-1 ${isSelected ? '' : 'text-white'}`} style={isSelected ? { color: dominantColor } : {}}>
                          {format(date, 'd')}
                        </div>
                        <div className="text-xs text-light-gray/60">
                          {format(date, 'MMM')}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Time Selection */}
          {step === 'time' && selectedService && selectedDate && (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-block mb-4 px-6 py-2 rounded-full border-2"
                  style={{ borderColor: dominantColor, backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}
                >
                  <span className="text-sm font-bold" style={{ color: dominantColor }}>PASO 3 DE 4</span>
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-3">
                  ¿A qué hora?
                </h2>
                <p className="text-light-gray/70 text-lg">
                  Horarios disponibles para el <span className="font-semibold" style={{ color: dominantColor }}>{format(selectedDate, 'EEEE, d MMMM yyyy')}</span>
                </p>
              </div>

              {loadingAvailability ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availability
                    .find((day) => isSameDay(parseISO(day.date), selectedDate))
                    ?.slots.map((slot, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSlotSelect(slot)}
                        className="rounded-xl p-6 border-2 transition-all bg-white/5 border-white/10 hover:border-white/30 hover:shadow-lg"
                        style={{
                          borderColor: `rgba(${dominantRgbString}, 0.3)`,
                        }}
                      >
                        <div className="text-center">
                          <Clock className="w-6 h-6 mx-auto mb-3" style={{ color: dominantColor }} />
                          <div className="text-xl font-bold text-white mb-1">
                            {format(parseISO(slot.startAtISO), 'h:mm a')}
                          </div>
                          <div className="text-xs text-light-gray/60">
                            {format(parseISO(slot.endAtISO), 'h:mm a')}
                          </div>
                        </div>
                      </motion.button>
                    )) || (
                    <div className="col-span-full text-center py-12">
                      <Calendar className="w-12 h-12 text-light-gray/30 mx-auto mb-4" />
                      <p className="text-light-gray/70">No hay horarios disponibles para esta fecha</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Details Form */}
          {step === 'details' && selectedService && selectedDate && selectedSlot && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-block mb-4 px-6 py-2 rounded-full border-2"
                  style={{ borderColor: dominantColor, backgroundColor: `rgba(${dominantRgbString}, 0.1)` }}
                >
                  <span className="text-sm font-bold" style={{ color: dominantColor }}>PASO 4 DE 4 - ÚLTIMO PASO</span>
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-3">
                  Confirma tu reserva
                </h2>
                <p className="text-light-gray/70 text-lg">
                  Solo necesitamos algunos datos para completar tu cita
                </p>
              </div>

              <form onSubmit={handleBookingSubmit} className="max-w-2xl mx-auto space-y-6">
                {/* Selected Details Summary - Enhanced */}
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-2xl p-8 border-2 shadow-xl" 
                  style={{ backgroundColor: `rgba(${dominantRgbString}, 0.15)`, borderColor: `rgba(${dominantRgbString}, 0.4)` }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: dominantColor }}>
                      <CheckCircle2 className="w-6 h-6 text-deep-charcoal" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-white text-xl">Resumen de tu Reserva</h3>
                      <p className="text-light-gray/70 text-sm">Verifica que todo esté correcto</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.3)` }}>
                        <Calendar className="w-6 h-6" style={{ color: dominantColor }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-light-gray/60 uppercase tracking-wide mb-1">Servicio</p>
                        <p className="text-white font-bold text-lg">{selectedService.name}</p>
                        {selectedService.durationMin && (
                          <p className="text-light-gray/70 text-sm mt-1">Duración: {selectedService.durationMin} minutos</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `rgba(${dominantRgbString}, 0.3)` }}>
                        <Clock className="w-6 h-6" style={{ color: dominantColor }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-light-gray/60 uppercase tracking-wide mb-1">Fecha y Hora</p>
                        <p className="text-white font-bold text-lg">
                          {format(selectedDate, 'EEEE, d MMMM yyyy')}
                        </p>
                        <p className="text-white font-bold text-lg mt-1">
                          {format(parseISO(selectedSlot.startAtISO), 'h:mm a')} - {format(parseISO(selectedSlot.endAtISO), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Error Message */}
                {bookingError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive"
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
                        <div>
                          <Label htmlFor="priceOption" className="text-light-gray font-semibold mb-2 block">
                            Selecciona una Opción de Precio *
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
                            <SelectTrigger className="bg-white/5 border-white/20 text-white">
                              <SelectValue placeholder="Elige una variante..." />
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

                {/* Form Fields */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                  <h3 className="font-heading font-bold text-white text-xl mb-6">Tus Datos de Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="clientName" className="text-light-gray font-semibold mb-2 block">
                      Nombre Completo *
                    </Label>
                    <Input
                      id="clientName"
                      required
                      value={bookingForm.clientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientEmail" className="text-light-gray font-semibold mb-2 block">
                      Email *
                    </Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      required
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientPhone" className="text-light-gray font-semibold mb-2 block">
                      Teléfono *
                    </Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      required
                      value={bookingForm.clientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="+1234567890"
                    />
                  </div>

                  <div>
                    <Label htmlFor="peopleCount" className="text-light-gray font-semibold mb-2 block">
                      Número de Personas *
                    </Label>
                    <Input
                      id="peopleCount"
                      type="number"
                      min="1"
                      max={selectedService?.maxPeoplePerBooking || 1}
                      required
                      value={bookingForm.peopleCount}
                      onChange={(e) => setBookingForm({ ...bookingForm, peopleCount: parseInt(e.target.value) })}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                  <h3 className="font-heading font-bold text-white text-xl mb-6">Información Adicional</h3>
                  <div>
                  <Label htmlFor="notes" className="text-light-gray font-semibold mb-2 block">
                    Notas Adicionales (Opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    className="bg-white/5 border-white/20 text-white"
                    rows={4}
                    placeholder="Alguna información adicional que quieras compartir..."
                  />
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full text-deep-charcoal hover:opacity-90 font-bold text-xl py-8 rounded-xl shadow-2xl transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: dominantColor }}
                  >
                    {submitting ? (
                      <>
                        <LoadingSpinner />
                        {' '}Procesando tu reserva...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6 mr-3" />
                        Confirmar Reserva
                        <ArrowRight className="w-6 h-6 ml-3" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-light-gray/60 text-sm mt-4">
                    Al confirmar, recibirás un email de confirmación inmediatamente
                  </p>
                </motion.div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Success Dialog */}
      <Dialog open={bookingSuccess} onOpenChange={setBookingSuccess}>
        <DialogContent className="bg-gradient-to-br from-deep-charcoal to-[#1a1a1a] border-white/20 text-white max-w-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="inline-block p-4 rounded-full mb-4"
              style={{ backgroundColor: `rgba(${dominantRgbString}, 0.2)` }}
            >
              <CheckCircle2 className="w-12 h-12" style={{ color: dominantColor }} />
            </motion.div>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl mb-4" style={{ color: dominantColor }}>
                ¡Reserva Confirmada!
              </DialogTitle>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <p className="font-paragraph text-light-gray/80">
                Tu cita ha sido reservada exitosamente. Recibirás un correo de confirmación en breve.
              </p>
              <p className="font-paragraph text-light-gray/80 text-sm">
                También te enviaremos un recordatorio 24 horas antes de tu cita.
              </p>
              <Button
                onClick={() => {
                  setBookingSuccess(false);
                  setStep('service');
                }}
                className="w-full text-deep-charcoal hover:opacity-90 font-semibold"
                style={{ backgroundColor: dominantColor }}
              >
                Entendido
              </Button>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
