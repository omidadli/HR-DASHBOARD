import React, { useEffect, useRef, useState } from 'react';

interface TypewriterProps {
  /** Full text lines; typed sequentially, '\n' joins them. */
  lines: string[];
  /** Milliseconds per character. */
  speed?: number;
  /** Initial pause before the first character (ms). */
  startDelay?: number;
  /** Extra pause between lines (ms). */
  linePause?: number;
  onDone?: () => void;
  className?: string;
  showCursor?: boolean;
}

/**
 * هوشا's typewriter text: types `lines` character by character with a
 * blinking brand cursor, then fires onDone exactly once.
 * State-driven (character count) so it stays correct under StrictMode.
 */
export const Typewriter: React.FC<TypewriterProps> = ({
  lines,
  speed = 26,
  startDelay = 250,
  linePause = 320,
  onDone,
  className,
  showCursor = true,
}) => {
  const full = lines.join('\n');
  const [count, setCount] = useState(0);
  const doneFired = useRef(false);

  useEffect(() => {
    setCount(0);
    doneFired.current = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let i = 0;

    const step = () => {
      if (cancelled) return;
      i += 1;
      setCount(i);
      if (i >= full.length) return;
      const justTyped = full[i - 1];
      timer = setTimeout(step, justTyped === '\n' ? linePause : speed);
    };

    timer = setTimeout(step, startDelay);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [full, speed, startDelay, linePause]);

  const done = count >= full.length;
  useEffect(() => {
    if (done && !doneFired.current) {
      doneFired.current = true;
      onDone?.();
    }
  }, [done, onDone]);

  const parts = full.slice(0, count).split('\n');

  return (
    <span className={className} aria-label={full}>
      {parts.map((p, idx) => (
        <span key={idx} className="block">
          {p}
          {p === '' && idx < parts.length - 1 ? '\u00A0' : null}
          {showCursor && idx === parts.length - 1 && !done ? (
            <span className="inline-block w-[2px] h-[1.1em] bg-brand align-middle mr-0.5 rounded-full animate-pulse" />
          ) : null}
        </span>
      ))}
    </span>
  );
};
