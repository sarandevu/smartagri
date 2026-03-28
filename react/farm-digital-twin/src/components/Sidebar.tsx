import { type FC } from "react";
import "./Sidebar.css";

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const nav = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "zones", icon: "🌱", label: "Zones" },
  { id: "alerts", icon: "🔔", label: "Alerts" },
  { id: "irrigation", icon: "💧", label: "Irrigation" },
  { id: "water", icon: "🌊", label: "Water Usage" },
  { id: "weather", icon: "☁️", label: "Weather" },
  { id: "charts", icon: "📈", label: "Analytics" },
];

const Sidebar: FC<SidebarProps> = ({ activeSection, onNavigate }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">🌿</span>
        <div>
          <h1 className="sidebar__title">Digital Twin</h1>
          <span className="sidebar__subtitle">Dashboard</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {nav.map((item) => (
          <button
            key={item.id}
            className={`sidebar__link ${
              activeSection === item.id ? "sidebar__link--active" : ""
            }`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <span className="sidebar__dot sidebar__dot--live" />
          System Online
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
