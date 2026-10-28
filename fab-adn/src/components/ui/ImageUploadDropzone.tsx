import React, { useState, useRef } from "react";
import {
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
  ZoomIn,
  Loader2,
  CheckCircle2,
  Sparkles,
  X,
  AlertCircle
} from "lucide-react";
import { optimizeImage, compressImageFiles, formatFileSize } from "@/lib/imageOptimizer";
import { subirFotoTemp } from "@/api/citaApi";
import { getToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadDropzoneProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  onUploadCloudinary?: (base64: string) => Promise<string>;
  useTempUpload?: boolean;
  maxFiles?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  photos,
  onChange,
  onUploadCloudinary,
  useTempUpload = true,
  maxFiles = 8,
  label = "Evidencias Fotográficas & Respaldo",
  description = "Fotografías del vehículo, estado mecánico o repuestos.",
  disabled = false,
}) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (photos.length >= maxFiles) {
      toast({
        title: "Límite alcanzado",
        description: `Se permite un máximo de ${maxFiles} fotografías por registro.`,
        variant: "destructive",
      });
      return;
    }

    const availableSlots = maxFiles - photos.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);

    setProcessing(true);
    setProgressPercent(10);
    setStatusText("Optimizando imágenes para móvil...");

    try {
      const optimizedResults = await compressImageFiles(
        filesToProcess,
        (current, total, fileName) => {
          const pct = Math.round(10 + (current / total) * 40);
          setProgressPercent(pct);
          setStatusText(`Comprimiendo ${current}/${total}: ${fileName}`);
        }
      );

      if (optimizedResults.length === 0) {
        throw new Error("No se procesaron imágenes válidas.");
      }

      const totalSavedBytes = optimizedResults.reduce(
        (acc, r) => acc + (r.originalSize - r.compressedSize),
        0
      );
      const totalOriginalBytes = optimizedResults.reduce((acc, r) => acc + r.originalSize, 0);
      const avgSavedPercent = totalOriginalBytes > 0
        ? Math.round((totalSavedBytes / totalOriginalBytes) * 100)
        : 0;

      setStatusText("Subiendo a la nube de alta velocidad...");
      setProgressPercent(60);

      const uploadedUrls: string[] = [];
      const token = getToken() || "";

      for (let i = 0; i < optimizedResults.length; i++) {
        const item = optimizedResults[i];
        setStatusText(`Subiendo foto ${i + 1} de ${optimizedResults.length}...`);
        setProgressPercent(60 + Math.round(((i + 1) / optimizedResults.length) * 35));

        if (onUploadCloudinary) {
          const url = await onUploadCloudinary(item.base64);
          uploadedUrls.push(url);
        } else if (useTempUpload) {
          try {
            const res = await subirFotoTemp(token, item.base64);
            if (res.success && res.url) {
              uploadedUrls.push(res.url);
            } else {
              uploadedUrls.push(item.base64);
            }
          } catch (e) {
            // Fallback safe to base64 if temp fails
            uploadedUrls.push(item.base64);
          }
        } else {
          uploadedUrls.push(item.base64);
        }
      }

      onChange([...photos, ...uploadedUrls]);
      setProgressPercent(100);

      toast({
        title: "¡Fotos Optimizadas y Cargadas!",
        description: `${uploadedUrls.length} imagen(es) listas. Ahorro de peso: ~${avgSavedPercent}% (${formatFileSize(totalSavedBytes)} reducidos).`,
      });
    } catch (err: any) {
      console.error("Error optimizando/subiendo fotos:", err);
      toast({
        title: "Error en la carga",
        description: err.message || "No se pudieron procesar las imágenes.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setStatusText(null);
      setProgressPercent(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    onChange(photos.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3 w-full">
      {/* Hidden native inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
        disabled={disabled || processing}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
        disabled={disabled || processing}
        className="hidden"
      />

      {/* Header Info & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-red-500" />
              {label}
            </span>
            <span className="text-[11px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded-full border border-white/5">
              {photos.length}/{maxFiles}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">{description}</p>
        </div>

        {/* Action Buttons for Mobile / Tablet / Desktop */}
        <div className="flex items-center gap-2">
          {/* Tomar Foto Directo (Abre la cámara en Android & iOS) */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || processing || photos.length >= maxFiles}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50 disabled:pointer-events-none min-h-[40px] touch-manipulation"
          >
            <Camera className="h-4 w-4 flex-shrink-0" />
            <span>Tomar Foto</span>
          </button>

          {/* Subir de Galería */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || processing || photos.length >= maxFiles}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none min-h-[40px] touch-manipulation"
          >
            <Upload className="h-4 w-4 flex-shrink-0 text-red-400" />
            <span>Galería</span>
          </button>
        </div>
      </div>

      {/* Progress & Compression Status Bar */}
      {processing && (
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-red-500/30 space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-red-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
              {statusText || "Procesando imágenes..."}
            </span>
            <span className="font-mono text-neutral-300">{progressPercent}%</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Photos Grid or Empty State */}
      {photos.length === 0 && !processing ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-red-500/40 rounded-2xl p-6 text-center bg-neutral-950/60 cursor-pointer transition-colors group space-y-2"
        >
          <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center mx-auto text-neutral-400 group-hover:text-red-400 transition-colors">
            <ImageIcon className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-neutral-300">
            Toca para tomar foto con tu celular o elegir de la galería
          </p>
          <p className="text-[11px] text-neutral-500">
            Compresión automática WebP HD integrada. Rápido y sin lag.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {photos.map((url, idx) => (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden border border-white/10 bg-neutral-950 aspect-square shadow-sm"
            >
              <img
                src={url}
                alt={`Evidencia ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />

              {/* Badge indicativo de Cloudinary */}
              <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-[10px] font-mono text-neutral-300 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>#{idx + 1}</span>
              </div>

              {/* Hover / Touch Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                <button
                  type="button"
                  onClick={() => setZoomUrl(url)}
                  className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Ver imagen completa"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="p-2 rounded-lg bg-red-600/90 text-white hover:bg-red-500 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Eliminar foto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add more tile if below max */}
          {photos.length < maxFiles && !processing && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="border border-dashed border-white/10 hover:border-red-500/40 rounded-xl bg-neutral-950/40 hover:bg-neutral-950 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-red-400 transition-all aspect-square min-h-[90px]"
            >
              <Camera className="h-5 w-5" />
              <span className="text-[11px] font-semibold">+ Otra foto</span>
            </button>
          )}
        </div>
      )}

      {/* Modal Zoom Lightbox for Mobile & Desktop */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setZoomUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92dvh] bg-neutral-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-neutral-900">
              <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-red-500" />
                Vista Previa de Evidencia HD
              </span>
              <button
                type="button"
                onClick={() => setZoomUrl(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80dvh]">
              <img
                src={zoomUrl}
                alt="Zoom Evidencia"
                className="max-h-[75dvh] max-w-full w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
