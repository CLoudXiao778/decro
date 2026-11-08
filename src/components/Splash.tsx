import { createSignal, onCleanup, onMount } from "solid-js";

export function Splash(props: { onDone: () => void }) {
  const [skipping, setSkipping] = createSignal(false);
  let done = false;
  let timer: number | undefined;

  const finish = () => {
    if (done) return;
    done = true;
    props.onDone();
  };

  const skip = () => {
    if (skipping()) return;
    setSkipping(true);
    window.setTimeout(finish, 200);
  };

  onMount(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer = window.setTimeout(finish, reduced ? 450 : 2050);
  });
  onCleanup(() => window.clearTimeout(timer));

  return (
    <div
      class="splash"
      classList={{ "is-skipping": skipping() }}
      onClick={skip}
      role="presentation"
      title="点击跳过"
    >
      <div class="splash__glow" />
      <svg class="splash__mark" viewBox="0 0 160 160" fill="none" aria-hidden="true">
        <path
          class="splash__fill"
          d="M40 20H78C112 20 136 45 136 80C136 115 112 140 78 140H40V20ZM62 44V116H78C100 116 112 101 112 80C112 59 100 44 78 44H62Z"
          fill="var(--splash-ink)"
          fill-rule="evenodd"
        />
        <path
          class="splash__stroke"
          pathLength="1"
          d="M40 20H78C112 20 136 45 136 80C136 115 112 140 78 140H40V20ZM62 44V116H78C100 116 112 101 112 80C112 59 100 44 78 44H62Z"
          stroke="var(--splash-ink)"
          fill="none"
          stroke-width="6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          class="splash__wave"
          pathLength="1"
          d="M52 84C66 72 80 72 94 84C104 92 114 92 122 86"
          stroke="var(--splash-ink)"
          stroke-width="5"
          stroke-linecap="round"
          opacity="0.75"
        />
      </svg>
      <span class="splash__hint">点击任意处跳过</span>
    </div>
  );
}
