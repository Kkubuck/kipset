import React from "react";

function Zone({ level, children }) {
  if (!level) return null;
  return <g className={`muscle-zone ${level === 2 ? "primary" : "secondary"}`}>{children}</g>;
}

export default function BodyFigure({ muscles, type = "anterior", label }) {
  const primary = new Set(muscles.slice(0, 4));
  const selected = new Set(muscles);
  const level = (...names) => names.some((name) => primary.has(name)) ? 2 : names.some((name) => selected.has(name)) ? 1 : 0;
  const front = type === "anterior";

  return (
    <svg className="body-figure" viewBox="0 0 220 480" role="img" aria-label={label}>
      <image className="anatomy-base" href={`./anatomy/anatomy-${front ? "front" : "back"}.webp`} x="0" y="0" width="220" height="480" preserveAspectRatio="xMidYMid meet" aria-hidden="true" />

      {front ? (
        <g>
          <Zone level={level("front-deltoids")}><ellipse cx="76" cy="111" rx="15" ry="17" /><ellipse cx="144" cy="111" rx="15" ry="17" /></Zone>
          <Zone level={level("chest")}><path d="M83 112 C91 101 104 103 108 111 L108 143 C96 145 84 139 79 129 Z" /><path d="M137 112 C129 101 116 103 112 111 L112 143 C124 145 136 139 141 129 Z" /></Zone>
          <Zone level={level("biceps")}><path className="zone-stroke" d="M61 132 C57 147 54 161 52 175" /><path className="zone-stroke" d="M159 132 C163 147 166 161 168 175" /></Zone>
          <Zone level={level("forearm")}><path className="zone-stroke slim" d="M49 185 C45 207 39 227 34 246" /><path className="zone-stroke slim" d="M171 185 C175 207 181 227 186 246" /></Zone>
          <Zone level={level("abs")}>
            {[0, 1, 2].map((row) => <React.Fragment key={row}><rect x="96" y={151 + row * 25} width="12" height="20" rx="6" /><rect x="112" y={151 + row * 25} width="12" height="20" rx="6" /></React.Fragment>)}
          </Zone>
          <Zone level={level("obliques")}><path className="zone-stroke slim" d="M88 150 C83 174 84 202 90 221" /><path className="zone-stroke slim" d="M132 150 C137 174 136 202 130 221" /></Zone>
          <Zone level={level("quadriceps")}><path d="M83 280 C88 271 100 274 104 284 L99 354 C96 370 83 369 81 354 Z" /><path d="M137 280 C132 271 120 274 116 284 L121 354 C124 370 137 369 139 354 Z" /></Zone>
          <Zone level={level("adductor", "abductors")}><path d="M105 281 C109 276 111 276 115 281 L119 347 C116 357 112 358 110 348 C108 358 104 357 101 347 Z" /></Zone>
          <Zone level={level("calves")}><path d="M72 374 C82 370 91 381 87 402 L76 440 C72 447 67 441 68 428 Z" /><path d="M148 374 C138 370 129 381 133 402 L144 440 C148 447 153 441 152 428 Z" /></Zone>
        </g>
      ) : (
        <g>
          <Zone level={level("back-deltoids", "front-deltoids")}><ellipse cx="76" cy="111" rx="15" ry="17" /><ellipse cx="144" cy="111" rx="15" ry="17" /></Zone>
          <Zone level={level("trapezius")}><path d="M92 83 C97 92 101 100 110 105 C119 100 123 92 128 83 L139 112 C127 121 120 126 110 129 C100 126 93 121 81 112 Z" /></Zone>
          <Zone level={level("upper-back")}><path d="M80 117 C88 108 99 111 108 126 L108 179 C95 176 84 163 79 143 Z" /><path d="M140 117 C132 108 121 111 112 126 L112 179 C125 176 136 163 141 143 Z" /></Zone>
          <Zone level={level("triceps")}><path className="zone-stroke" d="M61 132 C57 150 54 164 52 178" /><path className="zone-stroke" d="M159 132 C163 150 166 164 168 178" /></Zone>
          <Zone level={level("forearm")}><path className="zone-stroke slim" d="M49 185 C45 207 39 227 34 246" /><path className="zone-stroke slim" d="M171 185 C175 207 181 227 186 246" /></Zone>
          <Zone level={level("lower-back")}><path d="M91 181 C101 174 119 174 129 181 L132 223 C121 231 99 231 88 223 Z" /></Zone>
          <Zone level={level("gluteal")}><path d="M82 232 C93 222 106 228 108 244 L105 299 C92 306 80 293 80 268 Z" /><path d="M138 232 C127 222 114 228 112 244 L115 299 C128 306 140 293 140 268 Z" /></Zone>
          <Zone level={level("hamstring")}><path d="M83 292 C90 280 101 286 104 302 L100 361 C96 374 84 371 81 354 Z" /><path d="M137 292 C130 280 119 286 116 302 L120 361 C124 374 136 371 139 354 Z" /></Zone>
          <Zone level={level("calves")}><path d="M72 374 C82 369 91 381 87 402 L76 440 C72 447 67 441 68 428 Z" /><path d="M148 374 C138 369 129 381 133 402 L144 440 C148 447 153 441 152 428 Z" /></Zone>
        </g>
      )}
    </svg>
  );
}
