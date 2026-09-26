"use client";
import { Children, PropsWithChildren } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function Stagger({ children, delayBase = 0.04 }: PropsWithChildren<{ delayBase?: number }>) {
  const prefersReduced = useReducedMotion();
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.22, delay: Math.min(i, 8) * delayBase, ease: [0.2, 0.7, 0.2, 1] }}
          style={{ willChange: "opacity, transform" }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}

