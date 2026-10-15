import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Phone, Award, Calendar, ShieldCheck, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMechanicWhatsAppURL } from '../lib/whatsapp';

interface MechanicCardProps {
  name: string;
  title: string;
  experience: string;
  phone?: string;
  image: string;
  specialties: string[];
  education?: string;
  index: number;
}

const MechanicCard: React.FC<MechanicCardProps> = ({
  name,
  title,
  experience,
  phone,
  image,
  specialties,
  education,
  index
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [4, -4]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-4, 4]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  const handleWhatsAppClick = () => {
    if (phone) {
      const message = `Hola ${name.split(' ')[0]}! Me interesa contactar con usted para servicios de mecánica automotriz.`;
      window.open(getMechanicWhatsAppURL(name, message), '_blank');
    }
  };

  return (
    <motion.div
      ref={ref}
      className="bg-neutral-900/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl hover:border-red-500/40 hover:shadow-red-600/10 transition-all duration-300 group flex flex-col justify-between"
      style={{ perspective: 1000, rotateX, rotateY }}
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div>
        <div className="relative overflow-hidden h-72 w-full bg-neutral-950">
          <img
            src={image}
            alt={`${name} - ${title}`}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-108 ${
              name.toLowerCase().includes('igor') ? 'object-[center_35%] scale-125' : 'object-top'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent pointer-events-none" />
          
          <div className="absolute top-4 right-4 bg-red-600/90 text-white border border-red-400/30 font-mono text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-red-600/30 backdrop-blur-md">
            {experience}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-black text-neutral-100 group-hover:text-red-400 transition-colors duration-300">
              {name}
            </h3>
            <p className="text-red-500 font-semibold text-xs uppercase tracking-wider mt-0.5">{title}</p>
          </div>

          {education && (
            <div className="flex items-center space-x-2 text-xs text-neutral-300 font-medium">
              <Award className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span>{education}</span>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Especializaciones Técnicas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {specialties.map((specialty, idx) => (
                <span
                  key={idx}
                  className="bg-neutral-800/90 text-neutral-200 px-2.5 py-1 rounded-xl text-xs font-medium border border-white/10"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0">
        {phone && (
          <Button
            onClick={handleWhatsAppClick}
            className="w-full h-11 bg-neutral-950 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-md"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Consultar con {name.split(' ')[0]}</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default MechanicCard;
