import { createEffect, createSignal, For, on, Show } from "solid-js";

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
        d="M40 20H78C112 20 136 45 136 80C136 115 112 140 78 140H40V20ZM62 44V116H78C100 116 112 101 112 80C112 59 100 44 78 44H62Z"
        fill="currentColor"
        fill-rule="evenodd"
      />
      <path
        d="M52 84C66 72 80 72 94 84C104 92 114 92 122 86"
        fill="none"
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
  url?: string;
}) {
  const seed = () => props.seed ?? 0;
  const [failed, setFailed] = createSignal(false);
  createEffect(on(() => props.url, () => setFailed(false)));
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
      <Show when={props.url && !failed()}>
        <img
          class="cover-art__img"
          src={props.url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </Show>
      {props.showLabel !== false && (
        <div class="cover-art__label">
          <span>{props.label ?? "DECRO"}</span>
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
