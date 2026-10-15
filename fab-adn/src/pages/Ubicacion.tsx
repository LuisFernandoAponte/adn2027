import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMainWhatsAppURL } from '../lib/whatsapp';

const Ubicacion: React.FC = () => {
  const googleMapsUrl = "https://www.google.com/maps?q=-17.7203483581543,-63.1476593017578";

  return (
    <main className="min-h-screen bg-background pt-20">
      {/* Header */}
      <section className="py-16 bg-gradient-to-b from-secondary to-background">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4">
              Nuestra <span className="text-primary">Ubicación</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Encuéntranos en Santa Cruz, Bolivia. Fácil acceso y amplio espacio 
              para el servicio de tu vehículo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Map */}
            <motion.div
              className="card-adn overflow-hidden"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3798.886444444444!2d-63.1476593017578!3d-17.7203483581543!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDQzJzEzLjMiUyA2M8KwMDgnNTEuNiJX!5e0!3m2!1sen!2sbo!4v1623456789012!5m2!1sen!2sbo"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación ADN Motors"
                className="rounded-xl"
              />
              
              <div className="p-6">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.open(googleMapsUrl, '_blank')}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Abrir en Google Maps
                </Button>
              </div>
            </motion.div>

            {/* Location Info */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Address */}
              <div className="card-adn">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary/20 rounded-full flex-shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Dirección del Taller
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Santa Cruz de la Sierra, Bolivia
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Coordenadas: -17.7203483581543, -63.1476593017578
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="card-adn">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary/20 rounded-full flex-shrink-0">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">
                        Horarios de Atención
                      </h3>
                      <div className="space-y-2 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Lunes a Viernes:</span>
                          <span className="font-medium">7:00 AM – 6:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sábados:</span>
                          <span className="font-medium">7:00 AM – 3:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Domingos:</span>
                          <span className="font-medium text-primary">Cerrado</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="card-adn">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary/20 rounded-full flex-shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-3">
                        Contacto Directo
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Llámanos antes de venir para confirmar disponibilidad 
                        o agenda una cita por WhatsApp.
                      </p>
                      <div className="space-y-3">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => window.open(getMainWhatsAppURL('Hola! Me gustaría agendar una cita en su taller. ¿Cuándo tienen disponibilidad?'), '_blank')}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          +591 77308697 (WhatsApp)
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-primary/50 text-foreground hover:bg-primary/10"
                          onClick={() => window.open('tel:+59177308697')}
                        >
                          Llamar Directamente
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Directions Section */}
      <section className="py-16 bg-gradient-to-r from-secondary to-card">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Cómo Llegar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Estamos ubicados en una zona de fácil acceso con amplio espacio 
              para estacionamiento.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              className="card-adn"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Acceso en Vehículo
                </h3>
                <p className="text-muted-foreground">
                  Contamos con amplias instalaciones y fácil acceso para vehículos 
                  de todos los tamaños. Estacionamiento disponible.
                </p>
              </div>
            </motion.div>

            <motion.div
              className="card-adn"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Transporte Público
                </h3>
                <p className="text-muted-foreground">
                  Ubicación accesible desde el centro de la ciudad. 
                  Consulta las mejores rutas usando Google Maps.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Ubicacion;