export default function MathScene({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`math-scene ${compact ? 'math-scene-compact' : ''}`}
      viewBox="0 0 560 390"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="287" cy="197" r="160" fill="#e9efff" />
      <circle cx="287" cy="197" r="185" stroke="#cbd9fb" strokeDasharray="3 9" />
      <g transform="rotate(-8 254 183)">
        <rect x="106" y="64" width="301" height="248" rx="18" fill="#d2ddfb" />
        <rect x="99" y="54" width="301" height="248" rx="18" fill="white" stroke="#b7c8f5" />
        <path
          d="M122 90h255M122 126h255M122 162h255M122 198h255M122 234h255M147 76v200M183 76v200M219 76v200M255 76v200M291 76v200M327 76v200M363 76v200"
          stroke="#e9eef8"
        />
        <circle cx="251" cy="177" r="89" fill="#eef3ff" stroke="#2458ed" strokeWidth="3" />
        <path
          d="M162 177h178L251 88Z"
          fill="white"
          fillOpacity=".65"
          stroke="#2458ed"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="m240 99 11 11 11-11" stroke="#f3695d" strokeWidth="2.5" />
        <path d="M251 88v89" stroke="#91a8e0" strokeWidth="2" strokeDasharray="4 5" />
        <circle cx="251" cy="177" r="4" fill="#f3695d" />
        <circle cx="251" cy="88" r="5" fill="#f3695d" />
        <circle cx="162" cy="177" r="5" fill="#2458ed" />
        <circle cx="340" cy="177" r="5" fill="#2458ed" />
        <g fill="#586f9f" fontFamily="Georgia,serif" fontStyle="italic" fontSize="16">
          <text x="245" y="78">
            A
          </text>
          <text x="143" y="181">
            B
          </text>
          <text x="349" y="181">
            C
          </text>
          <text x="257" y="195">
            O
          </text>
        </g>
        <path d="M216 282h72" stroke="#d9e3f9" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="rotate(10 400 246)">
        <rect x="326" y="169" width="145" height="145" rx="18" fill="#ffd15a" />
        <path
          d="M349 195v94h99Z"
          fill="#fff5ce"
          stroke="#825e12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M349 275h14v14" stroke="#825e12" strokeWidth="2" />
        <path d="M421 289a27 27 0 0 0-8-19" stroke="#f3695d" strokeWidth="3" />
        <g fill="#825e12" fontFamily="Georgia,serif" fontSize="16" fontStyle="italic">
          <text x="333" y="246">
            3
          </text>
          <text x="390" y="306">
            4
          </text>
          <text x="404" y="233">
            5
          </text>
        </g>
      </g>
      <g transform="rotate(-8 145 288)">
        <rect x="52" y="259" width="176" height="62" rx="15" fill="#2458ed" />
        <text x="78" y="301" fill="white" fontFamily="Georgia,serif" fontSize="33">
          √49 = 7
        </text>
      </g>
      <circle cx="427" cy="80" r="31" fill="#f3695d" />
      <path d="M414 80h26m-13-13v26" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <path d="m79 159 7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2Z" fill="#ffd15a" />
      <circle cx="470" cy="151" r="6" fill="#2458ed" />
      <circle cx="263" cy="337" r="5" fill="#f3695d" />
      <path
        d="m324 40 5 5m-5 0 5-5M491 293l7 7m-7 0 7-7"
        stroke="#2458ed"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
