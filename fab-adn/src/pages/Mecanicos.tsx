import React from 'react';
import { motion } from 'framer-motion';
import MechanicCard from '../components/MechanicCard';

import igorImg from '../assets/mechanics/igor.jpg';
import rodeiImg from '../assets/mechanics/rodei.jpg';
import davidImg from '../assets/mechanics/david.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const Mecanicos: React.FC = () => {
  const mechanics = [
    {
      name: "Igor Andrés Bascope",
      title: "Jefe de Taller",
      experience: "7 años",
      phone: "77308697",
      image: igorImg,
      education: "Profesional de la Universidad UDI",
      specialties: ["Mecánica General", "Diagnóstico Avanzado", "Motores Diesel", "Sistemas de Inyección"]
    },
    {
      name: "Rodei Takeshi Omura",
      title: "Mecánico Automotriz",
      experience: "5 años",
      phone: "69032703",
      image: rodeiImg,
      specialties: ["Sistema Eléctrico", "Frenos", "Transmisión", "Aire Acondicionado"]
    },
    {
      name: "David Eduardo Nogales Vaca",
      title: "Mecánico Especializado",
      experience: "4 años",
      phone: "69785432",
      image: davidImg,
      specialties: ["Alineación y Balanceo", "Suspensión", "Dirección", "Mantenimiento Preventivo"]
    }
  ];

  return (
    <main className="min-h-screen bg-background pt-20">
      <section className="py-20 section-gradient-dark relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-semibold mb-4 block">Profesionales</span>
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4">
              Nuestro <span className="text-primary">Equipo</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Mecánicos profesionales especializados con años de experiencia
              en el cuidado de tu vehículo.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mechanics.map((mechanic, index) => (
              <MechanicCard
                key={mechanic.name}
                name={mechanic.name}
                title={mechanic.title}
                experience={mechanic.experience}
                phone={mechanic.phone}
                image={mechanic.image}
                specialties={mechanic.specialties}
                education={mechanic.education}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 section-gradient-red relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-semibold mb-4 block">Trayectoria</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Experiencia que <span className="text-primary">Respalda</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nuestro equipo cuenta con la formación y experiencia necesaria
              para brindar el mejor servicio.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { value: "16+", label: "Años de Experiencia Combinada", desc: "Conocimiento acumulado en diversas marcas y modelos de vehículos." },
              { value: "100%", label: "Personal Calificado", desc: "Todos nuestros mecánicos cuentan con formación profesional especializada." },
              { value: "500+", label: "Vehículos Atendidos", desc: "Clientes satisfechos que confían en nuestro trabajo profesional." }
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="text-center space-y-4 p-8 card-adn"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="text-5xl font-black text-gradient-red">{item.value}</div>
                <div className="text-lg font-bold text-foreground">{item.label}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 section-gradient-dark">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            className="space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Contacta a Nuestros <span className="text-primary">Expertos</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Habla directamente con nuestros mecánicos especializados
              para resolver tus dudas técnicas.
            </p>
            <motion.button
              className="btn-hero"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/contacto'}
            >
              Contactar Equipo
            </motion.button>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default Mecanicos;
