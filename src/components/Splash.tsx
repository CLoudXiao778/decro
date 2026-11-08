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
          d="M118 32C106 22 92 17 78 17C44 17 17 44 17 80C17 116 44 143 78 143C92 143 106 138 118 128L100 104C93 110 86 113 78 113C60 113 45 98 45 80C45 62 60 47 78 47C86 47 93 50 100 56L118 32Z"
          fill="var(--splash-ink)"
        />
        <path
          class="splash__stroke"
          pathLength="1"
          d="M118 32C106 22 92 17 78 17C44 17 17 44 17 80C17 116 44 143 78 143C92 143 106 138 118 128L100 104C93 110 86 113 78 113C60 113 45 98 45 80C45 62 60 47 78 47C86 47 93 50 100 56L118 32Z"
          stroke="var(--splash-ink)"
          stroke-width="6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          class="splash__wave"
          pathLength="1"
          d="M36 87C50 75 64 75 78 87C92 99 106 99 124 87"
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
