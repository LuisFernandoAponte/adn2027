import React from 'react';
import { MapPin, Phone, Mail, Clock, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { getMainWhatsAppURL } from '../lib/whatsapp';

const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-2">
              <span className="adn-logo text-2xl font-black tracking-wider">
                ADN
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                MOTORS
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              ADN es un taller especializado en servicios automotrices profesionales. 
              Todas las atenciones son realizadas por personal calificado.
            </p>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-foreground">Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Santa Cruz, Bolivia
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary" />
                <a 
                  href={getMainWhatsAppURL()}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  +591 77308697
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-primary" />
                <a 
                  href="mailto:info@adnmotors.com"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  adnmotors2023@gmail.com
                </a>
              </div>
            </div>
          </motion.div>

          {/* Hours */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-foreground">Horarios</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-primary" />
                <div className="text-sm text-muted-foreground">
                  <p>Lunes a Viernes: 8:00 – 6:00 PM</p>
                  <p>Sábados: 8:00 – 3:00 PM</p>
                  <p>Domingos: Cerrado</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-sm text-muted-foreground">
            © 2024 Fernando Aponte – Derechos de autor. ADN Motors.
          </p>
          <p className="text-xs text-muted-foreground text-center md:text-right">
            ADN es un taller especializado. Todas las atenciones son realizadas por personal calificado.
          </p>
          <div className="flex space-x-4">
            <a 
              href="https://www.facebook.com/share/198aQvV65q/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Facebook className="w-6 h-6" />
            </a>
            <a 
              href="#"  // URL de TikTok pendiente
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {/* SVG temporal para TikTok */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 2C9 2 9 14 15 14C15 14 15 6 21 6C21 6 21 2 15 2H9Z" />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
