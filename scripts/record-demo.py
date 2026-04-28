"""
Demo video recorder for examhelper.app
Run: python3 scripts/record-demo.py
Output: /tmp/demo-raw.webm -> web/public/demo.mp4
"""
import asyncio
import os
import math
import subprocess
from playwright.async_api import async_playwright

W, H = 1440, 900

CURSOR_CSS = """
*, *::before, *::after { cursor: none !important; }
#_demo_cursor {
  width: 18px; height: 18px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  position: fixed;
  pointer-events: none;
  z-index: 2147483647;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 3px rgba(180,140,80,0.5), 0 2px 8px rgba(0,0,0,0.4);
  transition: width 0.12s, height 0.12s;
}
#_demo_cursor.click {
  width: 26px; height: 26px;
}
"""

CURSOR_JS = """
(() => {
  const el = document.createElement('div');
  el.id = '_demo_cursor';
  document.body.appendChild(el);
  document.addEventListener('mousemove', e => {
    el.style.left = e.clientX + 'px';
    el.style.top  = e.clientY + 'px';
  });
  window._cursorEl = el;
})();
"""

async def inject_cursor(page):
    await page.add_style_tag(content=CURSOR_CSS)
    await page.evaluate(CURSOR_JS)

async def cursor_click_anim(page):
    await page.evaluate("window._cursorEl && window._cursorEl.classList.add('click')")
    await page.wait_for_timeout(140)
    await page.evaluate("window._cursorEl && window._cursorEl.classList.remove('click')")

# Smooth mouse move with ease-in-out
async def move(page, x2, y2, steps=40, ms=700):
    pos = await page.evaluate("({x: window._mx||720, y: window._my||450})")
    x1, y1 = pos["x"], pos["y"]
    for i in range(1, steps + 1):
        t = i / steps
        t = t * t * (3 - 2 * t)  # smoothstep
        await page.mouse.move(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
        await page.wait_for_timeout(ms // steps)
    await page.evaluate(f"window._mx={x2}; window._my={y2};")

async def click_at(page, x, y):
    await move(page, x, y)
    await cursor_click_anim(page)
    await page.mouse.click(x, y)

# CSS zoom: scale the html element around a focal point
async def zoom_to(page, fx_pct, fy_pct, scale, dur=520):
    await page.evaluate(f"""
      const h = document.documentElement;
      h.style.transition = 'transform {dur}ms cubic-bezier(0.4,0,0.2,1)';
      h.style.transformOrigin = '{fx_pct}% {fy_pct}%';
      h.style.transform = 'scale({scale})';
    """)
    await page.wait_for_timeout(dur + 80)

async def zoom_reset(page, dur=400):
    await page.evaluate(f"""
      const h = document.documentElement;
      h.style.transition = 'transform {dur}ms cubic-bezier(0.4,0,0.2,1)';
      h.style.transform = 'scale(1)';
    """)
    await page.wait_for_timeout(dur + 80)

async def pause(page, ms):
    await page.wait_for_timeout(ms)

async def main():
    out_webm = "/tmp/demo-raw.webm"
    out_mp4  = "web/public/demo.mp4"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--autoplay-policy=no-user-gesture-required"],
        )
        ctx = await browser.new_context(
            viewport={"width": W, "height": H},
            record_video_dir="/tmp/demo-frames/",
            record_video_size={"width": W, "height": H},
            device_scale_factor=2,  # retina sharpness
        )
        page = await ctx.new_page()

        # ── 1. Landing page ──────────────────────────────────────────────
        await page.goto("https://examhelper.app", wait_until="networkidle")
        await inject_cursor(page)
        await pause(page, 800)

        # Zoom onto hero headline
        await zoom_to(page, 38, 36, 1.55, dur=600)
        await pause(page, 1800)
        await zoom_reset(page, dur=500)
        await pause(page, 600)

        # Move cursor toward Sign in button, then navigate
        await move(page, 1189, 33, steps=35, ms=900)
        await cursor_click_anim(page)
        await pause(page, 300)
        await page.goto("https://examhelper.app/sign-in", wait_until="networkidle")

        # ── 2. Sign-in ────────────────────────────────────────────────────
        await inject_cursor(page)
        await pause(page, 600)

        # Type email
        email_box = page.locator('input[type="email"]')
        await email_box.click()
        await page.wait_for_timeout(200)
        await page.keyboard.type("me@anasyd.com", delay=55)
        await pause(page, 300)

        # Type password
        pw_box = page.locator('input[type="password"]')
        await pw_box.click()
        await page.wait_for_timeout(200)
        await page.keyboard.type("Sct5jqUA3sgYNtgJNCg%", delay=45)
        await pause(page, 400)

        # Click Sign in
        submit = page.locator('button[type="submit"]')
        bb = await submit.bounding_box()
        if bb:
            cx, cy = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
            await move(page, cx, cy, steps=28, ms=700)
            await cursor_click_anim(page)
            await page.mouse.click(cx, cy)

        await page.wait_for_url("**/app**", timeout=15000)
        await page.wait_for_load_state("networkidle")
        await inject_cursor(page)
        await pause(page, 1000)

        # ── 3. Dashboard ─────────────────────────────────────────────────
        # Zoom on project card
        card = page.locator("text=Introduction to Quantum Computing").first
        bb = await card.bounding_box()
        if bb:
            fx = (bb["x"] + bb["width"] / 2) / W * 100
            fy = (bb["y"] + bb["height"] / 2) / H * 100
            await move(page, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2, steps=30, ms=700)
        await zoom_to(page, 20, 36, 1.6, dur=500)
        await pause(page, 1600)
        await zoom_reset(page, dur=450)
        await pause(page, 400)

        # Click project card
        if bb:
            await click_at(page, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        await page.wait_for_load_state("networkidle")
        await pause(page, 1200)
        await inject_cursor(page)

        # ── 4. Roadmap tab ────────────────────────────────────────────────
        # Should already be on Roadmap; zoom onto XP header
        await zoom_to(page, 50, 26, 1.7, dur=520)
        await pause(page, 1400)
        await zoom_reset(page, dur=420)
        await pause(page, 500)

        # Move to and zoom on first topic node (Bit vs qubit orange circle ~695,435)
        await move(page, 694, 435, steps=35, ms=900)
        await zoom_to(page, 50, 50, 2.0, dur=550)
        await pause(page, 1800)
        await zoom_reset(page, dur=450)
        await pause(page, 600)

        # ── 5. Flashcards tab ─────────────────────────────────────────────
        flash_tab = page.locator("text=Flashcards")
        bb = await flash_tab.bounding_box()
        if bb:
            await click_at(page, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        await page.wait_for_load_state("networkidle")
        await pause(page, 900)
        await inject_cursor(page)

        # Zoom on the flashcard question
        await zoom_to(page, 50, 45, 1.65, dur=520)
        await pause(page, 2000)

        # Click option A (Shor's algorithm) ~694, 389
        await zoom_reset(page, dur=380)
        await pause(page, 300)
        option_a = page.locator("text=Shor's algorithm").first
        bb = await option_a.bounding_box()
        if bb:
            await click_at(page, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        await pause(page, 500)

        # Click "See answer"
        see_ans = page.locator("text=See answer")
        bb = await see_ans.bounding_box()
        if bb:
            await move(page, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2, steps=28, ms=600)
            await cursor_click_anim(page)
            await page.mouse.click(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        await pause(page, 600)
        await zoom_to(page, 50, 60, 1.5, dur=500)
        await pause(page, 2000)
        await zoom_reset(page, dur=420)
        await pause(page, 500)

        # ── 6. Notes tab ──────────────────────────────────────────────────
        notes_tab = page.locator("text=Notes")
        bb = await notes_tab.bounding_box()
        if bb:
            await click_at(page, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        await page.wait_for_load_state("networkidle")
        await pause(page, 800)
        await inject_cursor(page)

        # Zoom on study guide content
        await zoom_to(page, 55, 45, 1.6, dur=520)
        await pause(page, 2200)

        # Slowly scroll down through the notes
        await page.mouse.wheel(0, 400)
        await pause(page, 1200)
        await page.mouse.wheel(0, 400)
        await pause(page, 1200)
        await zoom_reset(page, dur=450)
        await pause(page, 600)

        # ── 7. Back to Roadmap — end shot ─────────────────────────────────
        roadmap_tab = page.locator("text=Roadmap").first
        bb = await roadmap_tab.bounding_box()
        if bb:
            await click_at(page, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        await pause(page, 800)
        await inject_cursor(page)
        await zoom_to(page, 50, 30, 1.4, dur=500)
        await pause(page, 2000)
        await zoom_reset(page, dur=600)
        await pause(page, 1000)

        # ── Done — close and get video path ──────────────────────────────
        video_path = await page.video.path()
        await ctx.close()
        await browser.close()

    print(f"Raw video: {video_path}")

    # Convert webm -> mp4 with ffmpeg
    os.makedirs(os.path.dirname(out_mp4), exist_ok=True)
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", "scale=1440:900:flags=lanczos",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        out_mp4,
    ]
    print("Converting to mp4…")
    subprocess.run(cmd, check=True)
    print(f"Done → {out_mp4}")


if __name__ == "__main__":
    asyncio.run(main())
