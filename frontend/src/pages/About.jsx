import NavbarHome from "../components/NavbarHome";
import { useState } from "react";
import LoginModal from "../modals/LoginModal";
import "../style/About.css";

export default function About() {
  const [openLogin, setOpenLogin] = useState(false);

  return (
    <div className="simple-page">
      <NavbarHome onLoginClick={() => setOpenLogin(true)} />
      <div className="simple-page__content">
        <h1>About Helios</h1>
        <p>
          Helios is a financial intelligence platform built to support fraud detection,
          credit-risk analysis, case review, and reporting for internal financial teams.
        </p>
        <p>
          The platform is designed as an operational layer on top of enterprise banking
          systems, helping analysts and managers monitor risk signals and review decisions.
        </p>
      </div>
      {openLogin ? <LoginModal onClose={() => setOpenLogin(false)} /> : null}
    </div>
  );
}