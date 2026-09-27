<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-slate-50 dark:bg-slate-950"
    role="status"
    aria-label="Memuat"
  >
    <div class="flex flex-col items-center gap-5">
      <div class="relative size-16">
        <div class="absolute inset-0 animate-ping rounded-2xl bg-brand-500/20" />
        <div
          class="relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-xl shadow-brand-600/30"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <rect x="2" y="5" width="20" height="14" rx="3" />
            <path d="M2 10h20M6 15h4" />
          </svg>
        </div>
      </div>
      <div class="h-1 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div class="h-full w-1/3 animate-progress rounded-full bg-brand-500" />
      </div>
    </div>
  </div>
</template>
