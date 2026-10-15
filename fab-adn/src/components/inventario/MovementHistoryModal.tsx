import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { Package, RefreshCw, ArrowUpRight, ArrowDownRight, Clock, User, FileText, X } from "lucide-react";
import { getToken } from "@/lib/auth";
import { API_BASE } from "@/api/config";
import axios from "axios";
import { dateFormatter } from "@/features/empleado/stateMachine";

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  citaId?: string | null;
  observaciones: string | null;
  fechaReg: string;
  usuario: { nombreCompleto: string } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemNombre: string;
}

export const MovementHistoryModal: React.FC<Props> = ({ isOpen, onClose, itemId, itemNombre }) => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && itemId) {
      setLoading(true);
      const token = getToken();
      axios.get(`${API_BASE}/api/inventario/${itemId}/movimientos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => setMovimientos(res.data.movimientos || []))
        .catch(() => setMovimientos([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, itemId]);

  const getTipoBadge = (tipo: string) => {
    const tUpper = (tipo || "").toUpperCase();
    if (tUpper.includes("ENTRADA") || tUpper.includes("COMPRA")) {
      return (
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" /> Entrada
        </span>
      );
    }
    if (tUpper.includes("SALIDA") || tUpper.includes("OT")) {
      return (
        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1">
          <ArrowDownRight className="h-3 w-3" /> Salida OT
        </span>
      );
    }
    if (tUpper.includes("DEVOLUCION")) {
      return (
        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Devolución
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
        <RefreshCw className="h-3 w-3" /> Ajuste Físico
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-neutral-900 border-white/10 text-neutral-100 p-0 overflow-hidden shadow-2xl">
        <div className="p-5 bg-neutral-950 border-b border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              Trazabilidad & Historial de Movimientos
            </h2>
            <p className="text-xs text-neutral-400 font-semibold">{itemNombre}</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-neutral-400 animate-pulse flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-red-500" />
              Cargando historial de entradas, salidas y auditorías...
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 rounded-xl bg-neutral-950 border border-white/5 space-y-1">
              <FileText className="h-8 w-8 text-neutral-600 mx-auto" />
              <p className="font-semibold text-neutral-300">Sin movimientos registrados</p>
              <p className="text-[11px] text-neutral-500">Este producto aún no cuenta con registros de entrada o salida en almacén.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {movimientos.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl bg-neutral-950 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    {getTipoBadge(m.tipo)}
                    <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {m.fechaReg ? dateFormatter.format(new Date(m.fechaReg)) : "Reciente"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-neutral-400 pt-1">
                    <div>
                      <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Cantidad Movida</span>
                      <span className="font-mono font-bold text-neutral-100 text-sm">
                        {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad} unidades
                      </span>
                    </div>

                    <div>
                      <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Impacto en Stock</span>
                      <span className="font-mono text-neutral-300">
                        {m.stockAnterior} ➔ <strong className="text-neutral-100">{m.stockNuevo} u</strong>
                      </span>
                    </div>
                  </div>

                  {m.observaciones && (
                    <div className="pt-1.5 border-t border-white/5 text-[11px] text-neutral-300">
                      <span className="text-neutral-500 font-semibold">Motivo / Notas: </span>
                      {m.observaciones}
                    </div>
                  )}

                  {m.usuario && (
                    <div className="text-[10px] text-neutral-500 flex items-center gap-1 pt-0.5">
                      <User className="h-3 w-3 text-neutral-600" />
                      <span>Registrado por: <strong>{m.usuario.nombreCompleto}</strong></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-neutral-950 border-t border-white/10">
          <ButtonDS variant="secondary" onClick={onClose}>
            Cerrar Historial
          </ButtonDS>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MovementHistoryModal;
