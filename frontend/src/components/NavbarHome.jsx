import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../style/HomeNavbar.css";

export default function NavbarHome({ onLoginClick }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar-home${scrolled ? " navbar-home--scrolled" : ""}`}>
      <button className="navbar-home__brand" onClick={() => navigate("/")}>
        <img src={logo} alt="Helios logo" />
        <span>Helios</span>
      </button>

      <nav className="navbar-home__links">
        <button onClick={() => navigate("/about")} className="navbar-home__link">About</button>
        <button onClick={() => navigate("/contact-us")} className="navbar-home__link">Contact</button>
        <button className="navbar-home__login" onClick={onLoginClick}>
          Log in 
        </button>
      </nav>
    </header>
  );
}