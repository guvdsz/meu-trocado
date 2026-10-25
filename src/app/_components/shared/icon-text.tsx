"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keeps a square icon aligned with its text, including when the text wraps. */
export function IconText({
  icon,
  children,
  className,
  textClassName,
}: {
  icon: ReactNode;
  children: ReactNode;
  className: string;
  textClassName: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = text.current;
    const wrapper = container.current;
    if (!element || !wrapper) return;
    const measure = () => {
      // Very long descriptions must still leave enough room for readable text.
      const size = Math.min(element.getBoundingClientRect().height, 112);
      wrapper.style.setProperty("--text-icon-size", `${size}px`);
    };
    measure();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={container} className={`icon-text grid grid-cols-[var(--text-icon-size,72px)_minmax(0,1fr)] items-start ${className}`}>
      {icon}
      <div ref={text} className={textClassName}>
        {children}
      </div>
    </div>
  );
}
