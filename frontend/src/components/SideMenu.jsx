import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import dashboardIcon from "../assets/dashboard.png";
import "../style/SideMenu.css";

function MiniOrb() {
  return (
    <svg viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="msG" cx="42%" cy="36%" r="62%">
          <stop offset="0%"   stopColor="#2d1f45"/>
          <stop offset="100%" stopColor="#080510"/>
        </radialGradient>
        <radialGradient id="moG" cx="50%" cy="50%" r="50%">
          <stop offset="55%"  stopColor="#9b6fd4" stopOpacity="0.12"/>
          <stop offset="78%"  stopColor="#e86fa3" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="mrL" cx="50%" cy="50%" r="50%">
          <stop offset="72%"  stopColor="transparent" stopOpacity="0"/>
          <stop offset="88%"  stopColor="#e86fa3"     stopOpacity="0.85"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <filter id="msDG" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="0.8" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="13" cy="13" r="12" fill="url(#moG)" opacity="0.7"/>
      <circle cx="13" cy="13" r="9"  fill="url(#msG)"/>
      <circle cx="13" cy="13" r="9"  fill="url(#mrL)"/>
      <circle cx="16" cy="10" r="1.2" fill="#e86fa3" opacity="0.8" filter="url(#msDG)"/>
    </svg>
  );
}

export default function SideMenu({ children }) {
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const navigate = useNavigate();

  let user = {};
  try { user = JSON.parse(localStorage.getItem("user")) || {}; } catch { user = {}; }

  const initials = user?.full_name
    ? user.full_name.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()
    : "U";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="app-layout">
      <aside className="side-menu">

        {/* Brand */}
        <div className="side-menu__brand">
          <div className="side-menu__brand-orb"><MiniOrb /></div>
          <span className="side-menu__brand-text">Helios</span>
        </div>

        {/* User */}
        <button className="side-menu__user" onClick={() => setOpenUserMenu(p => !p)}>
          <div className="side-menu__avatar">{initials}</div>
          <div className="side-menu__user-info">
            <strong>{user?.full_name || "Hi, Name!"}</strong>
            <span>{user?.role || "Analyst"}</span>
          </div>
        </button>

        {openUserMenu && (
          <div className="side-menu__dropdown">
            <button onClick={() => navigate("/account")}>Account</button>
            <button onClick={() => navigate("/settings")}>Settings</button>
            <button onClick={logout}>Log out</button>
          </div>
        )}

        {/* Nav */}
        <nav className="side-menu__nav">
          <NavLink to="/dashboard"><img src={dashboardIcon} alt=""/><span>Dashboard</span></NavLink>
          <NavLink to="/finguard"><img src={dashboardIcon} alt=""/><span>FinGuard</span></NavLink>
          <NavLink to="/finsage"><img src={dashboardIcon} alt=""/><span>FinSage</span></NavLink>
          <NavLink to="/cases"><img src={dashboardIcon} alt=""/><span>Cases</span></NavLink>
          <NavLink to="/reports"><img src={dashboardIcon} alt=""/><span>Reports</span></NavLink>
          <NavLink to="/settings"><img src={dashboardIcon} alt=""/><span>Settings</span></NavLink>
        </nav>

      </aside>
      <main className="app-layout__content">{children || <Outlet />}</main>
    </div>
  );
}