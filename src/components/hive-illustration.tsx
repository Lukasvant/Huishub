import clsx from "clsx";

export function HiveIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={clsx("h-auto w-full text-sage-600", className)}
      fill="none"
      viewBox="0 0 420 320"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M70 229c21-67 69-122 134-136 73-16 137 24 153 82 16 60-29 107-104 117-83 11-203 1-183-63Z"
        fill="#fffdf8"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M79 238c55 21 191 24 264-3"
        stroke="#1a1a1a"
        strokeLinecap="round"
        strokeOpacity=".16"
        strokeWidth="3"
      />
      <path d="M128 221c6-78 46-142 92-142 47 0 85 64 91 142" fill="#efe0d3" />
      <path
        d="M128 221c6-78 46-142 92-142 47 0 85 64 91 142"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M151 130c39 12 102 12 139 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M137 169c45 13 123 13 167 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M129 208c50 12 135 12 184 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path d="M195 237v-28c0-16 11-29 25-29s25 13 25 29v28" fill="#1a1a1a" />
      <path
        d="M185 94c10-30 27-50 36-50 8 0 26 20 35 50"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M169 78c14-9 29-13 47-13 20 0 39 5 56 15"
        stroke="#1a1a1a"
        strokeLinecap="round"
        strokeOpacity=".18"
        strokeWidth="3"
      />
      <path
        d="M324 118c25-35 48-23 43 0-5 22-33 25-54 5-18-17-10-42 13-43"
        stroke="currentColor"
        strokeDasharray="5 10"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <g transform="translate(340 73)">
        <ellipse cx="13" cy="11" fill="#e9fbfd" rx="13" ry="9" />
        <ellipse cx="31" cy="11" fill="#e9fbfd" rx="13" ry="9" />
        <path
          d="M16 24c3-12 9-18 17-18 10 0 18 9 18 21 0 13-8 23-19 23-9 0-16-8-17-18"
          fill="#fffdf8"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M28 10v37M40 16c-4 7-4 17 0 27"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle cx="21" cy="22" fill="#1a1a1a" r="2.5" />
      </g>
      <g stroke="currentColor" strokeLinecap="round" strokeWidth="3">
        <path d="M82 172h28" />
        <path d="M96 158v28" />
        <path d="M327 252h24" />
        <path d="M339 240v24" />
      </g>
      <g fill="#c9f3f7">
        <path d="M88 101h24v24H88z" transform="rotate(30 100 113)" />
        <path d="M301 91h18v18h-18z" transform="rotate(30 310 100)" />
      </g>
    </svg>
  );
}
