"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, CreditCard, Building2, Check } from "lucide-react";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";

interface Props {
  open: boolean;
  bootcampId: string;
  bootcampTitle: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

type Method = "UPI" | "CARD" | "NETBANKING";

export function PhonePeDrawer({ open, bootcampId, bootcampTitle, amount, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<Method>("UPI");
  const [mobile, setMobile] = useState("9898 98XXXX");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function pay() {
    setBusy(true);
    await fetch("/api/payments/phonepe/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bootcampId, amount, method, mobile }),
    });
    await new Promise((r) => setTimeout(r, 1100));
    await fetch("/api/payments/phonepe/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bootcampId, status: "SUCCESS" }),
    });
    setDone(true);
    setBusy(false);
    setTimeout(() => {
      onSuccess();
      onClose();
      setDone(false);
    }, 1200);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-bg-panel border-l-2 border-neon-purple overflow-y-auto"
          >
            <div className="border-b-2 border-bg-ink px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-pixel text-[10px] text-neon-purple">▸ PHONEPE CHECKOUT</p>
                <p className="font-mono text-[10px] text-ink-muted">Secured by 256-bit imagination</p>
              </div>
              <button onClick={onClose} className="text-ink-muted hover:text-neon-red"><X size={20} /></button>
            </div>

            {done ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-neon-green mb-3"
                  style={{ filter: "drop-shadow(0 0 16px var(--neon-green))" }}
                >
                  <Check size={80} />
                </motion.div>
                <p className="font-pixel text-lg text-neon-green neon-text">PAYMENT OK</p>
                <p className="font-mono text-xs text-ink-muted mt-2">Unlocking your bootcamp…</p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* order */}
                <div className="border-2 border-bg-ink bg-bg-base p-4">
                  <p className="font-pixel text-[10px] text-ink-muted mb-1">▸ ORDER</p>
                  <p className="font-pixel text-sm text-neon-pink">{bootcampTitle}</p>
                  <p className="font-pixel text-2xl text-neon-green neon-text mt-3">₹{amount.toLocaleString("en-IN")}</p>
                </div>

                <div>
                  <p className="font-pixel text-[10px] text-ink-muted mb-2">▸ MOBILE NUMBER</p>
                  <input className="pixel-input w-full" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>

                <div>
                  <p className="font-pixel text-[10px] text-ink-muted mb-2">▸ PAYMENT METHOD</p>
                  <div className="grid grid-cols-3 gap-2">
                    <MethodBtn icon={<Smartphone size={18} />} label="UPI" active={method === "UPI"} onClick={() => setMethod("UPI")} />
                    <MethodBtn icon={<CreditCard size={18} />} label="CARD" active={method === "CARD"} onClick={() => setMethod("CARD")} />
                    <MethodBtn icon={<Building2 size={18} />} label="NB" active={method === "NETBANKING"} onClick={() => setMethod("NETBANKING")} />
                  </div>
                </div>

                <Badge tone="yellow">DEMO · NO REAL CHARGE</Badge>

                <PixelButton variant="green" size="lg" block onClick={pay} disabled={busy}>
                  {busy ? "PROCESSING…" : `Pay ₹${amount.toLocaleString("en-IN")} via ${method}`}
                </PixelButton>

                <p className="font-mono text-[10px] text-ink-dim text-center">
                  In production, this triggers PhonePe&apos;s /pg/v1/pay and waits on the signed webhook.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MethodBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 border-2 py-3 transition-colors ${
        active ? "border-neon-purple text-neon-purple bg-neon-purple/10" : "border-bg-ink text-ink-muted hover:border-neon-purple hover:text-neon-purple"
      }`}
    >
      {icon}
      <span className="font-pixel text-[9px]">{label}</span>
    </button>
  );
}
