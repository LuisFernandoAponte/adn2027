import React from 'react';
import { motion } from 'framer-motion';
import ServiceCard from '../components/ServiceCard';

import cambioAceiteImg from '../assets/services/cambio-aceite.jpg';
import electricidadImg from '../assets/services/electricidad.jpg';
import frenosImg from '../assets/services/frenos.jpg';
import alineacionImg from '../assets/services/alineacion.jpg';
import mantenimientoImg from '../assets/services/mantenimiento.jpg';
import diagnosticoImg from '../assets/services/diagnostico.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const Servicios: React.FC = () => {
  const services = [
    {
      title: "Cambio de Aceite",
      description: "Servicio completo de cambio de aceite y filtros para mantener tu motor en óptimas condiciones.",
      image: cambioAceiteImg,
      features: ["Aceites de alta calidad", "Cambio de filtro incluido", "Revisión de niveles", "Servicio rápido"]
    },
    {
      title: "Sistema Eléctrico",
      description: "Diagnóstico y reparación de sistemas eléctricos automotrices con equipo especializado.",
      image: electricidadImg,
      features: ["Diagnóstico computarizado", "Reparación de alternadores", "Sistema de encendido", "Instalación de accesorios"]
    },
    {
      title: "Sistema de Frenos",
      description: "Mantenimiento y reparación completa del sistema de frenos para tu seguridad.",
      image: frenosImg,
      features: ["Cambio de pastillas", "Rectificado de discos", "Purga de líquido", "Revisión integral"]
    },
    {
      title: "Alineación y Balanceo",
      description: "Servicio profesional de alineación y balanceo para el máximo rendimiento de tus neumáticos.",
      image: alineacionImg,
      features: ["Alineación computarizada", "Balanceo de ruedas", "Ajuste de dirección", "Revisión de suspensión"]
    },
    {
      title: "Mantenimiento General",
      description: "Servicio integral de mantenimiento preventivo para prolongar la vida de tu vehículo.",
      image: mantenimientoImg,
      features: ["Revisión de 21 puntos", "Cambio de fluidos", "Inspección visual", "Reporte detallado"]
    },
    {
      title: "Diagnóstico Computarizado",
      description: "Diagnóstico avanzado con scanner automotriz para detectar fallas en sistemas electrónicos.",
      image: diagnosticoImg,
      features: ["Scanner OBD2 profesional", "Diagnóstico de motor", "Análisis de emisiones", "Reporte técnico"]
    }
  ];

  return (
    <main className="min-h-screen bg-background pt-20">
      <section className="py-20 section-gradient-dark relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-semibold mb-4 block">Servicios</span>
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4">
              Nuestros <span className="text-primary">Servicios</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Servicios especializados de mecánica automotriz con los más altos
              estándares de calidad y profesionalismo.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
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
        </div>
      </section>

      <section className="py-20 section-gradient-red relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            className="space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Necesitas algún servicio?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Contáctanos para agendar una cita o solicitar más información
              sobre nuestros servicios especializados.
            </p>
            <motion.button
              className="btn-hero"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/contacto'}
            >
              Contactar Ahora
            </motion.button>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default Servicios;
