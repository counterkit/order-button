# Changelog

## 1.0.0

First release.

- Cart and order sheet with a ready-made WhatsApp message (`wa.me` link), no backend.
- One dependency-free file in two builds: ES module and classic script (`window.OrderButton`),
  plus minified copies. The classic script starts itself from a
  `<script type="application/json" data-order-button>` block.
- Menu from JSON, or `data-ob-*` attributes on menu HTML you already have.
- Sizes, sold-out items, veg and non-veg marks, tags, pickup or delivery, minimum
  order, delivery fee.
- Pay panel after sending: UPI (QR + UPI ID + exact amount), Pix, a payment link, or none.
- Preview mode for demos and testing.
- Optional CSS themed with `--ob-*` variables.
- Astro component that renders the menu at build time.
- Config checker with plain-language messages, in the browser console and as a CLI.
- Free Claude Code skill: `/menu-from-photo`.
