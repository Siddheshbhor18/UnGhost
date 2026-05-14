"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Rocket } from "lucide-react";

interface Props {
  active: boolean;
}

export function RocketLaunch({ active }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[2000] flex items-end justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
            animate={{ y: "-120vh", scale: 1.4, rotate: -10, opacity: [1, 1, 0] }}
            transition={{ duration: 1.1, ease: [0.5, -0.3, 0.6, 1.4] }}
            className="text-neon-pink mb-32"
            style={{ filter: "drop-shadow(0 0 24px var(--neon-pink))" }}
          >
            <Rocket size={88} strokeWidth={1.5} />
          </motion.div>
          {/* trail */}
          <motion.div
            className="absolute bottom-0 left-1/2 h-screen w-[6px] -translate-x-1/2 bg-gradient-to-t from-neon-pink via-neon-yellow to-transparent"
            initial={{ opacity: 0.9, scaleY: 0 }}
            animate={{ opacity: 0, scaleY: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
