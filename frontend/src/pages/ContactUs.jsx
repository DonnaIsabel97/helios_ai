import NavbarHome from "../components/NavbarHome";
import Footer from "../components/Footer";
import { useState } from "react";
import LoginModal from "../modals/LoginModal";
import "../style/ContactUs.css";

export default function ContactUs() {
  const [openLogin, setOpenLogin] = useState(false);

  const [formData, setFormData] = useState({
    fullName:"",
    email: "",
    organisation: "",
    message: "",
  });

  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  function handleChange(e) {
    const {name, value} = e.target;
    setFormData((prev) => ({
      ...prev, 
      [name]: value,
    }));
  }

  async function handleSubmit (e){
    e.preventDefault();

    setStatus({
      loading: true,
      error:"",
      success:"",
    });

    try {
        const response = await fetch ("https://helios-ai-0cfp.onrender.com/api/contactForm", {
          method: "POST",
          headers: {
            "Content-Type" : "applicant/json",
          },
          node: JSON.stringify(formData),
        });

        const text = await response.text();
        let data = {};

        try{
          data = JSON.parse(text);
        } catch {
          data = { error: "Server returned an unexpected response."};
        }

        if (!response.ok){
          throw new Error(data?.error || "Something went wrong.");
        }
        
        setStatus({
          loading: false,
          error:"",
          success:"",
        });

        setFormData({
          fullName:"",
          email:"",
          organisation:"",
          message:"",
        });
    } catch (error){
      setStatus({
        loading:false,
        error: error.message || "Failed to send message.",
        success: "",
      });
    }
  }


  return (
    <div className="simple-page">
      <NavbarHome onLoginClick={() => setOpenLogin(true)} />

      <div className="simple-page__content">

        <h1>Let's <em>talk.</em></h1>
        <div className="contact-rule" />
        <p className="contact-sub">
          Have a question about Helios, or want to see the platform in action?
          Fill in the form and our team will get back to you within one business day.
        </p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label htmlFor="contact-name">Name *</label>
          <input id="contact-name" type="text" placeholder="Your full name"  value={formData.fullName} onChange={handleChange} required/>

          <label htmlFor="contact-email">Email *</label>
          <input id="contact-email" type="email" placeholder="you@institution.com" value={formData.email} onChange={handleChange} required/>

          <label htmlFor="contact-org">Organisation</label>
          <input id="contact-org" type="text" placeholder="Bank, fintech, or firm name" value={formData.organisation} onChange={handleChange} />

          <label htmlFor="contact-msg">Message</label>
          <textarea id="contact-msg" rows="6" placeholder="How can we help?"  value={formData.message} onChange={handleChange} />

          {status.error ? (
            <p className="contact_status contact_status_error">{status.error}</p>
          ) : null }

          {status.success ? (
            <p className="contact_status contact_status_success">{status.success}</p>
          ) : null }

          <button type="submit" disabled={status.loading}>{status.loading ? "Sending..." : "send"}</button>
        </form>

        <div className="contact-info">
          <div className="contact-info__item">
            <span className="contact-info__label">General enquiries</span>
            <span className="contact-info__value">hello@helios.ai</span>
          </div>
          <div className="contact-info__item">
            <span className="contact-info__label">Response time</span>
            <span className="contact-info__value">Within one business day</span>
          </div>
        </div>

      </div>

      {openLogin && <LoginModal onClose={() => setOpenLogin(false)} />}
      <Footer />
    </div>
  );
}