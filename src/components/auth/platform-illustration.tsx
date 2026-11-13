import { Store, Package, ChartNoAxesColumn, ShoppingBag } from "lucide-react";
export function PlatformIllustration() {
  return (
    <aside className="auth-platform" aria-label="SERVQO platform">
      <div className="auth-platform-copy">
        <span className="auth-accent" />
        <h2>
          One platform.
          <br />
          Different business needs.
        </h2>
        <div className="auth-features">
          <span>
            <Store size={19} />
            Storefront
          </span>
          <span>
            <Package size={19} />
            Orders
          </span>
          <span>
            <ChartNoAxesColumn size={19} />
            Insights
          </span>
        </div>
      </div>
      <div className="auth-path-scene" aria-hidden="true">
        <svg viewBox="0 0 650 600" fill="none" className="auth-winding-path">
          <defs>
            <linearGradient
              id="road-edge"
              x1="110"
              y1="0"
              x2="540"
              y2="600"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a3b69f" />
              <stop offset=".5" stopColor="#7e987b" />
              <stop offset="1" stopColor="#c4d5bc" />
            </linearGradient>
            <linearGradient
              id="road-top"
              x1="100"
              y1="100"
              x2="650"
              y2="600"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#e1ebd9" />
              <stop offset=".5" stopColor="#bbcfb2" />
              <stop offset="1" stopColor="#eff4e6" />
            </linearGradient>
            <filter
              id="road-shadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="15" />
            </filter>
            <radialGradient id="ball-light" cx=".3" cy=".2" r=".8">
              <stop stopColor="#fff" />
              <stop offset=".45" stopColor="#e4eddc" />
              <stop offset="1" stopColor="#80977b" />
            </radialGradient>
          </defs>
          <path
            d="M-100 660C80 660 230 590 180 500C150 445 65 480 55 405C40 310 195 305 280 365C375 435 535 430 535 310C535 240 390 250 392 180C392 80 610 80 730 120"
            transform="translate(0 35)"
            stroke="#3a583b"
            strokeWidth="116"
            opacity=".2"
            filter="url(#road-shadow)"
          />
          <path
            d="M-100 660C80 660 230 590 180 500C150 445 65 480 55 405C40 310 195 305 280 365C375 435 535 430 535 310C535 240 390 250 392 180C392 80 610 80 730 120"
            transform="translate(0 26)"
            stroke="url(#road-edge)"
            strokeWidth="106"
          />
          <path
            d="M-100 660C80 660 230 590 180 500C150 445 65 480 55 405C40 310 195 305 280 365C375 435 535 430 535 310C535 240 390 250 392 180C392 80 610 80 730 120"
            stroke="url(#road-top)"
            strokeWidth="106"
          />
          <path
            d="M-100 660C80 660 230 590 180 500C150 445 65 480 55 405C40 310 195 305 280 365C375 435 535 430 535 310C535 240 390 250 392 180C392 80 610 80 730 120"
            stroke="#90a88a"
            strokeWidth="66"
            opacity=".5"
          />
          <ellipse
            cx="505"
            cy="329"
            rx="33"
            ry="12"
            fill="#55734c"
            opacity=".3"
            filter="url(#road-shadow)"
          />
          <circle cx="505" cy="302" r="29" fill="url(#ball-light)" />
        </svg>
        <span className="auth-floating-icon storefront">
          <Store />
        </span>
        <span className="auth-floating-icon orders">
          <ShoppingBag />
        </span>
        <span className="auth-floating-icon insights">
          <ChartNoAxesColumn />
        </span>
      </div>
    </aside>
  );
}
