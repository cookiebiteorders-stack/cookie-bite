/** Invisible SVG defs for feTurbulence / displacement (Seiðr warp) + glow. */
export function LokiSvgFilters() {
  return (
    <svg
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      aria-hidden
    >
      <defs>
        <filter id="seidr-warp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            id="seidr-turb"
            type="turbulence"
            baseFrequency="0.025 0.015"
            numOctaves={4}
            seed={7}
            result="noise"
          >
            <animate
              id="warp-anim"
              attributeName="baseFrequency"
              dur="0.6s"
              values="0.01 0.005;0.05 0.03;0.08 0.05;0.02 0.01"
              begin="indefinite"
              fill="freeze"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
            result="warped"
          >
            <animate
              id="displace-anim"
              attributeName="scale"
              values="0;18;32;8;0"
              dur="0.65s"
              begin="indefinite"
              fill="freeze"
            />
          </feDisplacementMap>
        </filter>

        <filter id="turbulence-0" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.0001"
            numOctaves={1}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter id="turbulence-max" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.035 0.02"
            numOctaves={3}
            seed={2}
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="0.4s"
              values="0.02 0.01;0.05 0.03;0.02 0.01"
              repeatCount={1}
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={28}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter id="loki-glow" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={3} result="blur" />
          <feFlood floodColor="#00FF88" floodOpacity={0.6} result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
