import { useState } from "react";
import "../style/UploadProfileImagge.css";

export default function UploadProfileImageModal({ onClose, onSave }) {
  const [fileName, setFileName] = useState("");

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      onSave(reader.result);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Change Profile Image</h2>
        <p>Select an image from your device.</p>

        <label className="upload-modal__picker">
          Upload image
          <input type="file" accept="image/*" onChange={chooseFile} />
        </label>

        {fileName ? <div className="upload-modal__filename">{fileName}</div> : null}

        <div className="modal-actions">
          <button className="modal-btn modal-btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}