import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "./ui";

interface NavItem { to: string; label: string; icon: IconName }

const PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Home",      icon: "home" },
  { to: "/vehicles",  label: "Garage",    icon: "garage" },
  { to: "/analytics", label: "Analytics", icon: "chart" },
  { to: "/nfc-tools", label: "NFC",       icon: "nfc" },
  { to: "/settings",  label: "Settings",  icon: "settings" },
];

/** Floating pill bottom nav (Murat Ak signature): dark bar, active tab lifts
 * out as a glowing amber circle. Hidden on >=960px — the desktop sidebar
 * takes over. */
export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Primary">
      {PRIMARY.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) =>
          "mobile-nav__item" + (isActive ? " active" : "")
        }
        aria-label={item.label}>
          <Icon name={item.icon} className="mobile-nav__icon" size={22} />
        </NavLink>
      ))}
    </nav>
  );
}

/** Desktop sticky sidebar (AI Meeting Tool reference). Fixed 240px, dark
 * surface, brand mark at top, active state is a magenta gradient pill. */
export function DesktopSidebar() {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">
          <Icon name="bike" size={20} color="#1a1a1a" />
        </span>
        MotoPulse
      </div>

      <div className="sidebar__section-title">Workspace</div>
      {PRIMARY.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) =>
          "sidebar__item" + (isActive ? " active" : "")
        }>
          <Icon name={item.icon} size={18}/>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
