import { mkdir, writeFile } from "node:fs/promises";
import { definitions } from "../src/lib/models";
// Uses the installed browser's DevTools protocol; no browser package install.
async function main() {
  const targets = (await (
    await fetch("http://127.0.0.1:9228/json")
  ).json()) as { webSocketDebuggerUrl: string; type: string }[];
  const target = targets.find((t) => t.type === "page");
  if (!target) throw new Error("Start a headless browser on port 9228 first");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) =>
    ws.addEventListener("open", resolve, { once: true }),
  );
  let id = 0;
  const pending = new Map<
    number,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (error: Error) => void;
    }
  >();
  const events = new Map<string, () => void>();
  ws.addEventListener("message", (event) => {
    const value = JSON.parse(String(event.data));
    if (value.id) {
      const request = pending.get(value.id);
      if (value.error) request?.reject(new Error(value.error.message));
      else request?.resolve(value.result);
      pending.delete(value.id);
    } else events.get(value.method)?.();
  });
  function send(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const request = ++id;
      pending.set(request, { resolve, reject });
      ws.send(JSON.stringify({ id: request, method, params }));
    });
  }
  await send("Page.enable");
  await send("Runtime.enable");
  await mkdir(".design-qa", { recursive: true });
  const failures: string[] = [];
  for (const width of process.argv.includes('--gallery-only')?[]:[1280, 768, 390]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width === 390,
    });
    for (const key of ["page", ...definitions.map((d) => d.key)]) {
      const loaded = new Promise<void>((resolve) =>
        events.set("Page.loadEventFired", resolve),
      );
      await send("Page.navigate", {
        url: `http://127.0.0.1:3200/${key === "page" ? "" : `variant/${key}`}`,
      });
      await loaded;
      const result = await send("Runtime.evaluate", {
        expression: `(async()=>{await document.fonts.ready;[...document.images].forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));return {overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src),width:innerWidth};})()`,
        awaitPromise: true,
        returnByValue: true,
      });
      const report = (
        result.result as { value: { overflow: boolean; broken: string[] } }
      ).value;
      if (report.overflow || report.broken.length)
        failures.push(`${key}@${width}: ${JSON.stringify(report)}`);
      if (
        (width === 1280 || width === 390) &&
        [
          "page",
          "hero-editorial",
          "about-classic",
          "menu-list",
          "gallery-editorial",
        ].includes(key)
      ) {
        const screenshot = await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        await writeFile(
          `.design-qa/${key}-${width}.png`,
          Buffer.from(screenshot.data as string, "base64"),
        );
      }
      if (width === 390 && key === "header-minimal") {
        const menu = await send("Runtime.evaluate", {
          expression: `(()=>{const details=document.querySelector('details');details.open=true;const nav=details.querySelector('nav');return {visible:nav.getBoundingClientRect().height>0,links:nav.querySelectorAll('a').length};})()`,
          returnByValue: true,
        });
        console.log(
          "Mobile navigation:",
          JSON.stringify((menu.result as { value: unknown }).value),
        );
      }
    }
    console.log(`Checked ${definitions.length + 1} real layouts at ${width}px`);
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const galleryLoaded = new Promise<void>((resolve) =>
    events.set("Page.loadEventFired", resolve),
  );
  await send("Page.navigate", { url: "http://127.0.0.1:3200/gallery" });
  await galleryLoaded;
  const galleryReport = await send("Runtime.evaluate", {
    expression: `(async()=>{
   const tick=()=>new Promise(r=>setTimeout(r,150));
   for(let i=0;i<30&&!document.querySelector('.gallery-design');i++)await tick();
   const assert=(condition,message)=>{if(!condition)throw Error(message)};
   assert(document.querySelectorAll('.gallery-design').length===4,'Hero designs did not render');
   document.querySelector('[aria-label="mobile preview"]').click();await tick();
   assert([...document.querySelectorAll('.design-viewport')].every(e=>e.dataset.device==='mobile'),'Device toggle failed');
   const boxes=document.querySelectorAll('.compare-check input');boxes[0].click();await tick();boxes[1].click();await tick();
   [...document.querySelectorAll('.gallery-preview-toolbar button')].find(b=>b.textContent.includes('Compare')).click();await tick();
   assert(document.querySelectorAll('.comparison-columns>div').length===2,'Comparison did not open');
   document.querySelector('[aria-label="Close comparison"]').click();await tick();
   const card=name=>[...document.querySelectorAll('.gallery-design')].find(c=>c.querySelector('h2').textContent===name);
   card('Full-width image').querySelector('.gallery-design-actions button').click();await tick();
   assert(document.querySelector('.current-page-preview [data-variant="hero-full-image"]'),'Free design was not applied');
   card('Editorial minimal').querySelector('.gallery-design-actions button').click();await tick();
   assert(!card('Editorial minimal').querySelector('.gallery-design-actions button').textContent.includes('unlock'),'Demo unlock failed');
   card('Editorial minimal').querySelector('.gallery-design-actions button').click();await tick();
   assert(document.querySelector('.current-page-preview [data-variant="hero-editorial"]'),'Premium design was not applied');
   [...document.querySelectorAll('.history-chips button')].find(b=>b.textContent.includes('Classic portrait')).click();await tick();
   assert(document.querySelector('.current-page-preview [data-variant="hero-classic"]'),'Previous design was not restored');
   document.querySelector('[aria-label="desktop preview"]').click();await tick();
   [...document.querySelectorAll('.gallery-categories button')].find(b=>b.textContent.startsWith('Galleries')).click();await tick();
   assert(document.querySelectorAll('.gallery-design').length===2,'Category filtering failed');
   const search=document.querySelector('[aria-label="Search section designs"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(search,'missing-design');search.dispatchEvent(new Event('input',{bubbles:true}));await tick();
   assert(document.querySelector('.empty-state'),'Search empty state failed');
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(search,'');search.dispatchEvent(new Event('input',{bubbles:true}));await tick();
   assert(document.documentElement.scrollWidth<=innerWidth+1,'Gallery has horizontal overflow');
   return {deviceToggle:true,comparison:true,freeApply:true,demoUnlock:true,premiumApply:true,history:true,categories:true,search:true};
  })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (galleryReport.exceptionDetails)
    failures.push("Gallery: " + JSON.stringify(galleryReport.exceptionDetails));
  console.log("Gallery interactions:", JSON.stringify(galleryReport.result));
  const galleryScreenshot = await send("Page.captureScreenshot", {
    format: "png",
  });
  await writeFile(
    ".design-qa/gallery-1280.png",
    Buffer.from(galleryScreenshot.data as string, "base64"),
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const mobileGallery = await send("Runtime.evaluate", {
    expression: `(async()=>{await new Promise(r=>setTimeout(r,300));return document.documentElement.scrollWidth<=innerWidth+1;})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (!(mobileGallery.result as { value: boolean }).value)
    failures.push("Gallery overflows at 390px");
  const mobileScreenshot = await send("Page.captureScreenshot", {
    format: "png",
  });
  await writeFile(
    ".design-qa/gallery-390.png",
    Buffer.from(mobileScreenshot.data as string, "base64"),
  );
  await writeFile(
    ".design-qa/results.json",
    JSON.stringify({ checks: (definitions.length + 1) * 3, failures }, null, 2),
  );
  await send("Emulation.clearDeviceMetricsOverride");
  ws.close();
  if (failures.length) throw new Error(failures.join("\n"));
  console.log("All layouts passed: no broken images or horizontal overflow.");
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
