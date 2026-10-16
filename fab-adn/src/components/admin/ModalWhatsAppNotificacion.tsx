import React, { useState, useEffect } from "react";
import {
  MessageCircle, Send, Copy, Check, X, Car, Wrench, Clock, ShieldCheck,
  AlertTriangle, DollarSign, Sparkles, Phone, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { currencyFormatter } from "@/features/empleado/stateMachine";

export interface ModalWhatsAppProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  trabajo?: any;
  clienteNombre?: string;
  clienteTelefono?: string;
  vehiculo?: string;
  placa?: string;
  codigoOT?: string;
  total?: number;
  servicio?: string;
  templateDefault?: "recepcion" | "diagnostico" | "progreso" | "listo" | "garantia" | "preventivo";
}

export const ModalWhatsAppNotificacion: React.FC<ModalWhatsAppProps> = ({
  open,
  isOpen,
  onClose,
  trabajo,
  clienteNombre: propNombre,
  clienteTelefono: propTelefono,
  vehiculo: propVehiculo,
  placa: propPlaca,
  codigoOT: propCodigoOT,
  total: propTotal,
  servicio: propServicio,
  templateDefault = "listo",
}) => {
  const visible = open ?? isOpen ?? false;
  const clienteNombre = trabajo?.cliente || propNombre || "Estimado cliente";
  const clienteTelefono = trabajo?.cliente_telefono || propTelefono || "70000000";
  const vehiculo = trabajo?.vehiculo || (trabajo?.vehiculo_marca ? `${trabajo.vehiculo_marca} ${trabajo.vehiculo_modelo}` : propVehiculo) || "Vehículo";
  const placa = (trabajo?.placa && trabajo.placa !== "SIN PLACA") ? trabajo.placa : (propPlaca || "4829-KLS");
  const codigoOT = trabajo?.id ? `OT-${String(trabajo.id).slice(-4).toUpperCase()}` : (propCodigoOT || "OT-001");
  const total = Number(trabajo?.costo_total ?? propTotal ?? 650);
  const servicio = trabajo?.servicio || propServicio || "Mantenimiento General";

  const { toast } = useToast();
  const [templateSeleccionado, setTemplateSeleccionado] = useState<string>(templateDefault);
  const [mensaje, setMensaje] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  // Limpiar teléfono
  const cleanPhone = (clienteTelefono || "").replace(/\D/g, "");

  // Generar textos de plantilla
  const generarTexto = (tipo: string): string => {
    switch (tipo) {
      case "recepcion":
        return `¡Hola ${clienteNombre}! 👋 Le saludamos desde *ADN Motors Taller Especializado*.\n\n🚗 Le confirmamos que su vehículo *${vehiculo}* [Placa: *${placa}*] ha ingresado a nuestras instalaciones con la *Orden de Trabajo #${codigoOT}*.\n\n🛠️ Servicios a realizar: *${servicio}*.\n\nNuestros técnicos especialistas ya están preparando la bahía de trabajo. Le mantendremos informado de cualquier novedad. ¡Muchas gracias por su confianza! 🔧`;

      case "diagnostico":
        return `¡Hola ${clienteNombre}! 👋 Desde *ADN Motors* le informamos que completamos el diagnóstico técnico de su *${vehiculo}* [Placa: *${placa}*].\n\n📋 *Evaluación Técnica:* Se requiere realizar *${servicio}*.\n💰 *Presupuesto Estimado:* *${currencyFormatter.format(total)}* (incluye mano de obra calificada y repuestos de alta calidad).\n\n¿Nos confirma si aprueba dar inicio a la reparación? Quedamos a su pronta respuesta. 📲`;

      case "progreso":
        return `¡Hola ${clienteNombre}! ⚙️ Le informamos que su *${vehiculo}* [Placa: *${placa}*] se encuentra actualmente *en reparación activa* en bahía con nuestros mecánicos especialistas.\n\nEstamos aplicando los más altos estándares de control de calidad. Le avisaremos en cuanto esté en etapa final de pruebas y listo para entrega. 🚗💨`;

      case "listo":
        return `¡Buenas noticias ${clienteNombre}! 🎉 Le confirmamos desde *ADN Motors* que su *${vehiculo}* [Placa: *${placa}*] ya está *100% LISTO* para su entrega.\n\n💵 *Total a cancelar:* *${currencyFormatter.format(total)}*\n💳 *Métodos de pago:* Efectivo, Transferencia o QR Simple.\n📍 *Horario de atención:* Lunes a Viernes de 08:00 a 18:30 y Sábados de 08:00 a 13:00.\n\n¡Le esperamos para la entrega y verificación de su vehículo! 🏁`;

      case "garantia":
        return `¡Muchas gracias por su visita ${clienteNombre}! ⭐ Ha sido un placer atender a su *${vehiculo}* [Placa: *${placa}*] en *ADN Motors*.\n\n🛡️ *Garantía Oficial:* Su servicio cuenta con *90 días de garantía (o 5,000 km)* tanto en mano de obra como en repuestos instalados.\n\nCualquier duda o consulta, nuestro equipo técnico está a su completa disposición. ¡Buen viaje! 🚗✨`;

      case "preventivo":
        return `¡Hola ${clienteNombre}! 🚗 Le saludamos cordialmente desde *ADN Motors Taller*.\n\n⏰ Notamos que a su *${vehiculo}* [Placa: *${placa}*] le corresponde su próximo *Mantenimiento Preventivo (${servicio})* para proteger la vida útil de su motor y componentes de seguridad.\n\n¿Le gustaría que le agendemos un horario preferencial disponible esta semana para su atención rápida? ¡Consúltenos sin compromiso! 📲`;

      default:
        return "";
    }
  };

  useEffect(() => {
    setTemplateSeleccionado(templateDefault);
    setMensaje(generarTexto(templateDefault));
  }, [templateDefault, clienteNombre, vehiculo, placa, codigoOT, total, servicio, open]);

  const handleCambiarTemplate = (tipo: string) => {
    setTemplateSeleccionado(tipo);
    setMensaje(generarTexto(tipo));
  };

  const handleCopiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      toast({
        title: "¡Mensaje Copiado!",
        description: "El texto se copió al portapapeles listo para pegar en WhatsApp.",
      });
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast({
        title: "Error al copiar",
        description: "Copia el mensaje manualmente seleccionándolo.",
        variant: "destructive",
      });
    }
  };

  const handleAbrirWhatsApp = () => {
    if (!cleanPhone || cleanPhone.length < 7) {
      toast({
        title: "Teléfono no válido",
        description: "El cliente no tiene un número celular registrado para WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    const encodedText = encodeURIComponent(mensaje);
    const url = `https://wa.me/591${cleanPhone}?text=${encodedText}`;
    window.open(url, "_blank");

    toast({
      title: "Abriendo WhatsApp...",
      description: `Redirigiendo al chat de WhatsApp con ${clienteNombre}.`,
    });
    onClose();
  };

  return (
    <Dialog open={visible} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl bg-neutral-900 border border-white/10 text-neutral-100 p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <span>Notificación Inteligente por WhatsApp</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    Directo
                  </span>
                </DialogTitle>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Destinatario: <strong className="text-neutral-200">{clienteNombre}</strong> (+591 {cleanPhone}) · Placa: <strong className="text-amber-400 font-mono">{placa}</strong>
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selector de Plantillas Rápidas */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Seleccionar Momento / Plantilla
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "recepcion", label: "🚗 Recepción OT", color: "hover:border-blue-500" },
                { id: "diagnostico", label: "🔍 Diagnóstico / Costo", color: "hover:border-amber-500" },
                { id: "progreso", label: "⚙️ En Reparación", color: "hover:border-yellow-500" },
                { id: "listo", label: "🏁 Auto Listo & Cobro", color: "hover:border-emerald-500" },
                { id: "garantia", label: "🛡️ Garantía 90 Días", color: "hover:border-purple-500" },
                { id: "preventivo", label: "⏰ Mantenimiento Prev.", color: "hover:border-cyan-500" },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleCambiarTemplate(tpl.id)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                    templateSeleccionado === tpl.id
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm"
                      : `bg-neutral-950 border-white/5 text-neutral-400 ${tpl.color}`
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editor del Mensaje */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-neutral-400 uppercase tracking-wider">
                Mensaje a Enviar (Personalizable)
              </span>
              <span className="text-neutral-500 font-mono text-[10px]">
                {mensaje.length} caracteres
              </span>
            </div>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={6}
              className="w-full p-3.5 rounded-2xl bg-neutral-950 border border-white/10 text-neutral-200 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
              placeholder="Escribe el mensaje..."
            />
          </div>

          {/* Tarjeta de Datos Rápidos del Vehículo */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Car className="h-4 w-4 text-neutral-500" />
              <span>{vehiculo}</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              Total: {currencyFormatter.format(total)}
            </span>
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopiarMensaje}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-white/10 text-neutral-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copiado ? "¡Copiado!" : "Copiar Texto"}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleAbrirWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Abrir en WhatsApp</span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
