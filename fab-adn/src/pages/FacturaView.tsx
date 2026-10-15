import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { obtenerFactura, descargarFacturaPDF } from "../api/facturaApi";
import { getToken } from "../lib/auth";

interface Detalle {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Factura {
  numero_factura: string;
  fecha_emision: string;
  cliente_nombre: string;
  cliente_email: string;
  generado_por: string;
  total: number;
  detalle: Detalle[];
}

export default function FacturaView() {
  const { id } = useParams();
  const [factura, setFactura] = useState<Factura | null>(null);

  useEffect(() => {
    const fetchFactura = async () => {
      const token = getToken() || "";
      if (!id || !token) return;
      try {
        const data = await obtenerFactura(id, token);
        setFactura(data);
      } catch (err) {
        console.error("Error al cargar la factura:", err);
      }
    };
    fetchFactura();
  }, [id]);

  const handleDescargarPDF = () => {
    const token = getToken() || "";
    if (id && token) {
      descargarFacturaPDF(id, token);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-BO", {
      style: "currency",
      currency: "BOB",
      minimumFractionDigits: 2,
    }).format(value);

  if (!factura) return <p className="text-center p-8">Cargando factura...</p>;

  return (
    <div className="min-h-screen bg-muted/30 flex items-start justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl bg-card rounded-xl shadow-lg border p-6 md:p-10 space-y-6">
        <h1 className="text-2xl font-bold text-center tracking-tight">ADN MOTORS</h1>
        <p className="text-sm text-muted-foreground text-center -mt-4">Taller Automotriz Profesional</p>

        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold">Factura {factura.numero_factura}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(factura.fecha_emision).toLocaleDateString("es-BO", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4 text-sm">
          <div>
            <p className="font-semibold mb-1">Cliente</p>
            <p>{factura.cliente_nombre}</p>
            <p className="text-muted-foreground">{factura.cliente_email}</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Atendido por</p>
            <p>{factura.generado_por}</p>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted text-sm">
              <th className="text-left py-3 px-3 font-semibold">Descripción</th>
              <th className="text-center py-3 px-3 font-semibold">Cant.</th>
              <th className="text-right py-3 px-3 font-semibold">Precio</th>
              <th className="text-right py-3 px-3 font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {factura.detalle.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="py-2.5 px-3">{item.descripcion}</td>
                <td className="py-2.5 px-3 text-center">{item.cantidad}</td>
                <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.precio_unitario)}</td>
                <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary/10 font-bold text-base">
              <td colSpan={3} className="py-3 px-3 text-right">Total</td>
              <td className="py-3 px-3 text-right text-primary">{formatCurrency(factura.total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="text-center pt-4">
          <button
            onClick={handleDescargarPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar PDF
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Gracias por confiar en ADN MOTORS
        </p>
      </div>
    </div>
  );
}