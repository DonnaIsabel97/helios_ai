import { useState } from "react";
import UploadProfileImageModal from "../modals/UploadProfileImageModal";
import "../style/Account.css";

export default function Account() {
  const [openUpload, setOpenUpload] = useState(false);
  const [profileImage, setProfileImage] = useState("");

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    user = {};
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>Account</h1>
      </div>

      <section className="account-profile">
        <div className="account-profile__avatar-wrap">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="account-profile__avatar-image" />
          ) : (
            <div className="account-profile__avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          <button onClick={() => setOpenUpload(true)}>Change Image</button>
        </div>

        <div className="account-profile__info">
          <h2>{user?.full_name || "User Name"}</h2>
          <p>Role: {user?.role || "Analyst"}</p>
          <p>Email: {user?.email || "email@example.com"}</p>
        </div>
      </section>

      <div className="account-grid">
        <section className="panel">
          <h2>Assigned Cases</h2>
          <ul className="timeline">
            <li>CASE-F-12</li>
            <li>CASE-C-08</li>
            <li>CASE-F-03</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Actions Taken</h2>
          <ul className="timeline">
            <li>Approved application APP123</li>
            <li>Escalated transaction TX123</li>
            <li>Closed case CASE-F-02</li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Notes</h2>
        <textarea rows="5" placeholder="User notes..." />
      </section>

      {openUpload ? (
        <UploadProfileImageModal
          onClose={() => setOpenUpload(false)}
          onSave={setProfileImage}
        />
      ) : null}
    </div>
  );
}