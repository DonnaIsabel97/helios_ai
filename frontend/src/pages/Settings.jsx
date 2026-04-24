import "../style/Settings.css";

export default function Settings() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <section className="panel settings-panel">
        <label>
          Notifications
          <select>
            <option>Enabled</option>
            <option>Disabled</option>
          </select>
        </label>

        <label>
          Theme
          <select>
            <option>Default</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </label>

        <label>
          Review Mode
          <select>
            <option>Standard</option>
            <option>Strict</option>
          </select>
        </label>
      </section>
    </div>
  );
}