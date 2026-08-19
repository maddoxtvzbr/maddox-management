import { Home, FileText, CalendarDays, Wallet } from "lucide-react";
import type { Tab } from "../App";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const items: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "inicio", label: "Início", Icon: Home },
  { id: "orcamentos", label: "Orçamentos", Icon: FileText },
  { id: "agenda", label: "Agenda", Icon: CalendarDays },
  { id: "financeiro", label: "Financeiro", Icon: Wallet }
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="tablist" aria-label="Navegação principal">
      {items.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            className={`nav-item ${isActive ? "is-active" : ""}`}
            onClick={() => onChange(id)}
          >
            <span className="nav-icon">
              <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
            </span>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
