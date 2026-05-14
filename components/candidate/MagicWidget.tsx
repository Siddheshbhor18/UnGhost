"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Upload, X, Zap } from "lucide-react";
import { PixelButton } from "@/components/arcade/PixelButton";

export function MagicWidget() {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setFilename(file.name);
    setScanning(true);
    const text = `Filename: ${file.name}\nSize: ${file.size}\n[Mock parse of resume]`;
    sessionStorage.setItem("ng_pending_resume", text);
    await new Promise((r) => setTimeout(r, 1600));
    router.push("/login?next=/onboarding");
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 border-2 border-neon-pink bg-bg-panel px-4 py-3 font-pixel text-[10px] text-neon-pink shadow-pixel-neon-pink hover:bg-neon-pink hover:text-black transition-colors"
        whileHover={{ x: -2, y: -2 }}
        whileTap={{ x: 2, y: 2 }}
      >
        <Zap size={14} className="animate-pulse" />
        MAGIC WIDGET
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-40 w-[360px] pixel-card border-neon-pink shadow-pixel-neon-pink"
          >
            <div className="flex items-center justify-between border-b-2 border-bg-ink px-4 py-3">
              <span className="font-pixel text-[10px] text-neon-pink">RESUME → MATCHES</span>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-neon-red">
                <X size={16} />
              </button>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) void handleFile(f);
              }}
              className={`relative overflow-hidden p-6 text-center ${dragging ? "bg-neon-pink/10" : ""}`}
            >
              {/* Laser scan during processing */}
              {scanning && (
                <motion.div
                  className="absolute inset-y-0 w-[3px] z-10"
                  style={{
                    background: "var(--neon-blue)",
                    boxShadow: "0 0 24px 4px var(--neon-blue), 0 0 60px 10px var(--neon-blue)",
                  }}
                  initial={{ left: "-5%" }}
                  animate={{ left: "105%" }}
                  transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                />
              )}
              <Upload className="mx-auto text-neon-blue" size={36} />
              <p className="mt-3 font-mono text-xs text-ink-primary">
                Drop your <span className="text-neon-blue">.pdf</span> resume
              </p>
              <p className="mt-1 font-mono text-[10px] text-ink-muted">
                or pick a file
              </p>
              {filename && (
                <p className="mt-2 font-mono text-[10px] text-neon-green">
                  {scanning ? "SCANNING" : "READY"} · {filename}
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <div className="mt-4">
                <PixelButton
                  variant="pink"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={scanning}
                >
                  {scanning ? "Parsing…" : "Pick file"}
                </PixelButton>
              </div>
              <p className="mt-3 font-mono text-[9px] text-ink-dim">
                Or just <a href="/login" className="text-neon-blue underline">create an account</a> first.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
