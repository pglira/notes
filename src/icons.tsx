// Line icons on a 24 × 24 grid with one stroke width and square ends, so that
// all icons have the same weight. The icons use the current text color.
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  auto: 'M12 4a8 8 0 0 1 0 16a8 8 0 0 1 0-16zM12 4v16',
  sun: 'M12 8a4 4 0 0 1 0 8a4 4 0 0 1 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  moon: 'M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z',
  check: 'M5 12l5 5L19 7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  share: 'M12 15V4M7 9l5-5l5 5M5 13v7h14v-7',
  archive: 'M4 5h16v4H4zM5 9v10h14V9M10 13h4',
  unarchive: 'M4 5h16v4H4zM5 9v10h14V9M12 18v-6M9 15l3-3l3 3',
  image: 'M4 5h16v14H4zM4 16l5-5l4 4l2-2l5 5M15 9.5a0.5 0.5 0 1 0 0.01 0',
  back: 'M15 5l-7 7l7 7',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="svg-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
