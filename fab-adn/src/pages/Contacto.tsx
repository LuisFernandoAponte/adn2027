import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, Mail, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createContactMessage, getMainWhatsAppURL } from '../lib/whatsapp';
import { useToast } from '@/hooks/use-toast';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const Contacto: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.message) {
      toast({ title: "Campos incompletos", description: "Por favor complete todos los campos requeridos", variant: "destructive" });
      return;
    }
    const whatsappMessage = createContactMessage(formData.name, formData.phone, formData.message);
    window.open(getMainWhatsAppURL(whatsappMessage), '_blank');
    toast({ title: "Redirigiendo a WhatsApp", description: "Se abrirá WhatsApp con su mensaje prellenado" });
  };

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
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-semibold mb-4 block">Comunicación</span>
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4">
              <span className="text-primary">Contáctanos</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Estamos aquí para ayudarte con todos tus servicios automotrices.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <motion.div
              className="card-adn"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Envíanos un Mensaje
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name">Nombre Completo *</Label>
                    <Input id="name" name="name" type="text" placeholder="Tu nombre completo" value={formData.name} onChange={handleInputChange} className="mt-1.5" required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono/WhatsApp *</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="70123456" value={formData.phone} onChange={handleInputChange} className="mt-1.5" required />
                  </div>
                  <div>
                    <Label htmlFor="message">Mensaje *</Label>
                    <Textarea id="message" name="message" placeholder="Describe el servicio que necesitas..." value={formData.message} onChange={handleInputChange} className="mt-1.5 min-h-[120px]" required />
                  </div>
                  <Button type="submit" className="w-full btn-hero group">
                    <Send className="mr-2 h-4 w-4" />
                    Enviar por WhatsApp
                  </Button>
                </form>
              </div>
            </motion.div>

            <motion.div
              className="space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
            >
              {[
                {
                  icon: Phone,
                  title: "Teléfono",
                  content: "+591 77308697",
                  action: { label: "Llamar por WhatsApp", className: "bg-green-600 hover:bg-green-700", onClick: () => window.open(getMainWhatsAppURL(), '_blank') }
                },
                {
                  icon: Mail,
                  title: "Email",
                  content: "adnmotors2023@gmail.com",
                  action: { label: "Enviar Email", className: "border-primary/30 text-foreground hover:bg-primary/10", onClick: () => window.open('mailto:adnmotors2023@gmail.com', '_blank') }
                },
                {
                  icon: Clock,
                  title: "Horarios",
                  content: ["Lunes a Viernes: 7:00–18:00", "Sábados: 7:00–15:00", "Domingos: Cerrado"],
                  action: null
                }
              ].map((item, i) => (
                <div key={i} className="card-adn">
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        {Array.isArray(item.content) ? (
                          <div className="text-muted-foreground text-sm space-y-0.5">
                            {item.content.map((line, j) => (
                              <p key={j}>{line}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">{item.content}</p>
                        )}
                      </div>
                    </div>
                    {item.action && (
                      <Button className={`w-full ${item.action.className}`} onClick={item.action.onClick}>
                        {item.action.label}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 section-gradient-red">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            className="space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Prefieres venir directamente?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Visita nuestro taller y conoce a nuestro equipo de mecánicos especializados.
            </p>
            <motion.button
              className="btn-hero"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/ubicacion'}
            >
              Ver Ubicación
            </motion.button>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default Contacto;
