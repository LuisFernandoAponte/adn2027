import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Banknote, CreditCard, Building2, CheckCircle2, Copy, Receipt } from "lucide-react";
import { API_BASE } from "@/api/config";

interface ModalCobroQRProps {
  isOpen: boolean;
  onClose: () => void;
  trabajo: any | null;
  onCobroExitoso: (facturaId: string) => void;
}

export const ModalCobroQR: React.FC<ModalCobroQRProps> = ({
  isOpen,
  onClose,
  trabajo,
  onCobroExitoso
}) => {
  const [customQrImage, setCustomQrImage] = useState<string | null>(() => localStorage.getItem("taller_custom_qr"));
  const [metodoPago, setMetodoPago] = useState<"qr" | "efectivo" | "tarjeta" | "transferencia">("qr");
  const [referencia, setReferencia] = useState("");
  const [nitCliente, setNitCliente] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [montoRecibido, setMontoRecibido] = useState<number>(0);
  const [procesando, setProcesando] = useState(false);

  const handleUploadCustomQR = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      localStorage.setItem("taller_custom_qr", base64Str);
      setCustomQrImage(base64Str);
      toast({ title: "Imagen de QR Guardada", description: "Se actualizará para los próximos cobros del taller." });
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || !trabajo) return null;

  const total = trabajo.costo_total || 0;
  const clienteNombre = trabajo.cliente || "Cliente General";
  const clienteNit = nitCliente || trabajo.cliente_telefono || "0";
  const cambio = Math.max(0, montoRecibido - total);

  // Desglose Tributario Bolivia
  const iva13 = (total * 0.13).toFixed(2);
  const it3 = (total * 0.03).toFixed(2);
  const neto87 = (total * 0.87).toFixed(2);

  const handleCopyQR = () => {
    navigator.clipboard.writeText(`PAGO ADN MOTORS - Bs. ${total.toFixed(2)} - OT: ${trabajo.id}`);
    toast({ title: "Copiado", description: "Datos de cobro copiados al portapapeles" });
  };

  const handleSubmitCobro = async () => {
    if (metodoPago === "qr" || metodoPago === "transferencia") {
      if (!referencia.trim()) {
        toast({
          title: "Referencia Requerida",
          description: "Ingresa el Nº de Comprobante / Referencia Bancaria de la transferencia QR.",
          variant: "destructive"
        });
        return;
      }
    }

    setProcesando(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/facturas/generar/${trabajo.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nitCliente: clienteNit,
          razonSocial: razonSocial || clienteNombre,
          metodoPago,
          referencia
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({
          title: "¡Cobro Registrado con Éxito!",
          description: `Pago registrado vía ${metodoPago.toUpperCase()}. Comprobante generado.`
        });
        const facturaId = data.factura?.id || trabajo.id;
        onCobroExitoso(facturaId);
        onClose();
      } else {
        throw new Error(data.error || data.message || "Error al procesar cobro");
      }
    } catch (err: any) {
      toast({
        title: "Error al Procesar Pago",
        description: err.message || "Error de conexión con el servidor de cobros",
        variant: "destructive"
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-600" />
              Pasarela de Cobro - ADN MOTORS
            </DialogTitle>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-bold">
              BOB (Bs.) Bolivia
            </Badge>
          </div>
          <DialogDescription>
            Selecciona el método de pago e ingresa los datos de facturación para la Orden de Trabajo.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de Trabajo */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Cliente:</span>
            <span className="font-semibold text-white">{clienteNombre}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Vehículo / Placa:</span>
            <span className="font-mono text-amber-400 font-bold">
              {trabajo.placa || "SIN PLACA"} ({trabajo.vehiculo_marca || "Auto"})
            </span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
            <span className="text-base font-bold text-white">Monto Total a Cobrar:</span>
            <span className="text-2xl font-extrabold text-red-500">
              Bs. {total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-xs text-slate-500 flex justify-between pt-1">
            <span>Neto (87%): Bs. {neto87}</span>
            <span>IVA (13%): Bs. {iva13}</span>
            <span>IT (3%): Bs. {it3}</span>
          </div>
        </div>

        {/* Métodos de Pago */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Método de Pago</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setMetodoPago("qr")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition-all ${
                metodoPago === "qr"
                  ? "border-red-500 bg-red-500/10 text-red-500 ring-2 ring-red-500/20"
                  : "border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <QrCode className="w-5 h-5 mb-1" />
              QR Simple
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago("efectivo")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition-all ${
                metodoPago === "efectivo"
                  ? "border-green-500 bg-green-500/10 text-green-500 ring-2 ring-green-500/20"
                  : "border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Banknote className="w-5 h-5 mb-1" />
              Efectivo
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago("tarjeta")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition-all ${
                metodoPago === "tarjeta"
                  ? "border-blue-500 bg-blue-500/10 text-blue-500 ring-2 ring-blue-500/20"
                  : "border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <CreditCard className="w-5 h-5 mb-1" />
              Tarjeta
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago("transferencia")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition-all ${
                metodoPago === "transferencia"
                  ? "border-purple-500 bg-purple-500/10 text-purple-500 ring-2 ring-purple-500/20"
                  : "border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Building2 className="w-5 h-5 mb-1" />
              Transferencia
            </button>
          </div>
        </div>

        {/* Vista dinámica según método */}
        {metodoPago === "qr" && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center space-y-3">
            <div className="bg-white p-3 rounded-xl shadow-lg relative group flex flex-col items-center justify-center">
              {customQrImage ? (
                <img
                  src={customQrImage}
                  alt="QR Banco Taller"
                  className="w-48 h-48 object-contain rounded-lg border"
                />
              ) : (
                <svg className="w-44 h-44" viewBox="0 0 200 200" fill="none">
                  <rect width="200" height="200" fill="white" />
                  <rect x="10" y="10" width="50" height="50" fill="#000" />
                  <rect x="20" y="20" width="30" height="30" fill="#FFF" />
                  <rect x="27" y="27" width="16" height="16" fill="#000" />

                  <rect x="140" y="10" width="50" height="50" fill="#000" />
                  <rect x="150" y="20" width="30" height="30" fill="#FFF" />
                  <rect x="157" y="27" width="16" height="16" fill="#000" />

                  <rect x="10" y="140" width="50" height="50" fill="#000" />
                  <rect x="20" y="150" width="30" height="30" fill="#FFF" />
                  <rect x="27" y="157" width="16" height="16" fill="#000" />

                  <rect x="70" y="15" width="20" height="20" fill="#000" />
                  <rect x="100" y="15" width="25" height="10" fill="#000" />
                  <rect x="70" y="45" width="15" height="20" fill="#000" />
                  <rect x="95" y="40" width="30" height="25" fill="#000" />

                  <rect x="15" y="70" width="20" height="25" fill="#000" />
                  <rect x="45" y="70" width="45" height="15" fill="#000" />
                  <rect x="100" y="75" width="85" height="15" fill="#000" />

                  <rect x="15" y="105" width="30" height="20" fill="#000" />
                  <rect x="55" y="95" width="20" height="35" fill="#000" />
                  <rect x="85" y="100" width="45" height="25" fill="#000" />
                  <rect x="140" y="100" width="45" height="25" fill="#000" />

                  <rect x="70" y="140" width="30" height="20" fill="#000" />
                  <rect x="110" y="135" width="35" height="40" fill="#000" />
                  <rect x="155" y="140" width="35" height="15" fill="#000" />
                  <rect x="70" y="170" width="70" height="15" fill="#000" />
                  <rect x="150" y="170" width="35" height="15" fill="#000" />

                  <circle cx="100" cy="100" r="22" fill="#DC2626" />
                  <text x="100" y="104" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                    ADN
                  </text>
                </svg>
              )}
            </div>

            {/* Botón para cargar / cambiar la foto del QR del banco */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                <span>📷 Subir / Cambiar Imagen QR de Banco</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadCustomQR} />
              </label>
              {customQrImage && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("taller_custom_qr");
                    setCustomQrImage(null);
                  }}
                  className="text-[11px] text-red-400 hover:underline"
                >
                  Restablecer QR por defecto
                </button>
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-slate-400">Escanea con tu aplicación de banca móvil (BCP, BNB, Mercantil, Bisa, etc.)</p>
              <Badge className="bg-red-600 text-white font-mono">
                Cobro Directo: Bs. {total.toFixed(2)}
              </Badge>
            </div>
            <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-white" onClick={handleCopyQR}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar datos de transferencia
            </Button>
          </div>
        )}

        {metodoPago === "efectivo" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Monto Entregado (Bs.)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={montoRecibido || ""}
                  onChange={(e) => setMontoRecibido(parseFloat(e.target.value) || 0)}
                  className="font-mono text-lg font-bold"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Cambio / Vuelto (Bs.)</Label>
                <div className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 flex items-center font-mono text-lg font-bold text-green-400">
                  Bs. {cambio.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campos de Facturación & Referencia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400">NIT / CI para Factura</Label>
            <Input
              placeholder="Ej. 123456021"
              value={nitCliente}
              onChange={(e) => setNitCliente(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Razón Social</Label>
            <Input
              placeholder="Nombre de empresa o cliente"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </div>
          {(metodoPago === "qr" || metodoPago === "transferencia") && (
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-400 flex items-center justify-between">
                <span>Nº de Comprobante / Referencia Bancaria</span>
                <span className="text-red-400 font-bold">*Requerido</span>
              </Label>
              <Input
                placeholder="Ej. REF-8941235 / BCP-9021"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="font-mono"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitCobro}
            disabled={procesando}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {procesando ? (
              "Procesando Cobro..."
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Cobro (Bs. {total.toFixed(2)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
