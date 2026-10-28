// WhatsApp integration utilities for ADN Motors

export const WHATSAPP_NUMBERS = {
  main: '59177308697', // Igor's number as main contact
  igor: '59177308697',
  rodei: '59169032703'
};

export const formatWhatsAppNumber = (number: string): string => {
  return number.replace(/\D/g, '');
};

export const createWhatsAppURL = (number: string, message: string): string => {
  const formattedNumber = formatWhatsAppNumber(number);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
};

export const getMainWhatsAppURL = (message: string = ''): string => {
  const defaultMessage = message || `Hola ADN Motors! Me interesa información sobre sus servicios de mecánica automotriz.`;
  return createWhatsAppURL(WHATSAPP_NUMBERS.main, defaultMessage);
};

export const getMechanicWhatsAppURL = (mechanicName: string, message: string = ''): string => {
  let number: string;
  let defaultMessage: string;

  switch (mechanicName.toLowerCase()) {
    case 'igor':
    case 'igor andrés bascope':
      number = WHATSAPP_NUMBERS.igor;
      defaultMessage = message || `Hola Igor! Me interesa contactar con usted para servicios de mecánica automotriz.`;
      break;
    case 'rodei':
    case 'rodei takeshi omura':
      number = WHATSAPP_NUMBERS.rodei;
      defaultMessage = message || `Hola Rodei! Me interesa contactar con usted para servicios de mecánica automotriz.`;
      break;
    default:
      number = WHATSAPP_NUMBERS.main;
      defaultMessage = message || `Hola ADN Motors! Me interesa información sobre sus servicios.`;
  }

  return createWhatsAppURL(number, defaultMessage);
};

export const createContactMessage = (name: string, phone: string, service: string): string => {
  return `Hola ADN Motors!

Mi nombre es: ${name}
Teléfono: ${phone}
Servicio solicitado: ${service}

Me gustaría agendar una cita. ¿Cuándo tienen disponibilidad?

Gracias!`;
};

export const openWhatsApp = (options: { phoneNumber?: string; message?: string }) => {
  const num = options.phoneNumber || WHATSAPP_NUMBERS.main;
  const url = createWhatsAppURL(num, options.message || '');
  window.open(url, '_blank');
};