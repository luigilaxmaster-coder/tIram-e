// HPI 6.0-ULTRA-OPTIMIZED-ENHANCED
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, useAnimation, AnimatePresence, useReducedMotion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, Zap, ArrowRight, CheckCircle2, Shield, Smartphone, Globe, ChevronRight, Star, Sparkles, TrendingUp, BarChart3, Network, Layers, Lock, Bell, Rocket, Activity, Database, Eye, MousePointer2, Cpu, Gauge, Waves, Maximize2, Minimize2, Target, Award, Briefcase, HeartHandshake } from 'lucide-react';
import { Image } from '@/components/ui/image';

// --- Utility Components ---

type AnimatedElementProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

const AnimatedElement: React.FC<AnimatedElementProps> = ({ children, className, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion) {
      if (element) element.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          element.classList.add('is-visible');
        }, delay);
        observer.unobserve(element);
      }
    }, { threshold: 0.1, rootMargin: '50px' });

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, prefersReducedMotion]);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out opacity-0 translate-y-12 motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 [&.is-visible]:opacity-100 [&.is-visible]:translate-y-0 ${className || ''}`}
    >
      {children}
    </div>
  );
};

// Optimized Mouse Glow Effect - Smoother & More Performant
const MouseGlow = ({ x, y }: { x: number; y: number }) => {
  // Optimized spring config for smoother, more fluid motion
  const springConfig = { damping: 25, stiffness: 300, mass: 0.3 };
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);
  
  // Reduced trail length and optimized updates for better performance
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const lastTrailUpdate = useRef(0);

  useEffect(() => {
    const now = Date.now();
    // Throttle trail updates to every 50ms for smoother performance
    if (now - lastTrailUpdate.current < 50) return;
    
    lastTrailUpdate.current = now;
    const id = now;
    setTrail(prev => [...prev.slice(-5), { x, y, id }]); // Reduced from 8 to 5 particles
  }, [x, y]);

  // Memoized gradient backgrounds for better performance
  const primaryGlow = useMotionTemplate`radial-gradient(800px circle at ${mouseX}px ${mouseY}px, rgba(0, 255, 212, 0.18), transparent 40%)`;
  const secondaryGlow = useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, rgba(102, 120, 255, 0.12), transparent 50%)`;
  const accentGlow = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.04), transparent 60%)`;

  return (
    <>
      {/* Optimized multi-layer gradient glow with will-change for GPU acceleration */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          background: primaryGlow,
          willChange: 'transform'
        }}
      />
      <motion.div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          background: secondaryGlow,
          willChange: 'transform'
        }}
      />
      <motion.div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          background: accentGlow,
          willChange: 'transform'
        }}
      />
      
      {/* Optimized mouse trail particles with reduced count */}
      {trail.map((point) => (
        <motion.div
          key={point.id}
          className="pointer-events-none fixed w-1.5 h-1.5 rounded-full bg-neon-teal/25 z-29"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            left: point.x - 3,
            top: point.y - 3,
            willChange: 'transform, opacity'
          }}
        />
      ))}

      {/* Optimized magnetic cursor with smoother ripple effect */}
      <motion.div
        className="pointer-events-none fixed w-10 h-10 rounded-full border border-neon-teal/40 z-40"
        style={{
          x: useTransform(mouseX, (val) => val - 20),
          y: useTransform(mouseY, (val) => val - 20),
          willChange: 'transform'
        }}
      >
        <motion.div 
          className="absolute inset-0 rounded-full bg-neon-teal/10"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute inset-0 rounded-full border border-neon-teal/20"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.2, ease: "easeInOut" }}
        />
      </motion.div>
    </>
  );
};

// Ultra-Enhanced Hover Reveal Text with 3D Transform & Particle Effects
const HoverRevealText = ({ text, className = '' }: { text: string; className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    // Generate particles on hover
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50
    }));
    setParticles(newParticles);
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.85, rotateX: -20, z: -50 }}
        animate={{ 
          opacity: isHovered ? 1 : 0, 
          y: isHovered ? 0 : 25,
          scale: isHovered ? 1 : 0.85,
          rotateX: isHovered ? 0 : -20,
          z: isHovered ? 0 : -50
        }}
        transition={{ duration: 0.35, type: "spring", stiffness: 450, damping: 22 }}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-deep-charcoal via-deep-charcoal/98 to-black backdrop-blur-xl border-2 border-neon-teal/60 rounded-xl shadow-[0_0_40px_rgba(0,255,212,0.4),0_0_80px_rgba(0,255,212,0.2)]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <span className="text-neon-teal font-heading text-sm font-bold tracking-wide flex items-center gap-2 relative z-10">
          <Eye className="w-3.5 h-3.5" />
          {text}
        </span>
        
        {/* Animated border pulse */}
        <motion.div
          className="absolute inset-0 border-2 border-neon-teal/40 rounded-xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Particle effects */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-neon-teal rounded-full"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ 
              x: particle.x, 
              y: particle.y, 
              opacity: 0, 
              scale: 0 
            }}
            transition={{ duration: 0.8 }}
            style={{
              left: '50%',
              top: '50%'
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Ultra-Enhanced 3D Card with Advanced Physics & Magnetic Attraction
const Card3D = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateXValue = ((y - centerY) / centerY) * -22;
    const rotateYValue = ((x - centerX) / centerX) * 22;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1400px'
      }}
      animate={{
        rotateX,
        rotateY,
        scale: isHovered ? 1.05 : 1,
        z: isHovered ? 60 : 0
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          transform: 'translateZ(70px)'
        }}
        animate={{
          boxShadow: isHovered 
            ? '0 35px 70px rgba(0, 255, 212, 0.25), 0 0 0 2px rgba(0, 255, 212, 0.15), 0 0 60px rgba(102, 120, 255, 0.15)' 
            : '0 12px 35px rgba(0, 0, 0, 0.35)'
        }}
        className="rounded-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

const ParallaxImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 1.1]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y, scale }} className="w-full h-[130%] -mt-[15%]">
        <Image
          src={src}
          alt={alt}
          width={1600}
          className="w-full h-full object-cover"
        />
      </motion.div>
    </div>
  );
};

// New: 3D Page Transition Effect Component
const PageTransition3D = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, rotateX: -15, y: 50, scale: 0.95 }}
      animate={isInView ? { 
        opacity: 1, 
        rotateX: 0, 
        y: 0, 
        scale: 1 
      } : { 
        opacity: 0, 
        rotateX: -15, 
        y: 50, 
        scale: 0.95 
      }}
      transition={{ 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1
      }}
      style={{ 
        transformStyle: 'preserve-3d',
        perspective: '2000px'
      }}
    >
      {children}
    </motion.div>
  );
};

// Compact Booking Flow - Simple & Clear
const BookingFlowDiagram = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    { icon: Calendar, label: 'Selecciona', desc: 'Elige fecha y hora' },
    { icon: CheckCircle2, label: 'Confirma', desc: 'Datos del cliente' },
    { icon: Zap, label: 'Reserva', desc: 'Confirmación instantánea' },
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === index;
          
          return (
            <motion.div
              key={index}
              className="relative"
              onMouseEnter={() => setActiveStep(index)}
              onMouseLeave={() => setActiveStep(null)}
              whileHover={{ scale: 1.05 }}
            >
              <div className={`p-6 bg-white/5 border-2 rounded-2xl transition-all ${
                isActive ? 'border-neon-teal bg-neon-teal/5' : 'border-white/10'
              }`}>
                {/* Step Number */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-full bg-neon-teal/20 flex items-center justify-center">
                    <span className="text-neon-teal font-heading font-bold text-sm">{index + 1}</span>
                  </div>
                  <Icon className={`w-6 h-6 ${isActive ? 'text-neon-teal' : 'text-white/50'}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-heading font-bold text-white mb-2">
                  {step.label}
                </h3>
                <p className="text-sm text-white/60">
                  {step.desc}
                </p>

                {/* Progress bar */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-neon-teal rounded-b-2xl"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isActive ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-neon-teal/30" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Simple metric */}
      <motion.div 
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-neon-teal/30">
          <Clock className="w-4 h-4 text-neon-teal" />
          <span className="text-sm text-white/70">Proceso completo en menos de 30 segundos</span>
        </div>
      </motion.div>
    </div>
  );
};

// --- Canonical Data Sources ---

const FEATURES_DATA = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Intelligent slot management prevents double-booking automatically. Our algorithm ensures your calendar is always conflict-free.',
    stat: '100% Conflict Free',
    color: 'neon-teal'
  },
  {
    icon: Clock,
    title: 'Real-time Updates',
    description: 'See availability instantly as appointments are booked. No page refreshes needed, just live, breathing data.',
    stat: '<50ms Latency',
    color: 'secondary'
  },
  {
    icon: Users,
    title: 'Client Management',
    description: 'Track appointments and client information effortlessly. Build a database of loyal customers with zero manual entry.',
    stat: 'Automated CRM',
    color: 'neon-teal'
  },
  {
    icon: Zap,
    title: 'Automated Reminders',
    description: 'Email confirmations and reminders sent automatically. Reduce no-shows and keep your schedule running like clockwork.',
    stat: '-40% No-Shows',
    color: 'secondary'
  },
];

const STEPS_DATA = [
  { num: '01', title: 'Create Profile', desc: 'Set up your public provider page in seconds.', icon: Target },
  { num: '02', title: 'Define Slots', desc: 'Customize your availability window and service duration.', icon: Clock },
  { num: '03', title: 'Share Link', desc: 'Send your unique /p/{slug} to clients.', icon: Network },
  { num: '04', title: 'Get Booked', desc: 'Watch your calendar fill up automatically.', icon: Award },
];

// --- Main Component ---

export default function HomePage() {
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showMouseGlow, setShowMouseGlow] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const lastUpdateTime = useRef(0);

  // Optimized mouse tracking with improved throttling for smoother performance
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (prefersReducedMotion) return;
    
    const now = Date.now();
    // Reduced throttle to 8ms (~120fps) for smoother tracking
    if (now - lastUpdateTime.current < 8) return;
    
    lastUpdateTime.current = now;
    const { clientX, clientY } = e;
    
    requestAnimationFrame(() => {
      setMousePosition({ x: clientX, y: clientY });
      setShowMouseGlow(true);
    });
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setShowMouseGlow(false);
  }, []);

  // Memoized parallax transforms for performance
  const heroGridY = useTransform(scrollY, [0, 1000], [0, 300]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.2]);

  return (
    <div 
      className="min-h-screen bg-deep-charcoal text-foreground font-paragraph selection:bg-neon-teal selection:text-deep-charcoal overflow-x-clip" 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mouse Glow Effect - Performance Optimized */}
      {showMouseGlow && !prefersReducedMotion && <MouseGlow x={mousePosition.x} y={mousePosition.y} />}
      
      {/* Global Styles for Custom Effects - Ultra Enhanced */}
      <style>{`
        .neon-grid-bg {
          background-size: 50px 50px;
          background-image: linear-gradient(to right, rgba(0, 255, 212, 0.08) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 255, 212, 0.08) 1px, transparent 1px);
          mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 85%);
          will-change: transform;
          transform: translateZ(0);
        }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }

        .text-glow {
          text-shadow: 0 0 30px rgba(0, 255, 212, 0.7), 0 0 60px rgba(0, 255, 212, 0.5), 0 0 90px rgba(0, 255, 212, 0.3);
        }

        .neon-border {
          box-shadow: 0 0 25px rgba(0, 255, 212, 0.5), inset 0 0 25px rgba(0, 255, 212, 0.25);
        }

        .hover-lift {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease;
          will-change: transform;
          transform: translateZ(0);
        }

        .hover-lift:hover {
          transform: translateY(-18px) scale(1.04) rotateX(3deg) translateZ(0);
          box-shadow: 0 28px 55px rgba(0, 255, 212, 0.3);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg) translateZ(0); }
          33% { transform: translateY(-28px) rotate(4deg) translateZ(0); }
          66% { transform: translateY(-18px) rotate(-4deg) translateZ(0); }
        }

        .float-animation {
          animation: float 6.5s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 28px rgba(0, 255, 212, 0.45); }
          50% { box-shadow: 0 0 55px rgba(0, 255, 212, 0.75), 0 0 85px rgba(0, 255, 212, 0.35); }
        }

        .pulse-glow {
          animation: pulse-glow 2.2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: -1400px 0; }
          100% { background-position: 1400px 0; }
        }

        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(0, 255, 212, 0.18), transparent);
          background-size: 1400px 100%;
          animation: shimmer 3s infinite;
        }

        @keyframes data-flow {
          0% { transform: translateX(-100%) translateY(-100%) translateZ(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%) translateY(100%) translateZ(0); opacity: 0; }
        }

        .data-flow {
          animation: data-flow 1.8s ease-in-out infinite;
        }

        @keyframes wave {
          0%, 100% { transform: translateX(0) translateZ(0); }
          50% { transform: translateX(-50%) translateZ(0); }
        }

        .wave-animation {
          animation: wave 20s linear infinite;
        }

        /* Ultra Performance optimization */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          overscroll-behavior: none;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Hardware acceleration */
        .hw-accelerate {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-20 hw-accelerate">
        {/* Ultra-Dynamic Background with Enhanced Depth Layers */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-deep-charcoal via-deep-charcoal to-black" />
          <motion.div 
            className="absolute inset-0 neon-grid-bg opacity-70"
            style={{ 
              y: heroGridY,
              scale: heroScale
            }}
          />
          {/* Ultra-Enhanced Floating Orbs with Complex Motion */}
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[32rem] h-[32rem] bg-neon-teal/14 rounded-full blur-[140px]"
            animate={{ 
              x: [0, 70, -30, 0],
              y: [0, -70, 30, 0],
              scale: [1, 1.3, 1.1, 1]
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] bg-secondary/14 rounded-full blur-[160px]"
            animate={{ 
              x: [0, -50, 40, 0],
              y: [0, 50, -40, 0],
              scale: [1, 1.2, 1.15, 1]
            }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 w-[28rem] h-[28rem] bg-white/6 rounded-full blur-[120px]"
            animate={{ 
              x: [0, 40, -40, 0],
              y: [0, -40, 40, 0],
              scale: [1, 1.25, 1.15, 1]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
          {/* Ultra-Enhanced Floating Particles with Varied Motion */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-neon-teal/35"
              style={{
                width: `${2 + (i % 4)}px`,
                height: `${2 + (i % 4)}px`,
                left: `${5 + i * 5}%`,
                top: `${10 + (i % 6) * 15}%`
              }}
              animate={{
                y: [0, -60, 0],
                x: [0, Math.sin(i) * 30, 0],
                opacity: [0.2, 1, 0.2],
                scale: [1, 2, 1]
              }}
              transition={{
                duration: 5.5 + i * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
          ))}
          {/* Ultra-Enhanced Animated Rings with Complex Patterns */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`ring-${i}`}
              className="absolute top-1/2 left-1/2 border border-neon-teal/12 rounded-full"
              style={{
                width: `${280 + i * 200}px`,
                height: `${280 + i * 200}px`,
                marginLeft: `-${140 + i * 100}px`,
                marginTop: `-${140 + i * 100}px`
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.4, 0.1],
                rotate: [0, i % 2 === 0 ? 360 : -360]
              }}
              transition={{
                duration: 24 + i * 7,
                repeat: Infinity,
                ease: "linear",
                delay: i * 3
              }}
            />
          ))}
          {/* Wave Effect Overlay */}
          <motion.div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(0,255,212,0.05) 0%, transparent 70%)'
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Enhanced Mesh Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-neon-teal/6 via-transparent to-secondary/6 opacity-50" />
        </div>

        <div className="relative z-10 max-w-[120rem] w-full px-6 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 text-left">
            <AnimatedElement>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-teal/10 border border-neon-teal/20 text-neon-teal mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-teal opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-teal"></span>
                </span>
                <span className="text-sm font-heading font-medium tracking-wider uppercase">v2.0 Live System</span>
              </div>
            </AnimatedElement>
            
            <AnimatedElement delay={100}>
              <motion.h1 
                className="text-7xl md:text-8xl xl:text-9xl font-heading font-bold text-white leading-[0.9] tracking-tight mb-8"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                TíramE<span className="text-neon-teal text-glow">.</span><br />
                <motion.span 
                  className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50"
                  animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  Schedule
                </motion.span><br />
                <span className="italic font-light text-white/80">Smarter.</span>
              </motion.h1>
            </AnimatedElement>

            <AnimatedElement delay={200}>
              <p className="text-xl md:text-2xl font-paragraph text-light-gray/80 mb-12 max-w-2xl leading-relaxed">
                The future of appointment scheduling is here. Eliminate friction, reduce no-shows, and automate your workflow with a system designed for the modern provider.
              </p>
            </AnimatedElement>

            <AnimatedElement delay={300}>
              <div className="flex flex-col sm:flex-row gap-6">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/pro/dashboard"
                    className="group relative px-8 py-4 bg-neon-teal text-deep-charcoal font-heading font-bold text-lg rounded-lg overflow-hidden transition-all shadow-[0_0_30px_rgba(0,255,212,0.3)] hover:shadow-[0_0_50px_rgba(0,255,212,0.5)]"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    <span className="relative flex items-center gap-2">
                      Access Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/pro/dashboard"
                    className="px-8 py-4 bg-transparent border-2 border-white/20 text-white font-heading font-bold text-lg rounded-lg hover:bg-white/5 hover:border-neon-teal/50 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                  >
                    <Rocket className="w-5 h-5" />
                    View Demo
                  </Link>
                </motion.div>
              </div>
            </AnimatedElement>
          </div>

          {/* Hero Visual - Enhanced 3D Cards with Advanced Effects */}
          <div className="lg:col-span-5 relative h-[600px] hidden lg:block">
            <motion.div 
              className="absolute inset-0"
              initial={{ opacity: 0, x: 100, rotateY: -15 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1.2, delay: 0.5, type: "spring", stiffness: 80 }}
            >
              <div className="relative w-full h-full" style={{ perspective: '1800px' }}>
                {/* Abstract Cards Stack with Enhanced 3D Effect & Magnetic Hover */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute top-0 right-0 w-full aspect-[4/5] glass-panel rounded-2xl border-t border-l border-white/10 p-6 flex flex-col justify-between hover-lift overflow-hidden cursor-pointer"
                    style={{
                      zIndex: 3 - i,
                      top: i * 40,
                      right: i * 40,
                      scale: 1 - i * 0.05,
                      opacity: 1 - i * 0.2,
                      transformStyle: 'preserve-3d'
                    }}
                    animate={{
                      y: [0, -18, 0],
                      rotateY: [0, 10, 0],
                      rotateX: [0, 4, 0]
                    }}
                    transition={{
                      duration: 6,
                      delay: i * 0.6,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    whileHover={{
                      scale: 1.1,
                      rotateY: 18,
                      rotateX: 6,
                      z: 100,
                      transition: { duration: 0.4, type: "spring", stiffness: 300 }
                    }}
                  >
                    {/* Enhanced Shimmer Effect */}
                    <div className="absolute inset-0 shimmer pointer-events-none" />
                    
                    {/* Gradient Overlay on Hover */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-br from-neon-teal/10 via-transparent to-secondary/10 opacity-0 pointer-events-none"
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10">
                      <div className="h-3 w-24 bg-white/20 rounded-full" />
                      <div className="h-8 w-8 rounded-full bg-neon-teal/20 flex items-center justify-center pulse-glow">
                        <Clock className="w-4 h-4 text-neon-teal" />
                      </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                      <div className="h-2 w-full bg-white/10 rounded-full" />
                      <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                      <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                    </div>
                    <div className="flex gap-2 mt-auto relative z-10">
                      <div className="h-10 flex-1 bg-neon-teal rounded-md opacity-80" />
                      <div className="h-10 w-10 bg-white/10 rounded-md" />
                    </div>
                    
                    {/* Enhanced Hover Reveal Corner */}
                    <HoverRevealText 
                      text="Interactive"
                      className="absolute top-4 right-4 w-24 h-10 z-20"
                    />

                    {/* Corner Accent */}
                    <motion.div
                      className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-neon-teal/20 to-transparent rounded-bl-full opacity-0"
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator with Animation */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/50 cursor-pointer group"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.1 }}
        >
          <span className="text-xs font-heading tracking-widest uppercase group-hover:text-neon-teal transition-colors">Scroll to Explore</span>
          <div className="relative">
            <div className="w-[2px] h-16 bg-gradient-to-b from-neon-teal via-neon-teal/50 to-transparent" />
            <motion.div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-3 bg-neon-teal rounded-full"
              animate={{ y: [0, 48, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <motion.div
            className="w-6 h-6 border-2 border-neon-teal/30 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronRight className="w-3 h-3 text-neon-teal rotate-90" />
          </motion.div>
        </motion.div>
      </section>

      {/* --- INTERACTIVE DIAGRAM SECTION --- */}
      <PageTransition3D>
        <section className="py-32 px-6 bg-gradient-to-b from-deep-charcoal to-black/50">
          <div className="max-w-[120rem] mx-auto">
            <div className="text-center mb-20">
              <AnimatedElement>
                <h2 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6">
                  How It <span className="text-neon-teal">Works</span>
                </h2>
                <p className="text-xl text-light-gray/70 max-w-3xl mx-auto">
                  A seamless flow from booking to confirmation. Watch the magic happen in real-time.
                </p>
              </AnimatedElement>
            </div>

            {/* Booking Flow Diagram */}
            <AnimatedElement delay={200}>
              <BookingFlowDiagram />
            </AnimatedElement>

          {/* Interactive Flow Diagram */}
          <div className="relative mt-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {/* Connection Lines */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-teal/30 to-transparent -translate-y-1/2" />
              
              {[
                { icon: Users, title: 'Client Books', desc: 'Customer selects time slot', color: 'neon-teal' },
                { icon: Zap, title: 'Instant Lock', desc: 'Slot reserved in milliseconds', color: 'secondary' },
                { icon: CheckCircle2, title: 'Confirmation', desc: 'Email sent automatically', color: 'neon-teal' },
                { icon: Calendar, title: 'Synced', desc: 'Calendar updated everywhere', color: 'secondary' }
              ].map((step, index) => (
                <AnimatedElement key={index} delay={index * 150}>
                  <Card3D className="relative z-10">
                    <motion.div
                      className="group relative p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-neon-teal/50 transition-all cursor-pointer overflow-hidden"
                      whileHover={{ scale: 1.05 }}
                    >
                      {/* Shimmer on Hover */}
                      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Hover Reveal Text */}
                      <HoverRevealText 
                        text={`Step ${index + 1}`}
                        className="absolute top-2 right-2 w-20 h-8 z-10"
                      />
                      
                      <div className={`w-16 h-16 rounded-full bg-${step.color}/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform relative z-10`}>
                        <step.icon className={`w-8 h-8 text-${step.color}`} />
                      </div>
                      
                      <h3 className="text-xl font-heading font-bold text-white mb-3 text-center relative z-10">
                        {step.title}
                      </h3>
                      
                      <p className="text-light-gray/60 text-sm text-center relative z-10">
                        {step.desc}
                      </p>

                      {/* Animated Progress Indicator */}
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-1 bg-neon-teal/30 rounded-b-2xl"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </motion.div>
                  </Card3D>
                </AnimatedElement>
              ))}
            </div>
          </div>

          {/* Live Data Visualization with Enhanced Interactivity */}
          <AnimatedElement delay={600}>
            <div className="mt-20 p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <motion.div
                  className="w-full h-full"
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(0,255,212,0.3) 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                  }}
                  animate={{
                    backgroundPosition: ['0px 0px', '30px 30px']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                <div className="flex-1">
                  <h3 className="text-3xl font-heading font-bold text-white mb-4">
                    Real-Time Analytics
                  </h3>
                  <p className="text-light-gray/70 mb-6">
                    Monitor your booking performance with live metrics and insights.
                  </p>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: 'Bookings', value: '847', icon: TrendingUp },
                      { label: 'Revenue', value: '$12.4K', icon: BarChart3 },
                      { label: 'Clients', value: '234', icon: Network }
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        className="text-center p-4 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden cursor-pointer"
                        whileHover={{ 
                          scale: 1.05, 
                          borderColor: 'rgba(0, 255, 212, 0.3)',
                          boxShadow: '0 0 20px rgba(0, 255, 212, 0.2)'
                        }}
                      >
                        <div className="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity" />
                        <stat.icon className="w-6 h-6 text-neon-teal mx-auto mb-2 relative z-10" />
                        <motion.div 
                          className="text-2xl font-heading font-bold text-white mb-1 relative z-10"
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          {stat.value}
                        </motion.div>
                        <div className="text-xs text-light-gray/50 relative z-10">
                          {stat.label}
                        </div>
                        <HoverRevealText 
                          text="View Details"
                          className="absolute inset-0"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Enhanced Animated Chart Visualization */}
                <div className="flex-1 relative h-64">
                  <div className="absolute inset-0 flex items-end justify-around gap-4">
                    {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-neon-teal to-secondary rounded-t-lg relative cursor-pointer"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        whileHover={{ 
                          scale: 1.05,
                          filter: 'brightness(1.2)'
                        }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-white/20 rounded-t-lg"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>
      </PageTransition3D>

      {/* --- TICKER SECTION --- */}
      <section className="py-8 border-y border-white/5 bg-black/20 backdrop-blur-sm overflow-hidden">
        <div className="flex whitespace-nowrap">
          <motion.div 
            className="flex gap-16 items-center"
            animate={{ x: "-50%" }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-16 items-center">
                {["NEXT-GEN SCHEDULING", "ZERO CONFLICTS", "INSTANT SYNC", "GLOBAL TIMEZONES", "AUTOMATED FLOW", "SECURE DATA"].map((text, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-2xl font-heading font-bold text-white/20">{text}</span>
                    <div className="w-2 h-2 bg-neon-teal rounded-full" />
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- STICKY VALUE PROP SECTION --- */}
      <section className="relative py-32 px-6">
        <div className="max-w-[120rem] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Sticky Left Content */}
            <div className="relative h-full">
              <div className="sticky top-32">
                <AnimatedElement>
                  <h2 className="text-5xl md:text-7xl font-heading font-bold text-white mb-8">
                    Why <span className="text-neon-teal">TíramE</span>?
                  </h2>
                </AnimatedElement>
                <AnimatedElement delay={100}>
                  <p className="text-xl text-light-gray/80 mb-12 max-w-md">
                    We didn't just build a calendar. We engineered a complete time-management ecosystem for professionals who value precision.
                  </p>
                </AnimatedElement>
                <AnimatedElement delay={200}>
                  <div className="flex flex-col gap-4">
                    {['99.9% Uptime', 'Bank-Grade Security', '24/7 Support'].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-white/60">
                        <CheckCircle2 className="w-5 h-5 text-neon-teal" />
                        <span className="font-heading">{item}</span>
                      </div>
                    ))}
                  </div>
                </AnimatedElement>
              </div>
            </div>

            {/* Scrolling Right Content */}
            <div className="flex flex-col gap-8">
              {FEATURES_DATA.map((feature, index) => (
                <AnimatedElement key={index} delay={index * 100}>
                  <Card3D>
                    <div className="group relative p-1 bg-gradient-to-b from-white/10 to-transparent rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-neon-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative bg-deep-charcoal/90 backdrop-blur-xl p-8 rounded-xl h-full border border-white/5 group-hover:border-neon-teal/30 transition-colors">
                        {/* Hover Reveal in Corner */}
                        <HoverRevealText 
                          text="Learn More →"
                          className="absolute top-4 right-4 w-32 h-10 z-10"
                        />
                        
                        <div className="flex justify-between items-start mb-6">
                          <motion.div 
                            className="p-4 bg-white/5 rounded-lg text-neon-teal relative"
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <feature.icon className="w-8 h-8" />
                            <motion.div
                              className="absolute inset-0 bg-neon-teal/20 rounded-lg blur-xl"
                              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </motion.div>
                          <span className="text-xs font-heading font-bold text-white/30 border border-white/10 px-3 py-1 rounded-full">
                            {feature.stat}
                          </span>
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-white mb-4 group-hover:text-neon-teal transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-light-gray/60 leading-relaxed">
                          {feature.description}
                        </p>
                        
                        {/* Progress Bar */}
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-teal to-secondary"
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                          style={{ transformOrigin: 'left' }}
                        />
                      </div>
                    </div>
                  </Card3D>
                </AnimatedElement>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- PARALLAX IMAGE BREAK --- */}
      <section className="relative h-[80vh] w-full overflow-hidden my-24">
        <ParallaxImage 
          src="https://static.wixstatic.com/media/307f6c_6ac3f36a1ac74e75b8b5e34093679866~mv2.png?originWidth=1280&originHeight=704"
          alt="Abstract digital connection network visualization"
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-charcoal via-deep-charcoal/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-12 md:p-24">
          <div className="max-w-[120rem] mx-auto">
            <AnimatedElement>
              <h2 className="text-6xl md:text-8xl font-heading font-bold text-white max-w-4xl">
                Seamless <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-teal to-secondary">Connectivity</span>
              </h2>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (Horizontal Steps) --- */}
      <section className="py-32 px-6 bg-black/20">
        <div className="max-w-[120rem] mx-auto">
          <div className="mb-20 text-center">
            <AnimatedElement>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                Effortless Setup
              </h2>
              <p className="text-light-gray/60 max-w-2xl mx-auto">
                Go from zero to booked in four simple steps. No coding required.
              </p>
            </AnimatedElement>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS_DATA.map((step, index) => (
              <AnimatedElement key={index} delay={index * 150}>
                <Card3D className="relative h-full">
                  {/* Connector Line */}
                  {index < STEPS_DATA.length - 1 && (
                    <motion.div 
                      className="hidden lg:block absolute top-8 left-full w-full h-[1px] bg-white/10 -translate-x-8 z-0"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: index * 0.2 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  )}
                  
                  <div className="relative z-10 bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 hover:border-neon-teal/30 transition-all h-full cursor-pointer group overflow-hidden">
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Hover Reveal */}
                    <HoverRevealText 
                      text="✓ Complete"
                      className="absolute top-2 right-2 w-24 h-8 z-10"
                    />
                    
                    <motion.span 
                      className="block text-6xl font-heading font-bold text-white/5 mb-6 relative z-10"
                      whileHover={{ scale: 1.1, color: 'rgba(0, 255, 212, 0.1)' }}
                    >
                      {step.num}
                    </motion.span>
                    <h3 className="text-xl font-heading font-bold text-white mb-4 relative z-10 group-hover:text-neon-teal transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-light-gray/60 text-sm relative z-10">
                      {step.desc}
                    </p>

                    {/* Animated Sparkle on Hover */}
                    <motion.div
                      className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 z-10"
                      whileHover={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                      transition={{ duration: 0.6 }}
                    >
                      <Sparkles className="w-5 h-5 text-neon-teal" />
                    </motion.div>

                    {/* Progress Indicator */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-neon-teal/30 rounded-b-2xl"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: index * 0.15 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                </Card3D>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* --- LARGE FEATURE SHOWCASE --- */}
      <section className="py-32 px-6 overflow-hidden">
        <div className="max-w-[120rem] mx-auto">
          {/* Feature 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
            <AnimatedElement className="order-2 lg:order-1">
              <Card3D>
                <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 group">
                  <Image 
                    src="https://static.wixstatic.com/media/307f6c_218fa57912714e82aedd67e6403d4507~mv2.png?originWidth=768&originHeight=768"
                    alt="Provider Dashboard Interface"
                    width={800}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-deep-charcoal/80 to-transparent" />
                  
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Floating UI Element with Enhanced Hover Reveal */}
                  <motion.div 
                    className="absolute bottom-8 left-8 right-8 glass-panel p-6 rounded-xl"
                    whileHover={{ scale: 1.05, y: -10 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <HoverRevealText 
                      text="Interactive Dashboard"
                      className="absolute -top-8 left-0 right-0 h-8"
                    />
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white font-heading">Today's Schedule</span>
                      <span className="text-neon-teal text-sm flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-teal opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-teal"></span>
                        </span>
                        Live
                      </span>
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          whileHover={{ x: 5 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <motion.div 
                            className="w-2 h-2 rounded-full bg-green-500"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                          />
                          <div className="h-2 w-20 bg-white/20 rounded-full" />
                          <div className="h-2 w-12 bg-white/10 rounded-full ml-auto" />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </Card3D>
            </AnimatedElement>
            
            <div className="order-1 lg:order-2">
              <AnimatedElement>
                <div className="w-12 h-12 bg-neon-teal/10 rounded-xl flex items-center justify-center mb-8 text-neon-teal">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h2 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
                  Your Business,<br />
                  <span className="text-white/50">In Your Pocket.</span>
                </h2>
                <p className="text-xl text-light-gray/70 mb-8 leading-relaxed">
                  Manage your entire operation from a single, intuitive dashboard. Whether you're on desktop or mobile, TíramE gives you complete control over your availability, services, and client data.
                </p>
                <ul className="space-y-4 mb-10">
                  {['Mobile-First Design', 'Instant Notifications', 'One-Click Cancellations'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/80">
                      <div className="w-1.5 h-1.5 bg-neon-teal rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/pro/dashboard" className="text-neon-teal font-heading font-bold hover:text-white transition-colors inline-flex items-center gap-2">
                  Explore Dashboard <ChevronRight className="w-4 h-4" />
                </Link>
              </AnimatedElement>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <AnimatedElement>
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-8 text-secondary">
                  <Globe className="w-6 h-6" />
                </div>
                <h2 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
                  Global Reach,<br />
                  <span className="text-white/50">Local Time.</span>
                </h2>
                <p className="text-xl text-light-gray/70 mb-8 leading-relaxed">
                  Never worry about timezone math again. TíramE automatically detects your client's location and converts slots to their local time, ensuring everyone shows up when they're supposed to.
                </p>
                <div className="flex gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center min-w-[100px]">
                    <span className="block text-2xl font-heading font-bold text-white mb-1">NY</span>
                    <span className="text-xs text-white/50">09:00 AM</span>
                  </div>
                  <div className="flex items-center text-white/20">
                    <ArrowRight />
                  </div>
                  <div className="p-4 bg-neon-teal/10 rounded-xl border border-neon-teal/20 text-center min-w-[100px]">
                    <span className="block text-2xl font-heading font-bold text-neon-teal mb-1">LDN</span>
                    <span className="text-xs text-neon-teal/70">02:00 PM</span>
                  </div>
                </div>
              </AnimatedElement>
            </div>

            <AnimatedElement delay={200}>
              <Card3D>
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 group">
                  <Image 
                    src="https://static.wixstatic.com/media/307f6c_3f411236c14341eeafde988db141a9d3~mv2.png?originWidth=768&originHeight=768"
                    alt="Global Timezone Map"
                    width={800}
                    className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tl from-deep-charcoal via-transparent to-transparent" />
                  
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Enhanced Animated Dots on Map with Hover Reveals */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div 
                      key={i}
                      className="absolute w-3 h-3 bg-neon-teal rounded-full cursor-pointer z-10"
                      style={{
                        top: `${20 + i * 15}%`,
                        left: `${10 + i * 18}%`,
                        boxShadow: '0 0 20px rgba(0, 255, 212, 0.5)'
                      }}
                      whileHover={{ scale: 2.5 }}
                      animate={{
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        scale: {
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3
                        }
                      }}
                    >
                      <motion.div 
                        className="absolute inset-0 bg-neon-teal rounded-full animate-ping opacity-75"
                        animate={{
                          scale: [1, 2, 1],
                          opacity: [0.75, 0, 0.75]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                      <HoverRevealText 
                        text={`GMT+${i}`}
                        className="absolute -top-10 -left-8 w-20 h-8"
                      />
                    </motion.div>
                  ))}
                  
                  {/* Connection Lines Between Dots */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.line
                        key={i}
                        x1={`${10 + i * 18}%`}
                        y1={`${20 + i * 15}%`}
                        x2={`${10 + (i + 1) * 18}%`}
                        y2={`${20 + (i + 1) * 15}%`}
                        stroke="rgba(0, 255, 212, 0.3)"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, delay: i * 0.3 }}
                      />
                    ))}
                  </svg>
                </div>
              </Card3D>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-neon-teal/5 rounded-full blur-[150px] pointer-events-none" />
        
        {/* Floating Elements */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 bg-neon-teal/20 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${30 + (i % 2) * 40}%`
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2]
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2
            }}
          />
        ))}
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <AnimatedElement>
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 mb-8 backdrop-blur-md"
              whileHover={{ scale: 1.05, borderColor: 'rgba(0, 255, 212, 0.3)' }}
            >
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">Join 10,000+ Providers</span>
            </motion.div>
          </AnimatedElement>

          <AnimatedElement delay={100}>
            <motion.h2 
              className="text-6xl md:text-8xl font-heading font-bold text-white mb-8 tracking-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              Ready to <span className="text-neon-teal text-glow">Scale?</span>
            </motion.h2>
          </AnimatedElement>

          <AnimatedElement delay={200}>
            <p className="text-xl md:text-2xl text-light-gray/70 mb-12 max-w-2xl mx-auto">
              Stop trading time for administration. Start using the tool built for growth.
            </p>
          </AnimatedElement>

          <AnimatedElement delay={300}>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                to="/pro/dashboard"
                className="group px-10 py-5 bg-neon-teal text-deep-charcoal font-heading font-bold text-xl rounded-xl hover:bg-neon-teal/90 transition-all shadow-[0_0_30px_rgba(0,255,212,0.3)] hover:shadow-[0_0_50px_rgba(0,255,212,0.5)] relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative flex items-center gap-2">
                  Get Started Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </Link>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 px-6 border-t border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="max-w-[120rem] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neon-teal rounded-lg flex items-center justify-center font-heading font-bold text-deep-charcoal">
              T
            </div>
            <span className="text-xl font-heading font-bold text-white">TíramE</span>
          </div>
          
          <div className="flex gap-8 text-sm text-light-gray/50 font-paragraph">
            <Link to="#" className="hover:text-neon-teal transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-neon-teal transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-neon-teal transition-colors">Support</Link>
          </div>

          <p className="text-sm text-light-gray/30 font-paragraph">
            © 2025 TíramE. Engineered for excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}