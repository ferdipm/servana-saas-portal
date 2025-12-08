export const dynamic = "force-dynamic";

import { QRScanner } from "./qr-scanner";

export default function ScanPage() {
  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
          Check-in con QR
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Escanea el QR del cliente para confirmar su llegada
        </p>
      </div>

      <QRScanner />
    </div>
  );
}
