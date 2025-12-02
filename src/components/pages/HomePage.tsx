// HPI 1.6-G
import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, Zap, ArrowRight, CheckCircle2, Shield, Smartphone, Globe, ChevronRight, Star } from 'lucide-react';
import { Image } from '@/components/ui/image';

// --- Utility Components ---

type AnimatedElementProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

const AnimatedElement: React.FC<AnimatedElementProps> = ({ children, className, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          element.classList.add('is-visible');
        }, delay);
        observer.unobserve(element);
      }
    }, { threshold: 0.1 });

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out opacity-0 translate-y-12 motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 [&.is-visible]:opacity-100 [&.is-visible]:translate-y-0 ${className || ''}`}
    >
      {children}
    </div>
  );
};

const ParallaxImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="w-full h-[120%] -mt-[10%]">
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

// --- Canonical Data Sources ---

const FEATURES_DATA = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Intelligent slot management prevents double-booking automatically. Our algorithm ensures your calendar is always conflict-free.',
    stat: '100% Conflict Free'
  },
  {
    icon: Clock,
    title: 'Real-time Updates',
    description: 'See availability instantly as appointments are booked. No page refreshes needed, just live, breathing data.',
    stat: '<50ms Latency'
  },
  {
    icon: Users,
    title: 'Client Management',
    description: 'Track appointments and client information effortlessly. Build a database of loyal customers with zero manual entry.',
    stat: 'Automated CRM'
  },
  {
    icon: Zap,
    title: 'Automated Reminders',
    description: 'Email confirmations and reminders sent automatically. Reduce no-shows and keep your schedule running like clockwork.',
    stat: '-40% No-Shows'
  },
];

const STEPS_DATA = [
  { num: '01', title: 'Create Profile', desc: 'Set up your public provider page in seconds.' },
  { num: '02', title: 'Define Slots', desc: 'Customize your availability window and service duration.' },
  { num: '03', title: 'Share Link', desc: 'Send your unique /p/{slug} to clients.' },
  { num: '04', title: 'Get Booked', desc: 'Watch your calendar fill up automatically.' },
];

// --- Main Component ---

export default function HomePage() {
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setMousePosition({ x: clientX, y: clientY });
  };

  return (
    <div className="min-h-screen bg-deep-charcoal text-foreground font-paragraph selection:bg-neon-teal selection:text-deep-charcoal overflow-x-clip" onMouseMove={handleMouseMove}>
      
      {/* Global Styles for Custom Effects */}
      <style>{`
        .neon-grid-bg {
          background-size: 50px 50px;
          background-image: linear-gradient(to right, rgba(0, 255, 212, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 255, 212, 0.05) 1px, transparent 1px);
          mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 80%);
        }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }

        .text-glow {
          text-shadow: 0 0 20px rgba(0, 255, 212, 0.3);
        }

        .neon-border {
          box-shadow: 0 0 10px rgba(0, 255, 212, 0.2), inset 0 0 10px rgba(0, 255, 212, 0.1);
        }
      `}</style>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-20">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-deep-charcoal" />
          <motion.div 
            className="absolute inset-0 neon-grid-bg opacity-50"
            style={{ 
              y: useTransform(scrollY, [0, 1000], [0, 200]),
              scale: 1.1
            }}
          />
          {/* Floating Orbs */}
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-teal/10 rounded-full blur-[100px]"
            animate={{ 
              x: [0, 50, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-secondary/10 rounded-full blur-[120px]"
            animate={{ 
              x: [0, -30, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
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
              <h1 className="text-7xl md:text-8xl xl:text-9xl font-heading font-bold text-white leading-[0.9] tracking-tight mb-8">
                TíramE<span className="text-neon-teal">.</span><br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Schedule</span><br />
                <span className="italic font-light text-white/80">Smarter.</span>
              </h1>
            </AnimatedElement>

            <AnimatedElement delay={200}>
              <p className="text-xl md:text-2xl font-paragraph text-light-gray/80 mb-12 max-w-2xl leading-relaxed">
                The future of appointment scheduling is here. Eliminate friction, reduce no-shows, and automate your workflow with a system designed for the modern provider.
              </p>
            </AnimatedElement>

            <AnimatedElement delay={300}>
              <div className="flex flex-col sm:flex-row gap-6">
                <Link
                  to="/pro/dashboard"
                  className="group relative px-8 py-4 bg-neon-teal text-deep-charcoal font-heading font-bold text-lg rounded-lg overflow-hidden transition-all hover:scale-105"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative flex items-center gap-2">
                    Access Dashboard <ArrowRight className="w-5 h-5" />
                  </span>
                </Link>
                <Link
                  to="/pro/dashboard"
                  className="px-8 py-4 bg-transparent border border-white/20 text-white font-heading font-bold text-lg rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                >
                  View Demo
                </Link>
              </div>
            </AnimatedElement>
          </div>

          {/* Hero Visual - Abstract Scheduler */}
          <div className="lg:col-span-5 relative h-[600px] hidden lg:block">
            <motion.div 
              className="absolute inset-0"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <div className="relative w-full h-full">
                {/* Abstract Cards Stack */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute top-0 right-0 w-full aspect-[4/5] glass-panel rounded-2xl border-t border-l border-white/10 p-6 flex flex-col justify-between"
                    style={{
                      zIndex: 3 - i,
                      top: i * 40,
                      right: i * 40,
                      scale: 1 - i * 0.05,
                      opacity: 1 - i * 0.2
                    }}
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 4,
                      delay: i * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <div className="h-3 w-24 bg-white/20 rounded-full" />
                      <div className="h-8 w-8 rounded-full bg-neon-teal/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-neon-teal" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-2 w-full bg-white/10 rounded-full" />
                      <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                      <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <div className="h-10 flex-1 bg-neon-teal rounded-md opacity-80" />
                      <div className="h-10 w-10 bg-white/10 rounded-md" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs font-heading tracking-widest uppercase">Scroll to Explore</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-neon-teal to-transparent" />
        </motion.div>
      </section>

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
                  <div className="group relative p-1 bg-gradient-to-b from-white/10 to-transparent rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-neon-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-deep-charcoal/90 backdrop-blur-xl p-8 rounded-xl h-full border border-white/5 group-hover:border-neon-teal/30 transition-colors">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-white/5 rounded-lg text-neon-teal group-hover:scale-110 transition-transform duration-300">
                          <feature.icon className="w-8 h-8" />
                        </div>
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
                    </div>
                  </div>
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
                <div className="relative h-full">
                  {/* Connector Line */}
                  {index < STEPS_DATA.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-[1px] bg-white/10 -translate-x-8 z-0" />
                  )}
                  
                  <div className="relative z-10 bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors h-full">
                    <span className="block text-6xl font-heading font-bold text-white/5 mb-6">
                      {step.num}
                    </span>
                    <h3 className="text-xl font-heading font-bold text-white mb-4">
                      {step.title}
                    </h3>
                    <p className="text-light-gray/60 text-sm">
                      {step.desc}
                    </p>
                  </div>
                </div>
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
              <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 group">
                <Image 
                  src="https://static.wixstatic.com/media/307f6c_218fa57912714e82aedd67e6403d4507~mv2.png?originWidth=768&originHeight=768"
                  alt="Provider Dashboard Interface"
                  width={800}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-deep-charcoal/80 to-transparent" />
                
                {/* Floating UI Element */}
                <div className="absolute bottom-8 left-8 right-8 glass-panel p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-heading">Today's Schedule</span>
                    <span className="text-neon-teal text-sm">Live</span>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="h-2 w-20 bg-white/20 rounded-full" />
                        <div className="h-2 w-12 bg-white/10 rounded-full ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/10">
                <Image 
                  src="https://static.wixstatic.com/media/307f6c_3f411236c14341eeafde988db141a9d3~mv2.png?originWidth=768&originHeight=768"
                  alt="Global Timezone Map"
                  width={800}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-tl from-deep-charcoal via-transparent to-transparent" />
                
                {/* Animated Dots on Map */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i}
                    className="absolute w-3 h-3 bg-neon-teal rounded-full"
                    style={{
                      top: `${20 + i * 15}%`,
                      left: `${10 + i * 18}%`,
                      boxShadow: '0 0 20px rgba(0, 255, 212, 0.5)'
                    }}
                  >
                    <div className="absolute inset-0 bg-neon-teal rounded-full animate-ping opacity-75" />
                  </div>
                ))}
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-neon-teal/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <AnimatedElement>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 mb-8 backdrop-blur-md">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">Join 10,000+ Providers</span>
            </div>
          </AnimatedElement>

          <AnimatedElement delay={100}>
            <h2 className="text-6xl md:text-8xl font-heading font-bold text-white mb-8 tracking-tight">
              Ready to <span className="text-neon-teal">Scale?</span>
            </h2>
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
                className="px-10 py-5 bg-neon-teal text-deep-charcoal font-heading font-bold text-xl rounded-xl hover:bg-neon-teal/90 transition-colors shadow-[0_0_30px_rgba(0,255,212,0.3)] hover:shadow-[0_0_50px_rgba(0,255,212,0.5)]"
              >
                Get Started Now
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