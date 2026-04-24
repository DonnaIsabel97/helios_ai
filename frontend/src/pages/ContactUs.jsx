import NavbarHome from "../components/NavbarHome";
import { useState } from "react";
import LoginModal from "../modals/LoginModal";
import "../style/ContactUs.css";

export default function ContactUs() {
  const [openLogin, setOpenLogin] = useState(false);

  return (
    <div className="simple-page">
      <NavbarHome onLoginClick={() => setOpenLogin(true)} />
      <div className="simple-page__content">
        <h1>Contact Us</h1>

        <form className="contact-form">
          <label>Name</label>
          <input type="text" placeholder="Your name" />

          <label>Email</label>
          <input type="email" placeholder="Your email" />

          <label>Message</label>
          <textarea rows="6" placeholder="How can we help?" />

          <button type="button">Send Message</button>
        </form>
      </div>
      {openLogin ? <LoginModal onClose={() => setOpenLogin(false)} /> : null}
    </div>
  );
}