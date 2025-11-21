"use client";

import { useState, useRef, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { updateRestaurantLogo } from "./actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type LogoUploaderProps = {
  tenantId: string;
  restaurantId: string;
  currentLogoUrl?: string;
  isReadOnly: boolean;
};

export function LogoUploader({
  tenantId,
  restaurantId,
  currentLogoUrl,
  isReadOnly,
}: LogoUploaderProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || "");
  const [previewUrl, setPreviewUrl] = useState(currentLogoUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

    if (file.size > maxSize) {
      setUploadError("El archivo debe ser menor a 2MB");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Solo se permiten archivos JPG, PNG, WebP o SVG");
      return;
    }

    setUploadError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      // Generar nombre de archivo
      const fileExt = file.name.split(".").pop();
      const fileName = `${restaurantId}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;

      // Upload a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("restaurant-logos")
        .upload(filePath, file, {
          upsert: true, // Sobrescribir si ya existe
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw new Error("Error al subir el archivo");
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("restaurant-logos").getPublicUrl(filePath);

      // Actualizar preview
      setPreviewUrl(publicUrl);
      setLogoUrl(publicUrl);

      // Guardar en base de datos
      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.set("restaurantId", restaurantId);
          formData.set("logoUrl", publicUrl);

          await updateRestaurantLogo(formData);
          setSuccessMessage("Logo actualizado correctamente");
        } catch (err: any) {
          console.error(err);
          setUploadError(
            err?.message || "Error al guardar el logo en la base de datos"
          );
        } finally {
          setIsUploading(false);
        }
      });
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || "Error al subir el logo");
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteLogo = async () => {
    setShowDeleteConfirm(false);
    setUploadError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      // Eliminar de Supabase Storage
      if (logoUrl) {
        const filePath = logoUrl.split("/restaurant-logos/")[1];
        if (filePath) {
          const { error: deleteError } = await supabase.storage
            .from("restaurant-logos")
            .remove([filePath]);

          if (deleteError) {
            console.error("Error deleting file:", deleteError);
          }
        }
      }

      // Actualizar base de datos (NULL)
      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.set("restaurantId", restaurantId);
          formData.set("logoUrl", "");

          await updateRestaurantLogo(formData);
          setPreviewUrl("");
          setLogoUrl("");
          setSuccessMessage("Logo eliminado correctamente");
        } catch (err: any) {
          console.error(err);
          setUploadError(err?.message || "Error al eliminar el logo");
        } finally {
          setIsUploading(false);
        }
      });
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || "Error al eliminar el logo");
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-start gap-6">
        {previewUrl ? (
          <div className="w-32 h-32 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
            <img
              src={previewUrl}
              alt="Logo del restaurante"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-32 h-32 rounded-lg bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center">
            <span className="text-xs text-zinc-500">Sin logo</span>
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div className="text-xs text-zinc-400">
            Sube el logo de tu restaurante. Se mostrará en el dashboard y en
            futuras comunicaciones.
          </div>

          {/* Mensajes */}
          {uploadError && (
            <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-md px-3 py-2">
              {uploadError}
            </div>
          )}
          {successMessage && (
            <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-md px-3 py-2">
              {successMessage}
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
              onChange={handleFileSelect}
              disabled={isReadOnly || isUploading || isPending}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadOnly || isUploading || isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading || isPending
                ? "Subiendo..."
                : previewUrl
                ? "Cambiar logo"
                : "Subir logo"}
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={isReadOnly || isUploading || isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>

          <div className="text-[11px] text-zinc-500">
            Formatos: JPG, PNG, WebP o SVG · Tamaño máximo: 2MB
          </div>
        </div>
      </div>

      {/* Diálogo: Confirmar eliminación de logo */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Eliminar logo"
        message="¿Estás seguro de que quieres eliminar el logo del restaurante?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteLogo}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
