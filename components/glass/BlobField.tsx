export function BlobField() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="blob animate-blob-drift"
        style={{
          top: "-10%",
          left: "-5%",
          width: "520px",
          height: "520px",
          background: "radial-gradient(circle, #0191FC 0%, transparent 70%)",
        }}
      />
      <div
        className="blob animate-blob-drift-slow"
        style={{
          top: "30%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, #3454DA 0%, transparent 70%)",
          opacity: 0.4,
        }}
      />
      <div
        className="blob animate-blob-drift"
        style={{
          bottom: "-15%",
          left: "30%",
          width: "480px",
          height: "480px",
          background: "radial-gradient(circle, #7BB8FF 0%, transparent 70%)",
          opacity: 0.45,
        }}
      />
    </div>
  );
}
