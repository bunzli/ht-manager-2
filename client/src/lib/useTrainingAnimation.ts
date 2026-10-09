import { useLayoutEffect, useState, type RefObject } from "react";

interface TrainingAnimationOptions {
  current: number;
  previous: number;
  targetRef: RefObject<HTMLElement | null>;
  fillRef?: RefObject<HTMLElement | null>;
  labelRef?: RefObject<HTMLElement | null>;
  maxLevel?: number;
  fillColor?: string;
  previousFillColor?: string;
}

/** Animate a weekly comparison once the containing player card is fully visible. */
export function useTrainingAnimation({
  current,
  previous,
  targetRef,
  fillRef,
  labelRef,
  maxLevel,
  fillColor,
  previousFillColor,
}: TrainingAnimationOptions) {
  const [display, setDisplay] = useState({ value: current, complete: true });

  useLayoutEffect(() => {
    const target = targetRef.current;
    const fill = fillRef?.current;
    const whiteLabel = labelRef?.current;
    const delta = current - previous;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pct = maxLevel == null ? null : Math.max(0, Math.min((current / maxLevel) * 100, 100));
    const previousPct =
      maxLevel == null ? null : Math.max(0, Math.min((previous / maxLevel) * 100, 100));
    if (
      !target ||
      !Number.isFinite(delta) ||
      !delta ||
      (maxLevel != null && (!fill || !whiteLabel || previousPct === pct)) ||
      reducedMotion.matches ||
      typeof IntersectionObserver === "undefined" ||
      typeof target.animate !== "function"
    ) {
      setDisplay({ value: current, complete: true });
      return;
    }

    setDisplay({ value: previous, complete: false });
    const timing: KeyframeAnimationOptions = {
      duration: 800,
      delay: 200,
      easing: "ease-in-out",
      fill: "backwards",
    };
    // An empty visual effect gives TSI the same eased timeline as the skill bars.
    const animations =
      fill && whiteLabel && pct != null && previousPct != null
        ? [
            fill.animate(
              [
                {
                  width: `${previousPct}%`,
                  backgroundColor: previousFillColor ?? fill.style.backgroundColor,
                },
                { width: `${pct}%`, backgroundColor: fillColor ?? fill.style.backgroundColor },
              ],
              timing,
            ),
            whiteLabel.animate(
              [
                { clipPath: `inset(0 ${100 - previousPct}% 0 0)` },
                { clipPath: `inset(0 ${100 - pct}% 0 0)` },
              ],
              timing,
            ),
          ]
        : [target.animate([{}, {}], timing)];
    animations.forEach((animation) => animation.pause());
    let frameId = 0;
    const updateNumber = () => {
      if (animations[0].playState === "finished") {
        setDisplay({ value: current, complete: true });
        return;
      }
      const progress = animations[0].effect?.getComputedTiming().progress ?? 0;
      const nextValue = Math.round(previous + delta * progress);
      setDisplay((state) =>
        state.value === nextValue ? state : { value: nextValue, complete: false },
      );
      frameId = requestAnimationFrame(updateNumber);
    };
    const visibilityTarget = target.closest("article") ?? target;
    const visibilityThreshold = visibilityTarget === target ? 0.5 : 1;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold,
          )
        ) {
          animations.forEach((animation) => animation.play());
          frameId = requestAnimationFrame(updateNumber);
          observer.disconnect();
        }
      },
      { threshold: visibilityThreshold },
    );
    observer.observe(visibilityTarget);

    const onMotionChange = () => {
      if (reducedMotion.matches) {
        observer.disconnect();
        animations.forEach((animation) => animation.cancel());
        cancelAnimationFrame(frameId);
        setDisplay({ value: current, complete: true });
      }
    };
    reducedMotion.addEventListener("change", onMotionChange);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      animations.forEach((animation) => animation.cancel());
      cancelAnimationFrame(frameId);
    };
  }, [current, previous, targetRef, fillRef, labelRef, maxLevel, fillColor, previousFillColor]);

  return display;
}
