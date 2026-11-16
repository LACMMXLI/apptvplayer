import { useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { getAdminLinkUrl } from '../api';

interface Props {
  pairingCode: string;
}

/** Builds one SVG path covering every dark module of the QR code. */
function buildQr(text: string): { size: number; path: string } | null {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const size = qr.getModuleCount();
    let path = '';
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { size, path };
  } catch {
    return null;
  }
}

// Quiet zone (in modules) required around a QR code for reliable scanning.
const QUIET_ZONE = 4;

export default function PairingScreen({ pairingCode }: Props) {
  // Only shown when the deployment told the player where the admin panel
  // lives (ADMIN_URL). Without it the screen falls back to the code alone.
  const linkUrl = getAdminLinkUrl(pairingCode);
  const qr = useMemo(() => (linkUrl ? buildQr(linkUrl) : null), [linkUrl]);

  return (
    <div className="pairing-screen">
      <div className={`pairing-card${qr ? ' pairing-card-with-qr' : ''}`}>
        <div className="pairing-main">
          <h1>Vincular pantalla</h1>
          <p>
            {qr
              ? 'Escanea el código QR con tu teléfono, o ingresa este código en el panel de administración.'
              : 'Ingresa este código en el panel de administración para vincular esta TV.'}
          </p>
          <div className="pairing-code">{pairingCode}</div>
          <p className="pairing-hint">Esperando vinculación…</p>
        </div>

        {qr && (
          <div className="pairing-qr">
            <svg
              viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${qr.size + QUIET_ZONE * 2} ${qr.size + QUIET_ZONE * 2}`}
              role="img"
              aria-label="Código QR para vincular esta pantalla desde el panel de administración"
              shapeRendering="crispEdges"
            >
              <rect
                x={-QUIET_ZONE}
                y={-QUIET_ZONE}
                width={qr.size + QUIET_ZONE * 2}
                height={qr.size + QUIET_ZONE * 2}
                fill="#fff"
              />
              <path d={qr.path} fill="#000" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
