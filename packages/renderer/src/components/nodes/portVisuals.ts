let portTelemetryStylesInjected = false;

export const ensurePortTelemetryStyles = () => {
  if (portTelemetryStylesInjected || typeof document === "undefined") {
    return;
  }
  portTelemetryStylesInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-voide", "port-telemetry");
  style.textContent = `
    @keyframes voide-port-input-pulse {
      0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.15); opacity: 0.85; }
      40% { box-shadow: 0 0 6px 4px rgba(56,189,248,0.35); opacity: 1; }
      100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); opacity: 0.85; }
    }

    @keyframes voide-port-output-pulse {
      0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.18); opacity: 0.85; }
      40% { box-shadow: 0 0 8px 4px rgba(249,115,22,0.42); opacity: 1; }
      100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); opacity: 0.85; }
    }
  `;
  document.head.appendChild(style);
};
