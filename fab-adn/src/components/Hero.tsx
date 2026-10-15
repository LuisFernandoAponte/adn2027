import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Wrench, CalendarPlus, Award, ShieldCheck, CheckCircle2, MessageSquare, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMainWhatsAppURL } from '../lib/whatsapp';
import heroImage from '../assets/hero-taller.jpg';
import AgendarCitaLanding from './AgendarCitaLanding';

const Hero: React.FC = () => {
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  const handleWhatsAppClick = () => {
    window.open(getMainWhatsAppURL('Hola! Me interesa conocer más sobre sus servicios de mecánica automotriz profesional.'), '_blank');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  };

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-20 bg-neutral-950">
      {/* Background Hero Image con Overlay Cinematográfico */}
      <motion.div className="absolute inset-0 z-0" style={{ y: backgroundY, scale }}>
        <img
          src={heroImage}
          alt="Taller mecánico profesional ADN Motors"
          className="w-full h-full object-cover object-center"
        />
        {/* Multilayer Overlay: Left Gradient Wall + Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-neutral-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/60" />
        <motion.div
          className="absolute inset-0 bg-neutral-950/30"
          style={{ opacity }}
        />
      </motion.div>

      {/* Ambient Radial Red Neon Glows */}
      <motion.div className="absolute inset-0 z-[1] pointer-events-none" style={{ opacity }}>
        <div className="absolute top-1/4 left-1/12 w-[500px] h-[500px] bg-red-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />
      </motion.div>

      {/* Grid Pattern Background overlay */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* Container Principal */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl" style={{ y: textY }}>
          <motion.div
            className="space-y-6 sm:space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Tagline Badge Superior */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 bg-neutral-900/90 border border-red-500/40 rounded-full px-4 py-1.5 backdrop-blur-md shadow-lg shadow-red-600/10">
                <Zap className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase">
                  ADN MOTORS • TALLER AUTOMOTRIZ DE PRECISIÓN
                </span>
              </div>
            </motion.div>

            {/* Titular Principal Triunfal */}
            <motion.div variants={itemVariants} className="space-y-3">
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05]">
                EXCELENCIA EN <br />
                <span className="bg-gradient-to-r from-red-500 via-red-500 to-amber-500 bg-clip-text text-transparent drop-shadow-xl">
                  MECÁNICA AUTOMOTRIZ
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-neutral-300 font-medium leading-relaxed max-w-2xl">
                Diagnóstico computarizado OBD2, mantenimientos de alta gama y reparaciones de precisión ejecutadas por mecánicos profesionales certificados.
              </p>
            </motion.div>

            {/* Botones de Acción (CTAs de Alto Impacto) */}
            <motion.div
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
              variants={itemVariants}
            >
              <Button
                onClick={() => setShowAgendarModal(true)}
                className="h-13 px-8 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-base rounded-2xl shadow-xl shadow-red-600/35 transition-all duration-300 group flex items-center justify-center gap-3 border border-red-500/50"
              >
                <CalendarPlus className="h-5 w-5" />
                <span>Agendar Cita Ahora</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1.5" />
              </Button>

              <Button
                onClick={handleWhatsAppClick}
                variant="outline"
                className="h-13 px-7 bg-neutral-900/80 border border-white/20 text-neutral-100 hover:text-white hover:bg-white/10 hover:border-emerald-500/50 font-bold text-sm rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 backdrop-blur-md shadow-lg"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span>WhatsApp Directo</span>
              </Button>
            </motion.div>

            {/* Tarjeta Flotante de Métricas & Garantía */}
            <motion.div
              className="pt-6 sm:pt-8"
              variants={itemVariants}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-neutral-900/90 border border-white/15 backdrop-blur-xl shadow-2xl">
                {[
                  { icon: Award, label: "Experiencia", val: "7+ Años", sub: "Taller certificado" },
                  { icon: ShieldCheck, label: "Atenciones", val: "1,200+", sub: "Autos atendidos" },
                  { icon: CheckCircle2, label: "Garantía", val: "100%", sub: "Respaldo escrito" },
                  { icon: Star, label: "Google Rating", val: "4.9 ★", sub: "Reseñas verificadas" }
                ].map((item, index) => (
                  <div key={index} className="p-3 rounded-2xl bg-neutral-950/60 border border-white/5 text-center">
                    <span className="text-xl sm:text-2xl font-black font-mono text-red-500 block">{item.val}</span>
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-wide block mt-0.5">{item.label}</span>
                    <span className="text-[10px] text-neutral-400 block">{item.sub}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Indicador Scroll Cinematográfico Sutil */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-2 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        style={{ opacity }}
      >
        <span className="text-[10px] tracking-[0.25em] font-mono uppercase text-neutral-400 font-semibold">
          EXPLORAR
        </span>
        <div className="w-[2px] h-9 bg-white/10 rounded-full overflow-hidden relative">
          <motion.div
            className="w-full h-1/2 bg-gradient-to-b from-red-500 to-red-600 rounded-full shadow-glow"
            animate={{ y: ["-100%", "200%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      <AgendarCitaLanding isOpen={showAgendarModal} onClose={() => setShowAgendarModal(false)} />
    </section>
  );
};

export default Hero;
