interface Props {
  pairingCode: string;
}

export default function PairingScreen({ pairingCode }: Props) {
  return (
    <div className="pairing-screen">
      <div className="pairing-card">
        <h1>Vincular pantalla</h1>
        <p>Ingresa este código en el panel de administración para vincular esta TV.</p>
        <div className="pairing-code">{pairingCode}</div>
        <p className="pairing-hint">Esperando vinculación…</p>
      </div>
    </div>
  );
}
