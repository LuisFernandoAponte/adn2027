import React, { useState } from 'react';
import Hero from '../components/Hero';
import ServiceCard from '../components/ServiceCard';
import MechanicCard from '../components/MechanicCard';
import AgendarCitaLanding from '../components/AgendarCitaLanding';
import { motion } from 'framer-motion';
import {
  ArrowRight, Star, Shield, Clock, CalendarPlus, ChevronRight,
  CheckCircle2, Sparkles, Award, Phone, MapPin, Wrench, Activity, ShieldCheck, ThumbsUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import cambioAceiteImg from '../assets/services/cambio-aceite.jpg';
import frenosImg from '../assets/services/frenos.jpg';
import diagnosticoImg from '../assets/services/diagnostico.jpg';

import igorImg from '../assets/mechanics/igor.jpg';
import rodeiImg from '../assets/mechanics/rodei.jpg';
import davidImg from '../assets/mechanics/david.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 35 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const Index: React.FC = () => {
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'mantenimiento' | 'diagnostico' | 'frenos'>('todos');

  const featuredServices = [
    {
      title: "Cambio de Aceite & Filtros",
      category: "mantenimiento",
      description: "Servicio sintético de alta calidad con cambio de filtro de aceite, aire y revisión completa de 25 puntos de seguridad.",
      image: cambioAceiteImg,
      features: ["Aceites 100% sintéticos", "Filtros de especificación OEM", "Inspección de fluidez y niveles"]
    },
    {
      title: "Sistema de Frenos & Seguridad",
      category: "frenos",
      description: "Mantenimiento preventivo y rectificación de discos con sustitución de pastillas cerámicas de alto rendimiento.",
      image: frenosImg,
      features: ["Pastillas cerámicas bajo polvo", "Rectificado de precisión de discos", "Purga y cambio de líquido DOT4"]
    },
    {
      title: "Diagnóstico Computarizado OBD2",
      category: "diagnostico",
      description: "Escaneo avanzado de última generación para lectura de sensores, inyección electrónica, ABS y transmisión.",
      image: diagnosticoImg,
      features: ["Scanner multimarca profesional", "Reporte impreso de fallas", "Reset de testigo Check Engine"]
    }
  ];

  const filteredServices = selectedCategory === 'todos'
    ? featuredServices
    : featuredServices.filter(s => s.category === selectedCategory);

  const teamMembers = [
    {
      name: "Igor Andrés Bascope",
      title: "Jefe de Taller & Diagnóstico",
      experience: "7+ años de experiencia",
      phone: "77308697",
      image: igorImg,
      education: "Profesional Universidad UDI",
      specialties: ["Mecánica General", "Diagnóstico Avanzado", "Motores Diesel & Gasolina"]
    },
    {
      name: "Rodei Takeshi Omura",
      title: "Especialista en Electrónica & Frenos",
      experience: "5+ años de experiencia",
      phone: "69032703",
      image: rodeiImg,
      specialties: ["Sistema Eléctrico", "Frenos ABS & Estabilidad", "Transmisiones"]
    },
    {
      name: "David Eduardo Nogales",
      title: "Técnico en Suspensión & Alineación",
      experience: "4+ años de experiencia",
      phone: "69785432",
      image: davidImg,
      specialties: ["Alineación & Balanceo 3D", "Suspensión Deportiva", "Dirección Asistida"]
    }
  ];

  const pasosProceso = [
    {
      paso: "01",
      titulo: "Recepción & Check-In",
      desc: "Ingreso guiado del vehículo con registro de kilometraje, estado de carrocería e inventario inicial."
    },
    {
      paso: "02",
      titulo: "Diagnóstico Computarizado",
      desc: "Escaneo electrónico OBD2 e inspección de 25 puntos técnicos antes de enviar la cotización."
    },
    {
      paso: "03",
      titulo: "Reparación Especializada",
      desc: "Ejecución por mecánicos certificados utilizando repuestos de calidad garantizada y herramientas de precisión."
    },
    {
      paso: "04",
      titulo: "Prueba & Entrega Digital",
      desc: "Test drive de calidad, limpieza general y emisión de informe final junto con la factura digital."
    }
  ];

  const testimonios = [
    {
      nombre: "Carlos Mendoza",
      auto: "Toyota Hilux 2021",
      texto: "Excelente atención y transparencia total. El diagnóstico computarizado detectó exactamente la falla que otros talleres no encontraban.",
      estrellas: 5
    },
    {
      nombre: "Mariana Rocha",
      auto: "Suzuki Vitara 2020",
      texto: "Muy profesionales. Me enviaron el presupuesto detallado por WhatsApp y el auto estuvo listo exactamente a la hora acordada.",
      estrellas: 5
    },
    {
      nombre: "Roberto Siles",
      auto: "Nissan Frontier 2019",
      texto: "El equipo de Igor trabaja con repuestos de primera calidad. Definitivamente es mi taller de confianza para mantenimientos.",
      estrellas: 5
    }
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-500 selection:text-white">
      {/* 🏎️ Hero Section Principal */}
      <Hero />

      {/* 📊 Métricas de Confianza Destacadas */}
      <section className="py-12 bg-neutral-900/60 border-y border-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            {[
              { label: "Vehículos Atendidos", val: "1,200+", sub: "Clientes satisfechos" },
              { label: "Años de Experiencia", val: "7+ Años", sub: "Taller especializado" },
              { label: "Garantía en Trabajos", val: "100%", sub: "Respaldo y calidad" },
              { label: "Calificación Promedio", val: "4.9 / 5.0", sub: "Reseñas verificadas" }
            ].map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-neutral-950/60 border border-white/5 hover:border-red-500/30 transition-all duration-300">
                <span className="text-2xl md:text-4xl font-black font-mono text-red-500 block mb-1">{m.val}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200 block">{m.label}</span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">{m.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🛡️ Por qué elegir ADN Motors */}
      <section className="py-24 bg-neutral-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16 space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <span className="text-xs tracking-[0.25em] uppercase text-red-500 font-bold block">Diferencial Garantizado</span>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-100">
              ¿Por Qué Elegir <span className="text-red-500">ADN Motors</span>?
            </h2>
            <p className="text-base text-neutral-400 max-w-2xl mx-auto">
              Combina herramientas computarizadas de vanguardia con un equipo altamente calificado para el cuidado integral de tu auto.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: "Garantía Real & Repuestos OEM",
                desc: "Trabajamos únicamente con repuestos e insumos de especificación original para asegurar la longevidad de tu motor."
              },
              {
                icon: Award,
                title: "Mecánicos Certificados",
                desc: "Equipo técnico en constante capacitación con formación universitaria y especialización en sistemas electrónicos modernos."
              },
              {
                icon: Activity,
                title: "Diagnóstico Electrónico OBD2",
                desc: "Scanners profesionales multimarca para identificar fallas en sensores, inyección y transmisión antes de realizar reparaciones."
              }
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="p-8 rounded-3xl bg-neutral-900/80 border border-white/10 hover:border-red-500/40 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors pointer-events-none" />
                <div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 group-hover:bg-red-500 group-hover:text-white rounded-2xl w-14 h-14 mb-6 flex items-center justify-center transition-all duration-300 text-red-500">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-100 mb-3">{item.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs font-semibold text-red-400 group-hover:text-red-300">
                  <span>Conoce nuestros estándares</span>
                  <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🛠️ Servicios Destacados con Filtros */}
      <section id="servicios" className="py-24 bg-neutral-900/40 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <span className="text-xs tracking-[0.25em] uppercase text-red-500 font-bold block">Nuestro Expertise Especializado</span>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-100">
              Servicios <span className="text-red-500">Destacados</span>
            </h2>
            <p className="text-base text-neutral-400 max-w-2xl mx-auto">
              Mantenimientos preventivos, reparaciones de alta complejidad y soporte electrónico integral.
            </p>
          </motion.div>

          {/* Filtros de Categorías */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { id: 'todos', label: 'Todos los Servicios' },
              { id: 'mantenimiento', label: 'Mantenimiento Preventivo' },
              { id: 'frenos', label: 'Frenos & Suspensión' },
              { id: 'diagnostico', label: 'Diagnóstico & Scanner' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20'
                    : 'bg-neutral-900 text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {filteredServices.map((service, index) => (
              <ServiceCard
                key={service.title}
                title={service.title}
                description={service.description}
                image={service.image}
                features={service.features}
                index={index}
              />
            ))}
          </div>

          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-red-600/20 transition-all duration-300 group"
              onClick={() => window.location.href = '/servicios'}
            >
              Ver Catálogo Completo de Servicios
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 🔄 Proceso de Atención en 4 Pasos */}
      <section className="py-24 bg-neutral-950 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16 space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <span className="text-xs tracking-[0.25em] uppercase text-red-500 font-bold block">Transparencia Paso a Paso</span>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-100">
              ¿Cómo <span className="text-red-500">Trabajamos</span>?
            </h2>
            <p className="text-base text-neutral-400 max-w-2xl mx-auto">
              Un flujo claro de recepción, diagnóstico e informe digital para que siempre conozcas el estado real de tu auto.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pasosProceso.map((p, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-neutral-900/80 border border-white/10 relative overflow-hidden group hover:border-red-500/40 transition-all">
                <span className="text-4xl font-black font-mono text-red-500/20 group-hover:text-red-500/40 transition-colors block mb-4">
                  {p.paso}
                </span>
                <h3 className="text-lg font-bold text-neutral-100 mb-2">{p.titulo}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 👨‍🔧 Equipo de Mecánicos Especialistas */}
      <section className="py-24 bg-neutral-900/30 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16 space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <span className="text-xs tracking-[0.25em] uppercase text-red-500 font-bold block">Personal Técnico Calificado</span>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-100">
              Nuestro <span className="text-red-500">Equipo de Especialistas</span>
            </h2>
            <p className="text-base text-neutral-400 max-w-2xl mx-auto">
              Mecánicos certificados comprometidos con la precisión y la seguridad de tu vehículo.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {teamMembers.map((member, index) => (
              <MechanicCard
                key={member.name}
                name={member.name}
                title={member.title}
                experience={member.experience}
                phone={member.phone}
                image={member.image}
                specialties={member.specialties}
                education={member.education}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 💬 Testimonios & Reseñas de Clientes */}
      <section className="py-24 bg-neutral-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16 space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <span className="text-xs tracking-[0.25em] uppercase text-red-500 font-bold block">Opiniones Reales</span>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-100">
              Lo Que Dicen Nuestros <span className="text-red-500">Clientes</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonios.map((t, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-neutral-900 border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.estrellas)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-neutral-300 italic leading-relaxed">"{t.texto}"</p>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-neutral-100 block">{t.nombre}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">{t.auto}</span>
                  </div>
                  <BadgeDS_Verified />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 📍 Ubicación & Horarios */}
      <section className="py-24 bg-neutral-900/60 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs tracking-[0.25em] uppercase text-red-500 font-bold block">Ubicación & Contacto</span>
              <h2 className="text-3xl md:text-5xl font-black text-neutral-100">
                Visita Nuestras <span className="text-red-500">Instalaciones</span>
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Taller equipado con fosas técnicas, elevadores hidráulicos y espacio seguro para tu vehículo.
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 flex items-center gap-4">
                  <MapPin className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-sm text-neutral-100 block">Dirección Principal</span>
                    <span className="text-xs text-neutral-400">Santa Cruz, Bolivia • Fácil acceso y amplio parqueo</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 flex items-center gap-4">
                  <Clock className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-sm text-neutral-100 block">Horario de Atención</span>
                    <span className="text-xs text-neutral-400">Lunes a Viernes: 8:00 AM - 6:00 PM | Sábados: 8:00 AM - 3:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-neutral-950">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3798.886444444444!2d-63.1476593017578!3d-17.7203483581543!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDQzJzEzLjMiUyA2M8KwMDgnNTEuNiJX!5e0!3m2!1sen!2sbo!4v1623456789012!5m2!1sen!2sbo"
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Ubicación ADN Motors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 Call to Action Final */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-neutral-950 to-neutral-900 border-t border-white/5 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 space-y-6 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-black text-neutral-100">
            ¿Listo para Reservar el Servicio para tu <span className="text-red-500">Auto</span>?
          </h2>
          <p className="text-sm md:text-base text-neutral-400">
            Agenda tu cita en menos de 1 minuto y recibe atención técnica personalizada de primer nivel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-red-600/20 group"
              onClick={() => setShowAgendarModal(true)}
            >
              <CalendarPlus className="mr-2 h-5 w-5" />
              Agendar Cita Ahora
              <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              className="border-white/10 text-neutral-200 hover:bg-white/5 hover:text-white px-8 py-6 rounded-2xl"
              onClick={() => window.open('https://wa.me/59177308697', '_blank')}
            >
              <Phone className="mr-2 h-4 w-4 text-emerald-400" />
              Consultar por WhatsApp
            </Button>
          </div>
        </div>
      </section>

      <AgendarCitaLanding isOpen={showAgendarModal} onClose={() => setShowAgendarModal(false)} />
    </main>
  );
};

const BadgeDS_Verified = () => (
  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
    <CheckCircle2 className="h-3 w-3" /> Cliente Verificado
  </span>
);

export default Index;
