import { useEffect, useRef } from "react";

export default function ReviewConfirmation({ item, saving, error, onConfirm, onCancel }) {
  const dialog = useRef(null);
  useEffect(() => {
    // Native modal behavior traps focus and restores it to the checkbox on close.
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog ref={dialog} className="review-confirmation" aria-labelledby="review-confirm-title"
      aria-describedby="review-confirm-description"
      onCancel={(event) => { event.preventDefault(); if (!saving) onCancel(); }}>
      <h2 id="review-confirm-title">{item.reviewed_at ? "Mark transaction as not reviewed?" : "Mark transaction as reviewed?"}</h2>
      <p id="review-confirm-description">{item.reviewed_at ? "This will clear its review checkmark. The model prediction and case decision stay the same." : "Confirm that you have checked this transaction. This does not change the model prediction or case decision."}</p>
      <p className="review-confirmation__id">{item.transaction_id}</p>
      {error && <p role="alert">{error}</p>}
      {saving && <p role="status">Saving review status…</p>}
      <div className="review-confirmation__actions">
        <button type="button" onClick={onCancel} disabled={saving} autoFocus>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={saving}>{saving ? "Saving…" : item.reviewed_at ? "Mark not reviewed" : "Mark reviewed"}</button>
      </div>
    </dialog>
  );
}
