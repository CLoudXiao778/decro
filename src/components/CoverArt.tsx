import { For } from "solid-js";

export function BrandMark(props: { size?: number; class?: string; splash?: boolean }) {
  const size = () => props.size ?? 24;
  return (
    <svg
      class={props.class}
      width={size()}
      height={size()}
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
    >
      <path
        class={props.splash ? "splash-c" : undefined}
        d="M118 32C106 22 92 17 78 17C44 17 17 44 17 80C17 116 44 143 78 143C92 143 106 138 118 128L100 104C93 110 86 113 78 113C60 113 45 98 45 80C45 62 60 47 78 47C86 47 93 50 100 56L118 32Z"
        fill="currentColor"
      />
      <path
        d="M36 87C50 75 64 75 78 87C92 99 106 99 124 87"
        stroke="currentColor"
        stroke-width="5"
        stroke-linecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function CoverArt(props: {
  palette: [string, string, string, string];
  seed?: number;
  class?: string;
  label?: string;
  showLabel?: boolean;
}) {
  const seed = () => props.seed ?? 0;
  return (
    <div
      class={`cover-art ${props.class ?? ""}`}
      data-seed={seed()}
      style={{
        "--c1": props.palette[0],
        "--c2": props.palette[1],
        "--c3": props.palette[2],
        "--c4": props.palette[3],
        "--seed": `${seed()}`,
      }}
    >
      <div class="cover-art__wash" />
      <div class="cover-art__blob cover-art__blob--a" />
      <div class="cover-art__blob cover-art__blob--b" />
      <div class="cover-art__blob cover-art__blob--c" />
      <div class="cover-art__grain" />
      {props.showLabel !== false && (
        <div class="cover-art__label">
          <span>{props.label ?? "CIRRO"}</span>
          <i />
        </div>
      )}
    </div>
  );
}

export function CoverStack(props: { palettes: [string, string, string, string][]; class?: string }) {
  return (
    <div class={`cover-stack ${props.class ?? ""}`}>
      <For each={props.palettes.slice(0, 3)}>
        {(palette, i) => (
          <CoverArt
            palette={palette}
            seed={i() + 3}
            class="cover-stack__item"
            showLabel={false}
          />
        )}
      </For>
    </div>
  );
}
