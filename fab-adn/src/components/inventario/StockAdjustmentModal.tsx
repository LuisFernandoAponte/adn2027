import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { Package, ArrowUpRight, ArrowDownRight, RefreshCw, X, AlertTriangle } from "lucide-react";
import { type InventarioItem } from "@/api/inventarioApi";
import { currencyFormatter } from "@/features/empleado/stateMachine";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: InventarioItem | null;
  onAjustar: (id: string, data: { cantidad: number; tipo: string; observaciones?: string }) => Promise<void>;
}

export const StockAdjustmentModal: React.FC<Props> = ({ isOpen, onClose, item, onAjustar }) => {
  const [tipo, setTipo] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen || !item) return null;

  const stockAnterior = item.stockActual || 0;
  const stockCalculado =
    tipo === "entrada"
      ? stockAnterior + Number(cantidad || 0)
      : tipo === "salida"
      ? Math.max(0, stockAnterior - Number(cantidad || 0))
      : Math.max(0, Number(cantidad || 0));

  const diferencia = stockCalculado - stockAnterior;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onAjustar(item.id, {
        cantidad: Number(cantidad),
        tipo,
        observaciones: observaciones.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-neutral-100 p-0 overflow-hidden shadow-2xl">
        <div className="p-5 bg-neutral-950 border-b border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              Ajustar Stock de Inventario
            </h2>
            <p className="text-xs text-neutral-400 font-mono">SKU: {item.codigo}</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Card Info Producto */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-white/5 space-y-1.5">
            <p className="font-bold text-neutral-100 text-sm">{item.nombre}</p>
            <div className="flex items-center justify-between text-neutral-400 pt-1">
              <span>Stock Actual en Almacén:</span>
              <span className="font-mono font-bold text-neutral-100 text-sm">{stockAnterior} unidades</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Stock Mínimo de Alerta:</span>
              <span className="font-mono font-semibold text-neutral-300">{item.stockMinimo} unidades</span>
            </div>
          </div>

          {/* Tipo de Movimiento */}
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-300">Tipo de Movimiento *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipo("entrada")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  tipo === "entrada"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-neutral-950 border-white/5 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <ArrowUpRight className="h-4 w-4" /> Entrada (Compra)
              </button>

              <button
                type="button"
                onClick={() => setTipo("salida")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  tipo === "salida"
                    ? "bg-red-500/10 border-red-500/40 text-red-400"
                    : "bg-neutral-950 border-white/5 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <ArrowDownRight className="h-4 w-4" /> Salida
              </button>

              <button
                type="button"
                onClick={() => setTipo("ajuste")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  tipo === "ajuste"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-neutral-950 border-white/5 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Conteo Físico
              </button>
            </div>
          </div>

          {/* Cantidad & Previsualización */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300">
                {tipo === "ajuste" ? "Nuevo Stock Resultante *" : "Cantidad a Mover *"}
              </label>
              <input
                type="number"
                min="0"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 p-2.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 space-y-1">
              <span className="text-[10px] text-neutral-500 block uppercase font-semibold">Previsualización Stock</span>
              <p className="font-mono font-bold text-sm text-neutral-100">
                {stockAnterior} ➔ <span className={diferencia >= 0 ? "text-emerald-400" : "text-red-400"}>{stockCalculado} u</span>
              </p>
              <p className="text-[11px] font-mono text-neutral-400">
                Diferencia: {diferencia >= 0 ? `+${diferencia}` : diferencia} u
              </p>
            </div>
          </div>

          {/* Observaciones / Motivo */}
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-300">Motivo u Observaciones de Auditoría</label>
            <input
              type="text"
              placeholder="ej: Conteo físico mensual, compra de reposición, producto dañado..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-950 p-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-neutral-950 border-t border-white/10 gap-2">
          <ButtonDS variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </ButtonDS>
          <ButtonDS variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : "Confirmar Movimiento"}
          </ButtonDS>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StockAdjustmentModal;
