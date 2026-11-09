import type { JSX } from "solid-js";

/**
 * A card row. Horizontal overflow is left to the browser's native touch/trackpad
 * handling; the mouse wheel is intentionally not intercepted. Pages show a
 * "更多" action when they need to reveal the full collection.
 */
export function Shelf(props: { class?: string; children: JSX.Element }) {
  return (
    <div class={`shelf ${props.class ?? ""}`}>
      {props.children}
    </div>
  );
}
