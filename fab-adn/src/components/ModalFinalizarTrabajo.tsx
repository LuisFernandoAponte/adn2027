import React, { useState, useEffect } from "react";
import {
  CheckCircle2, Camera, Upload, Trash2, Printer, FileText,
  Wrench, ShieldCheck, DollarSign, AlertCircle, X, Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { subirFotoTrabajo, cambiarEstadoCita, type Trabajo } from "@/api/citaApi";
import { currencyFormatter, getCodigoOT } from "@/features/empleado/stateMachine";

interface ModalFinalizarTrabajoProps {
  isOpen: boolean;
  onClose: () => void;
  trabajo: Trabajo | null;
  nuevoEstado: "Completado" | "Entregado";
  onTrabajoFinalizado: (citaId: string, generarFacturaDirecta?: boolean) => void;
}

export const ModalFinalizarTrabajo: React.FC<ModalFinalizarTrabajoProps> = ({
  isOpen,
  onClose,
  trabajo,
  nuevoEstado,
  onTrabajoFinalizado
}) => {
  const { toast } = useToast();
  const [fotosList, setFotosList] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [observacionesFinales, setObservacionesFinales] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Quality Assurance Checks
  const [checkMecanica, setCheckMecanica] = useState(true);
  const [checkRepuestosViejos, setCheckRepuestosViejos] = useState(true);
  const [checkPruebaRuta, setCheckPruebaRuta] = useState(true);

  useEffect(() => {
    if (trabajo) {
      setFotosList(trabajo.fotos || []);
      setObservacionesFinales(trabajo.observaciones || "Reparación concluida en conformidad con las normas de calidad del taller.");
    }
  }, [trabajo]);

  if (!isOpen || !trabajo) return null;

  const codigoOT = getCodigoOT(trabajo.id);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Archivo muy pesado", description: "El tamaño máximo permitido es 8 MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Str = reader.result as string;
      setSubiendoFoto(true);
      try {
        const token = getToken();
        const res = await subirFotoTrabajo(token!, trabajo.id, base64Str);
        if (res.success) {
          setFotosList(res.fotos);
          toast({ title: "Foto Adjuntada", description: "Evidencia de repuesto/trabajo subida a Cloudinary" });
        }
      } catch (err: any) {
        toast({ title: "Error al subir foto", description: err.response?.data?.error || err.message, variant: "destructive" });
      } finally {
        setSubiendoFoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmarFinalizacion = async (generarFactura = false) => {
    setGuardando(true);
    try {
      const token = getToken();
      const obsTexto = `[Control Calidad OK] ${observacionesFinales}`;
      await cambiarEstadoCita(token!, trabajo.id, nuevoEstado, obsTexto);
      
      toast({
        title: `Trabajo ${nuevoEstado}`,
        description: `La OT ${codigoOT} fue marcada como ${nuevoEstado} con respaldo de fotos.`
      });

      onTrabajoFinalizado(trabajo.id, generarFactura);
      onClose();
    } catch (err: any) {
      toast({
        title: "Error al finalizar OT",
        description: err.response?.data?.error || err.message,
        variant: "destructive"
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-neutral-900 border-white/10 text-neutral-100 p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 bg-neutral-950 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black font-mono tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                {codigoOT}
              </span>
              <BadgeDS variant="emerald" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Reparación Lista
              </BadgeDS>
            </div>
            <DialogTitle className="text-base font-bold text-neutral-100">
              Finalización de Orden — {trabajo.cliente}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-neutral-400">
              Control de calidad y estado final de entrega del vehículo.
            </DialogDescription>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Vehículo & Resumen */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-neutral-500 block uppercase text-[10px]">Vehículo</span>
              <span className="font-bold text-neutral-200 text-sm">{trabajo.vehiculo || "Auto"}</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 block uppercase text-[10px]">Monto Total OT</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {currencyFormatter.format(trabajo.costo_total || 0)}
              </span>
            </div>
          </div>

          {/* Checklist de Control de Calidad */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Checklist de Inspección & Control de Calidad
            </label>
            <div className="space-y-2 bg-neutral-950 border border-white/5 p-3.5 rounded-xl text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-neutral-200 select-none">
                <input
                  type="checkbox"
                  checked={checkMecanica}
                  onChange={(e) => setCheckMecanica(e.target.checked)}
                  className="rounded border-white/20 text-red-500 focus:ring-red-500"
                />
                <span>Servicios de mecánica y reemplazos concluidos satisfactoriamente.</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-neutral-200 select-none">
                <input
                  type="checkbox"
                  checked={checkRepuestosViejos}
                  onChange={(e) => setCheckRepuestosViejos(e.target.checked)}
                  className="rounded border-white/20 text-red-500 focus:ring-red-500"
                />
                <span>Repuestos sustituidos fotografiados y listos para devolución al cliente.</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-neutral-200 select-none">
                <input
                  type="checkbox"
                  checked={checkPruebaRuta}
                  onChange={(e) => setCheckPruebaRuta(e.target.checked)}
                  className="rounded border-white/20 text-red-500 focus:ring-red-500"
                />
                <span>Prueba de seguridad y verificación de niveles de fluidos realizada.</span>
              </label>
            </div>
          </div>

          {/* Adjuntar Foto de Evidencia / Repuesto en Cloudinary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-red-400" /> Respaldo Fotográfico (Cloudinary)
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs px-3 py-1.5 rounded-lg border border-white/10 transition-colors">
                <Upload className="h-3.5 w-3.5 text-red-400" />
                {subiendoFoto ? "Subiendo..." : "Adjuntar Foto"}
                <input type="file" accept="image/*" onChange={handleFileUpload} disabled={subiendoFoto} className="hidden" />
              </label>
            </div>

            {fotosList.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-neutral-950 border border-white/5 border-dashed text-xs text-neutral-500">
                Se recomienda adjuntar la foto del repuesto sustituido o del trabajo finalizado como respaldo para el cliente.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {fotosList.map((url, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-white/10 aspect-square bg-neutral-950">
                    <img src={url} alt={`Evidencia ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas Taller / Recomendaciones de Entrega */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-400" /> Recomendaciones para el Cliente
            </label>
            <textarea
              rows={2}
              value={observacionesFinales}
              onChange={(e) => setObservacionesFinales(e.target.value)}
              placeholder="Detalle recomendaciones o hallazgos técnicos para el cliente..."
              className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-600"
            />
          </div>
        </div>

        {/* Footer Acciones */}
        <div className="p-4 bg-neutral-950 border-t border-white/10 flex items-center justify-end gap-2">
          <ButtonDS variant="secondary" onClick={onClose} disabled={guardando} className="text-xs py-2">
            Cancelar
          </ButtonDS>

          <ButtonDS
            variant="outline-red"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => handleConfirmarFinalizacion(true)}
            disabled={guardando || !checkMecanica}
            className="text-xs py-2"
          >
            {nuevoEstado === "Entregado" ? "Entregar & Facturar" : "Completar & Facturar"}
          </ButtonDS>

          <ButtonDS
            variant="primary"
            icon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => handleConfirmarFinalizacion(false)}
            disabled={guardando || !checkMecanica}
            className="text-xs py-2"
          >
            {guardando ? "Procesando..." : `Marcar como ${nuevoEstado}`}
          </ButtonDS>
        </div>
      </DialogContent>
    </Dialog>
  );
};
