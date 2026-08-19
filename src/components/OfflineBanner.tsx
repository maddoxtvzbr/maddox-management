import { useOnlineStatus } from "../lib/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      <span className="offline-banner-title">Sem conexão com a internet</span>
      <span className="offline-banner-sub">Alguns dados podem não estar disponíveis.</span>
    </div>
  );
}
