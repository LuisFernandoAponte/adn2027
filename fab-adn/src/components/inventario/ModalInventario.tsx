import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { Package, Tag, DollarSign, Building, MapPin, Hash, X } from "lucide-react";
import { type InventarioItem, obtenerProveedoresApi } from "@/api/inventarioApi";

const CATEGORIES = [
  { label: "Motor", value: "motor" },
  { label: "Frenos", value: "frenos" },
  { label: "Suspensión", value: "suspension" },
  { label: "Electricidad", value: "electricidad" },
  { label: "Filtros", value: "filtros" },
  { label: "Aceites", value: "aceites" },
  { label: "Llantas", value: "llantas" },
  { label: "Carrocería", value: "carroceria" },
  { label: "Otros", value: "otros" },
];

interface FormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  precio_compra: number;
  precio_venta: number;
  unidad_medida: string;
  proveedor_id: string;
  ubicacion: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (data: FormData) => Promise<void>;
  itemEditar?: InventarioItem | null;
}

const INITIAL_FORM: FormData = {
  codigo: "",
  nombre: "",
  descripcion: "",
  categoria: "otros",
  stock_actual: 0,
  stock_minimo: 5,
  precio_compra: 0,
  precio_venta: 0,
  unidad_medida: "unidad",
  proveedor_id: "",
  ubicacion: "",
};

export const ModalInventario: React.FC<Props> = ({ isOpen, onClose, onGuardar, itemEditar }) => {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      obtenerProveedoresApi()
        .then(setProveedores)
        .catch(() => setProveedores([]));

      if (itemEditar) {
        setForm({
          codigo: itemEditar.codigo,
          nombre: itemEditar.nombre,
          descripcion: itemEditar.descripcion || "",
          categoria: itemEditar.categoria,
          stock_actual: itemEditar.stockActual,
          stock_minimo: itemEditar.stockMinimo,
          precio_compra: itemEditar.costo,
          precio_venta: itemEditar.precio_venta,
          unidad_medida: itemEditar.unidadMedida || "unidad",
          proveedor_id: itemEditar.proveedorId || (typeof itemEditar.proveedor === "object" ? itemEditar.proveedor?.id : "") || "",
          ubicacion: itemEditar.ubicacion || "",
        });
      } else {
        setForm(INITIAL_FORM);
      }
    }
  }, [isOpen, itemEditar]);

  const handleChange = (field: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onGuardar(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-neutral-900 border-white/10 text-neutral-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 bg-neutral-950 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1 text-left">
            <DialogTitle className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              {itemEditar ? "Editar Ficha Técnica de Repuesto" : "Registrar Nuevo Repuesto / Artículo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Control de stock, precios de compra/venta y asignación de almacén.
            </DialogDescription>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Fila 1: Código & Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300 flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-neutral-400" /> Código (SKU) *
              </label>
              <input
                type="text"
                required
                disabled={!!itemEditar}
                placeholder="ej: ACE-10W40"
                value={form.codigo}
                onChange={(e) => handleChange("codigo", e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 p-2.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-bold text-neutral-300 flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-neutral-400" /> Nombre del Repuesto / Producto *
              </label>
              <input
                type="text"
                required
                placeholder="ej: Pastillas de Freno Delanteras Toyota Corolla"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 p-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Fila 2: Categoría & Proveedor & Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-neutral-400" /> Categoría *
              </label>
              <select
                value={form.categoria}
                onChange={(e) => handleChange("categoria", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300 flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-neutral-400" /> Proveedor Principal
              </label>
              <select
                value={form.proveedor_id}
                onChange={(e) => handleChange("proveedor_id", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Sin Proveedor --</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" /> Ubicación en Almacén
              </label>
              <input
                type="text"
                placeholder="ej: Estante A-3, Casillero 12"
                value={form.ubicacion}
                onChange={(e) => handleChange("ubicacion", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 p-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Fila 3: Stocks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300">Stock Inicial *</label>
              <input
                type="number"
                min="0"
                disabled={!!itemEditar}
                value={form.stock_actual}
                onChange={(e) => handleChange("stock_actual", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300">Stock Mínimo Alerta *</label>
              <input
                type="number"
                min="1"
                value={form.stock_minimo}
                onChange={(e) => handleChange("stock_minimo", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300">Unidad de Medida</label>
              <input
                type="text"
                placeholder="unidad, litro, caja..."
                value={form.unidad_medida}
                onChange={(e) => handleChange("unidad_medida", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Fila 4: Precios & Margen Estimado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-white/5">
            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Precio de Compra (Costo Bs.) *
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.precio_compra}
                onChange={(e) => handleChange("precio_compra", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-300 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Precio de Venta al Público (Bs.) *
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.precio_venta}
                onChange={(e) => handleChange("precio_venta", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-xs text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <ButtonDS variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </ButtonDS>
            <ButtonDS variant="primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : itemEditar ? "Actualizar Repuesto" : "Registrar Repuesto"}
            </ButtonDS>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalInventario;
