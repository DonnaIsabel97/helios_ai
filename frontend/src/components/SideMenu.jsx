import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import dashboardIcon from "../assets/dashboard.png";
import "../style/SideMenu.css";

export default function SideMenu({ children }) {
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const navigate = useNavigate();

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    user = {};
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="app-layout">
      <aside className="side-menu">
        <div className="side-menu__brand">Helios</div>

        <button
          className="side-menu__user"
          onClick={() => setOpenUserMenu((prev) => !prev)}
        >
          <div className="side-menu__avatar">{initials}</div>
          <div className="side-menu__user-info">
            <strong>{user?.full_name || "Hi, Name!"}</strong>
            <span>{user?.role || "Role"}</span>
          </div>
        </button>

        {openUserMenu && (
          <div className="side-menu__dropdown">
            <button onClick={() => navigate("/account")}>Account</button>
            <button onClick={() => navigate("/settings")}>Settings</button>
            <button onClick={logout}>Log out</button>
          </div>
        )}

        <nav className="side-menu__nav">
          <NavLink to="/dashboard">
            <img src={dashboardIcon} alt="" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/finguard">
            <img src={dashboardIcon} alt="" />
            <span>Finguard</span>
          </NavLink>

          <NavLink to="/finsage">
            <img src={dashboardIcon} alt="" />
            <span>Finsage</span>
          </NavLink>

          <NavLink to="/cases">
            <img src={dashboardIcon} alt="" />
            <span>Cases</span>
          </NavLink>

          <NavLink to="/reports">
            <img src={dashboardIcon} alt="" />
            <span>Reports</span>
          </NavLink>

          <NavLink to="/settings">
            <img src={dashboardIcon} alt="" />
            <span>Settings</span>
          </NavLink>
        </nav>
      </aside>

      <main className="app-layout__content">{children || <Outlet />}</main>
    </div>
  );
}