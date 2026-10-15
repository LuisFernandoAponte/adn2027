import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, ArrowDownRight, ArrowUpRight, Package, RefreshCw } from "lucide-react";
import { getToken } from "../lib/auth";
import { API_BASE } from "../api/config";

interface MovimientoItem {
  id: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  observaciones?: string;
  fechaReg: string;
  usuario?: {
    nombreCompleto: string;
  };
}

interface ModalKardexInventarioProps {
  isOpen: boolean;
  onClose: () => void;
  repuestoId: string | null;
  repuestoNombre?: string;
}

export const ModalKardexInventario: React.FC<ModalKardexInventarioProps> = ({
  isOpen,
  onClose,
  repuestoId,
  repuestoNombre
}) => {
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && repuestoId) {
      cargarKardex();
    }
  }, [isOpen, repuestoId]);

  const cargarKardex = async () => {
    if (!repuestoId) return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/inventario/${repuestoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItemData(data.inventario);
      }
    } catch (err) {
      console.warn("Error al cargar Kardex:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const movimientos: MovimientoItem[] = itemData?.movimientos || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              Kardex & Historial de Movimientos
            </DialogTitle>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-mono">
              {itemData?.codigo || "REP"}
            </Badge>
          </div>
          <DialogDescription>
            Auditoría detallada de entradas, salidas y reabastecimiento para <span className="font-semibold text-white">{repuestoNombre || itemData?.nombre || "este repuesto"}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Tarjetas Informativas */}
        {itemData && (
          <div className="grid grid-cols-3 gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <div>
              <p className="text-xs text-slate-400">Stock Actual</p>
              <p className="text-xl font-extrabold text-white">{itemData.stockActual} unidades</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Stock Mínimo</p>
              <p className="text-xl font-extrabold text-amber-400">{itemData.stockMinimo} unidades</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Precio Venta</p>
              <p className="text-xl font-extrabold text-green-400">Bs. {Number(itemData.precioVenta || 0).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Tabla de Movimientos */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
              Cargando movimientos de inventario...
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No hay movimientos registrados para este repuesto.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-900/80">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Cant.</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Stock Antes/Nuevo</TableHead>
                  <TableHead className="text-xs font-semibold">Detalle / Usuario</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {movimientos.map((m) => {
                  const esEntrada = m.tipo.toLowerCase() === "entrada" || m.tipo.toLowerCase() === "compra";
                  return (
                    <TableRow key={m.id} className="hover:bg-slate-900/50">
                      <TableCell className="font-semibold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          esEntrada
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {esEntrada ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {m.tipo.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono">
                        {esEntrada ? `+${m.cantidad}` : `-${m.cantidad}`}
                      </TableCell>
                      <TableCell className="text-center font-mono text-slate-400">
                        {m.stockAnterior} → <span className="text-white font-bold">{m.stockNuevo}</span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-white line-clamp-1">{m.observaciones || "Movimiento de stock"}</p>
                        <p className="text-[10px] text-slate-400">{m.usuario?.nombreCompleto || "Sistema / Taller"}</p>
                      </TableCell>
                      <TableCell className="text-right text-slate-400 font-mono">
                        {new Date(m.fechaReg).toLocaleDateString("es-BO", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar Kardex
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
