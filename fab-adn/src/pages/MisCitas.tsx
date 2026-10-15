import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerMisCitas, type Trabajo } from "../api/citaApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  Loader2,
  ClipboardList,
  Wrench,
  User,
  Package,
  CheckCircle2,
  RefreshCw,
  FileText,
  DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { formatAMPM } from "@/lib/time";

const ESTADOS_SECUENCIA = [
  "Agendado",
  "En taller",
  "En revisión",
  "En progreso",
  "Completado",
  "Entregado"
];

const getEstadoBadge = (estado: string | null) => {
  const est = estado || "Agendado";

  const colores: Record<string, string> = {
    Agendado: "bg-blue-500",
    "En taller": "bg-indigo-500",
    "En revisión": "bg-orange-500",
    "En progreso": "bg-yellow-500",
    Completado: "bg-green-500",
    Entregado: "bg-emerald-600",
    Cancelado: "bg-red-500",
  };

  return (
    <Badge className={`${colores[est] || "bg-gray-500"} text-white border-0 font-semibold`}>
      {est}
    </Badge>
  );
};

export const MisCitas = () => {
  const navigate = useNavigate();
  const [citas, setCitas] = useState<Trabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await obtenerMisCitas();
      setCitas(data);
    } catch (err: any) {
      setError("No se pudieron cargar tus citas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const getStepIndex = (estado: string) => {
    const idx = ESTADOS_SECUENCIA.indexOf(estado);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* HEADER */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/cliente/home")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>

            <h1 className="text-2xl font-black">
              <span className="text-primary">ADN</span> Mis Citas e Historial
            </h1>

            <Badge variant="secondary">Cliente VIP</Badge>
          </div>

          <Button size="sm" variant="outline" onClick={cargar}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando tus citas...</p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="pt-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={cargar}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* EMPTY */}
        {!loading && !error && citas.length === 0 && (
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="pt-6 text-center">
              <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No tienes citas registradas
              </h3>
              <p className="text-muted-foreground mb-4">
                Agenda tu primera cita para mantener tu auto en estado óptimo.
              </p>
              <Button onClick={() => navigate("/cliente/home")}>
                Agendar Cita Ahora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* CONTENT */}
        {!loading && !error && citas.length > 0 && (
          <>
            {/* Resumen KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <ClipboardList className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Visitas Totales al Taller</p>
                    <p className="text-2xl font-bold">{citas.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">En Progreso / Taller</p>
                    <p className="text-2xl font-bold">
                      {citas.filter(c => !["Entregado", "Cancelado"].includes(c.estado)).length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Servicios Completados</p>
                    <p className="text-2xl font-bold">
                      {citas.filter(c => ["Completado", "Entregado"].includes(c.estado)).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Listado de Citas con Línea de Tiempo */}
            <div className="space-y-6">
              {citas.map((cita) => {
                const currentStepIndex = getStepIndex(cita.estado);
                const isCancelado = cita.estado === "Cancelado";
                const citaIdStr = String(cita.id);

                return (
                  <div
                    key={cita.id}
                    className="hover:shadow-lg transition-all"
                  >
                    <Card className="hover:shadow-lg transition-all border-border/80">
                      <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <CardTitle className="text-base font-bold">
                            {`Cita #${citaIdStr.substring(0, 8)}`}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              ID: {cita.id}
                            </span>
                            {getEstadoBadge(cita.estado)}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        {/* LÍNEA DE TIEMPO / PROGRESS BAR DE REPARACIÓN */}
                        {!isCancelado && (
                          <div className="bg-secondary/40 p-4 rounded-xl border border-border/60">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              Trazabilidad de Reparación en Taller:
                            </p>
                            <div className="grid grid-cols-6 gap-1 text-center relative">
                              {ESTADOS_SECUENCIA.map((est, i) => {
                                const isPassed = i <= currentStepIndex;
                                const isCurrent = i === currentStepIndex;

                                return (
                                  <div key={est} className="flex flex-col items-center" title={est}>
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        isCurrent
                                          ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                                          : isPassed
                                            ? "bg-green-500 text-white"
                                            : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {isPassed ? "✓" : i + 1}
                                    </div>
                                    <span
                                      className={`text-[10px] mt-1 text-center font-medium ${
                                        isCurrent ? "text-primary font-bold" : isPassed ? "text-foreground" : "text-muted-foreground/60"
                                      }`}
                                    >
                                      {est}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Datos Cita */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Fecha:</span>
                              <span className="font-medium">
                                {new Date(cita.fecha_cita).toLocaleDateString("es-BO", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>

                            {cita.hora_inicio && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Hora:</span>
                                <span className="font-medium">
                                  {formatAMPM(cita.hora_inicio)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Mecánico Asignado:</span>
                              <span className="font-semibold text-primary">
                                {cita.mecanico || "Asignación en taller"}
                              </span>
                            </div>
                          </div>

                          {/* Servicios y Repuestos */}
                          <div className="space-y-2">
                            {cita.servicios && (
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground">Servicios contratados:</span>
                                  <p className="font-medium">{cita.servicios}</p>
                                </div>
                              </div>
                            )}

                            {cita.repuestos && cita.repuestos.length > 0 && (
                              <div className="flex items-start gap-2">
                                <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground">Repuestos instalados:</span>
                                  <div className="space-y-1 mt-1">
                                    {cita.repuestos.map((r, idx) => (
                                      <span key={idx} className="inline-block bg-secondary text-xs px-2 py-0.5 rounded mr-1">
                                        {r.nombre} (x{r.cantidad})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 border-t border-border pt-2 mt-2">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="text-muted-foreground">Costo Total:</span>
                              <span className="font-bold text-green-500 text-base">
                                Bs. {Number(cita.costo_total || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};