export const VideoCallPanel = ({ roomUrl, onLeave }) => {
  if (!roomUrl) return null;

  return (
    <div data-testid="video-call-panel" style={{ position: "relative" }}>
      <iframe
        src={roomUrl}
        allow="camera; microphone; autoplay; display-capture; fullscreen"
        title="Video Call"
        style={{
          width: "100%",
          height: "400px",
          border: "0",
          borderRadius: "8px",
          background: "#0f172a",
        }}
      />
      <button
        onClick={onLeave}
        data-testid="end-call-inline-btn"
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "6px 14px",
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        End Call
      </button>
    </div>
  );
};
