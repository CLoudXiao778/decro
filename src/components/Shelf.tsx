import { onCleanup, onMount, type JSX } from "solid-js";

/**
 * Horizontal card rail. The mouse wheel scrolls the rail left/right while the
 * pointer is over it; at either end the page scroll takes over again. Touch and
 * trackpad horizontal gestures keep their native behaviour.
 */
export function Shelf(props: { class?: string; children: JSX.Element }) {
  let rail!: HTMLDivElement;

  onMount(() => {
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const max = rail.scrollWidth - rail.clientWidth;
      if (max <= 1) return;

      const atStart = rail.scrollLeft <= 0;
      const atEnd = rail.scrollLeft >= max - 1;
      if ((event.deltaY > 0 && atEnd) || (event.deltaY < 0 && atStart)) return;

      event.preventDefault();
      const unit =
        event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? rail.clientWidth : 1;
      const next = rail.scrollLeft + event.deltaY * unit;
      rail.scrollLeft = Math.max(0, Math.min(max, next));
    };

    rail.addEventListener("wheel", onWheel, { passive: false });
    onCleanup(() => rail.removeEventListener("wheel", onWheel));
  });

  return (
    <div ref={rail} class={`shelf ${props.class ?? ""}`}>
      {props.children}
    </div>
  );
}
