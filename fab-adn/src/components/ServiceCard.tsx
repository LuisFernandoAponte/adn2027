import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceCardProps {
  title: string;
  description: string;
  image: string;
  features: string[];
  index: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
  image,
  features,
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
        <div className="relative overflow-hidden h-52">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
          
          <div className="absolute top-4 left-4 bg-neutral-950/80 backdrop-blur-md border border-white/10 text-red-400 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-md">
            <Wrench className="h-3 w-3" />
            <span>Servicio Especializado</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="text-xl font-bold text-neutral-100 group-hover:text-red-400 transition-colors duration-300">
            {title}
          </h3>

          <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
            {description}
          </p>

          <ul className="space-y-2.5 pt-2 border-t border-white/5">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2.5 text-xs text-neutral-300">
                <CheckCircle2 className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="font-medium">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-6 pt-0">
        <Button
          variant="outline"
          className="w-full h-11 bg-red-600/10 border-red-500/30 text-neutral-200 hover:bg-red-600 hover:border-red-600 hover:text-white font-semibold rounded-2xl transition-all duration-300 group/btn flex items-center justify-center gap-2 text-xs"
          onClick={() => window.location.href = '/servicios'}
        >
          <span>Agendar Servicio</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
