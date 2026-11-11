"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Coffee,
  Monitor,
  Pause,
  Play,
  QrCode,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Brand } from "@/components/brand";
const slides = [
  {
    category: "THE COUNTER, CONNECTED",
    title: "Run your counter\nwith confidence.",
    description:
      "A vision for simpler cashier flow, sales and daily operations. More time for the people in front of you.",
    label: "POS / Cashier",
    future: true,
  },
  {
    category: "FROM FIRST TICKET TO LAST TABLE",
    title: "Every order.\nA little more in sync.",
    description:
      "A clearer view of preparation, progress and fulfillment. Thoughtfully connected, from kitchen to customer.",
    label: "Order management",
    future: true,
  },
  {
    category: "LESS WAITING. MORE ENJOYING.",
    title: "Good food.\nSeamless ordering.",
    description:
      "Imagine a smoother dining experience: scan, explore and order, all from the comfort of the table.",
    label: "QR ordering",
    future: true,
  },
  {
    category: "MAKE A BEAUTIFUL FIRST IMPRESSION",
    title: "Your flavour.\nYour digital space.",
    description:
      "Bring your brand to life with beautiful website sections, flexible layouts and a canvas that feels like you.",
    label: "Website builder",
    future: false,
  },
];
function Visual({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className="sq-mock sq-pos">
        <div className="sq-mock-top">
          <span>
            <Coffee size={16} /> The daily café
          </span>
          <span>Counter 01</span>
        </div>
        <div className="sq-pos-body">
          <div className="sq-pos-menu">
            <div className="sq-tabs">
              <b>Favourites</b>
              <span>Coffee</span>
              <span>Kitchen</span>
            </div>
            <div className="sq-products">
              {[
                ["latte", "Flat white", "12.00"],
                ["pastry", "Butter croissant", "9.00"],
                ["matcha", "Iced matcha", "15.00"],
                ["toast", "Morning toast", "18.00"],
              ].map(([image, name, price]) => (
                <div key={image}>
                  <img src={`/images/cafe/${image}.jpg`} alt="" />
                  <strong>{name}</strong>
                  <span>RM {price}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sq-ticket">
            <small>CURRENT ORDER</small>
            <h3>A lovely morning.</h3>
            <small>Table 04 · Dine in</small>
            <p>
              Flat white <b>12.00</b>
            </p>
            <p>
              Butter croissant <b>9.00</b>
            </p>
            <div className="sq-total">
              <span>Total</span>
              <strong>RM 21.00</strong>
            </div>
            <div className="sq-solid">
              Ready for the next guest <Check size={12} />
            </div>
          </div>
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className="sq-mock sq-orders">
        <div className="sq-mock-top">
          <span>
            <Utensils size={16} /> A good service, in motion
          </span>
          <span>● Kitchen view</span>
        </div>
        <div className="sq-order-columns">
          {["Received", "Preparing", "Ready to serve"].map((status, i) => (
            <div key={status}>
              <div className="sq-column-label">
                <i />
                {status}
                <span>{i === 1 ? "02" : "01"}</span>
              </div>
              {[0, ...(i === 1 ? [1] : [])].map((n) => (
                <div className="sq-order-ticket" key={n}>
                  <small>
                    #{104 + i + n * 3} <span>{i + 2} min</span>
                  </small>
                  <h3>Table {String(4 + i + n).padStart(2, "0")}</h3>
                  <p>2 × Flat white</p>
                  <p>1 × Avocado toast</p>
                  <div className={`sq-status sq-status-${i}`}>
                    <Check size={12} />
                    {status}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="sq-order-bottom">
          Made with care. Served together. <Check size={16} />
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className="sq-qr-scene">
        <div className="sq-table-card">
          <span>TAKE A SEAT. TAKE YOUR TIME.</span>
          <h3>
            Something
            <br />
            delicious awaits.
          </h3>
          <div className="sq-qr">
            <QrCode size={108} strokeWidth={1.6} />
          </div>
          <p>Scan. Explore. Enjoy.</p>
          <small>Illustrative QR · Not scannable</small>
          <div>TABLE 08</div>
        </div>
        <div className="sq-phone">
          <div className="sq-notch" />
          <small>THE DAILY CAFÉ</small>
          <h3>
            A little moment
            <br />
            of delicious.
          </h3>
          <img src="/images/cafe/latte.jpg" alt="" />
          <div className="sq-phone-info">
            <b>Your usual, made special.</b>
            <span>Flat white · RM 12.00</span>
          </div>
          <div className="sq-phone-cart">
            <ShoppingBag size={14} /> Your table, your favourites
          </div>
        </div>
        <div className="sq-floating">
          <Check size={15} />
          <span>
            More connection.
            <br />
            <b>Less queuing.</b>
          </span>
        </div>
      </div>
    );
  return (
    <div className="sq-mock sq-builder">
      <div className="sq-mock-top">
        <span>
          <SlidersHorizontal size={16} /> Your creative workspace
        </span>
        <span>Your vision, online ↗</span>
      </div>
      <div className="sq-builder-body">
        <div className="sq-tools">
          <Monitor size={18} />
          <SlidersHorizontal size={17} />
          <Sparkles size={17} />
          <Coffee size={17} />
        </div>
        <div className="sq-site">
          <div className="sq-site-nav">
            <b>the daily.</b>
            <span>Our story &nbsp; Menu &nbsp; Visit us</span>
          </div>
          <div className="sq-site-hero">
            <img src="/images/cafe/interior.jpg" alt="" />
            <span>A NEIGHBOURHOOD FAVOURITE</span>
            <h3>
              A good day
              <br />
              starts here.
            </h3>
            <p>Coffee. Conversation. A little time for you.</p>
            <div>Find your favourite ↗</div>
          </div>
          <div className="sq-site-bottom">
            Made slowly. Enjoyed fully. <Coffee size={17} />
          </div>
        </div>
        <div className="sq-settings">
          <small>MAKE IT YOURS</small>
          <b>Your palette</b>
          <div className="sq-palette">
            <i />
            <i />
            <i />
          </div>
          <b>Typography</b>
          <span>Cormorant Garamond</span>
          <b>Layout</b>
          <span>Editorial / Full width</span>
          <div>
            <Check size={12} /> Looking like you.
          </div>
        </div>
      </div>
    </div>
  );
}
export function LoginShowcase() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!playing || interacting || reduced.matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((value) => (value + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [playing, interacting]);
  return (
    <section
      className="servqo-showcase"
      aria-label="Explore SERVQO"
      aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      <div className="sq-showcase-top">
        <Brand />
        <span>BUILT FOR THE BUSINESS OF HOSPITALITY</span>
      </div>
      <div className="sq-slides">
        {slides.map((slide, index) => (
          <article
            key={slide.label}
            className={`sq-slide ${index === active ? "is-active" : ""}`}
            inert={index !== active}
            aria-hidden={index !== active}
            aria-roledescription="slide"
            aria-label={`${index + 1} of 4: ${slide.label}`}
          >
            <div className="sq-copy">
              <div className="sq-category">
                <span />
                {slide.category}
              </div>
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
            </div>
            <div className="sq-visual" aria-hidden="true">
              <Visual index={index} />
            </div>
            <div className="sq-caption">
              <span>
                {slide.future ? "ON THE SERVQO ROADMAP" : "CREATE WITH SERVQO"}
              </span>
              <b>
                {slide.label} <ArrowUpRight size={13} />
              </b>
              <small>
                {slide.future
                  ? "Coming soon · Concept preview"
                  : "Available today · Illustrative preview"}
              </small>
            </div>
          </article>
        ))}
      </div>
      <div className="sq-showcase-bottom">
        <span>One vision. More possibilities.</span>
        <div className="sq-controls">
          <div className="sq-dots" role="group" aria-label="Choose a slide">
            {slides.map((slide, index) => (
              <button
                key={slide.label}
                type="button"
                aria-label={`Show ${slide.label}`}
                aria-pressed={active === index}
                onClick={() => {
                  setActive(index);
                  setPlaying(false);
                }}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sq-pause"
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
        </div>
      </div>
    </section>
  );
}
