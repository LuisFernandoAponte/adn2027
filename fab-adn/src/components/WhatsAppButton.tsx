import React from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getMainWhatsAppURL } from '../lib/whatsapp';

const WhatsAppButton: React.FC = () => {
  const handleClick = () => {
    window.open(getMainWhatsAppURL(), '_blank');
  };

  return (
    <motion.button
      className="whatsapp-float"
      onClick={handleClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <MessageCircle className="h-6 w-6" />
    </motion.button>
  );
};

export default WhatsAppButton;