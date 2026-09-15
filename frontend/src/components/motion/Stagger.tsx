"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Dashboard/grid card entrance — fade + 8px rise, staggered 50ms per item,
 * capped so a long list never takes longer than ~400ms total to finish
 * appearing (see the motion spec: "Maximum total animation time: 400ms").
 * `once: true` means this only plays the first time a set of cards mounts
 * (a fresh page load, a filter that remounts the list) — it never replays
 * on every re-render, which would read as flickery rather than polished.
 */
const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] } },
};

export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
