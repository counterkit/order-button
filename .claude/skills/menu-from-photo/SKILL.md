---
name: menu-from-photo
description: Turn one or more photos of a shop's menu or price list (restaurant, cafe, bakery, tiffin service, kirana) into the menu.json file that order-button reads. Use when the user shares a menu photo or image path and wants a menu file, an order button, or a cart for a static site.
argument-hint: "<photo path(s)> [shop name] [order number with country code]"
allowed-tools: Read, Write, Edit, Glob, Bash(node:*)
---

# Menu photo to order-button menu.json

You turn photos of a real menu into a `menu.json` for
[order-button](https://github.com/counterkit/order-button). A shop's customers will
order from this file and the shop will be paid these prices, so **accuracy beats
speed**: never guess a price, a name or a veg mark. Flag anything unclear.

## 1. Get the inputs

- **Photos.** Use the paths in the arguments. If there are none, look for images the
  user mentioned, or ask for them. You can read JPG, PNG, GIF and WebP. For HEIC
  (iPhone) photos, ask the user to export them as JPG or take a screenshot.
  Read **every** photo before writing anything; menus often continue over pages.
- **Shop name.** From the arguments, or the name printed on the menu. Ask if neither.
- **Order number.** The number that receives orders on WhatsApp: digits only,
  country code first, no `+` (India: `919800000000`). Take it from the arguments or ask.
  A phone number printed on the menu may not be the WhatsApp number, so ask the user
  to confirm it before using it. If the user does not know it yet, use
  `910000000000` and set `"previewOnly": true`, and say so in your summary.
- **Output path.** Default `menu.json` in the current folder. Never overwrite an
  existing file without asking; suggest `menu-2.json` instead.

## 2. Read the menu carefully

If part of a photo is too small, blurred or cut off to read with confidence, say
which part and ask for a closer photo. Do not fill gaps with typical prices.

Transcribe faithfully:

| On the menu | In menu.json |
|---|---|
| Section headings ("Biryani", "Starters", "Cakes") | one category each, in printed order |
| Item name | `name`, as printed. Keep local names and spellings ("Double Ka Meetha", "Pesarattu"). Fix only obvious casing, e.g. ALL CAPS to Title Case. |
| Price | `price`, a plain number: `249`, not `"₹249"` or `"Rs. 249/-"` |
| Two or more price columns (Half/Full, Small/Medium/Large, Qtr/Half/Full, 500 g/1 kg) | `variants`: `[{ "id": "half", "name": "Half", "price": 149 }, ...]`, in printed order. Set the item's `price` to the first listed size unless the user says otherwise. |
| One price for a pack size ("Atta 5 kg ... 260") | keep the size in the name: `"Atta, 5 kg"` |
| Description under an item | `description`, only if printed. Do not write your own. |
| Green square with a dot / red or brown square with a triangle | `"veg": true` / `"veg": false`. If the menu has no marks, **leave `veg` out** rather than guessing from the dish name. |
| Printed badges: "Bestseller", a star, chilli icons, "New", "Jain", "Eggless", "Chef's special" | `tags`: `bestseller`, `spicy`, `new`, `jain`, `eggless`, `chef-special` |
| Crossed-out item, "Not available", "Seasonal" | `"available": false` and a `_note` |
| "Market price", "MRP", a range ("₹200-300"), or no price | do **not** invent one. Use your best reading only if it is printed, otherwise `"price": 0`, `"available": false` and a `_note` asking the user |
| Add-ons ("Extra cheese +30") | an "Add-ons" category with one item each (order-button has no per-item options) |
| Combos and thalis | one item each, with the contents as `description` if printed |
| Taxes, packing charges, delivery fees printed as notes | not items. Mention them in your summary. A flat delivery fee can go in `ordering.deliveryFee` if the user confirms it. |
| Menu in Hindi, Telugu, Tamil or another script | keep names as printed. Ask whether the user also wants an English name added in brackets. |

When you are not sure about one reading, keep your best reading and add a `_note`
on that item, e.g. `"_note": "Price hard to read: 219 or 249?"`. The checker lists
every `_note` so the user can confirm them.

## 3. ids

- Every category and item needs an `id`: lowercase letters, digits and dashes, made
  from the name: `"Chicken 65"` becomes `chicken-65`, `"Paneer Butter Masala"` becomes
  `paneer-butter-masala`.
- Item ids must be unique across the whole menu. If two sections both have "Veg
  Fried Rice", add the section: `veg-fried-rice-chinese`.
- Variant ids follow the same rule: `half`, `full`, `500g`, `1kg`, `small`, `large`.

## 4. Write the file

Use this shape. Leave out optional fields you have no information for.

```json
{
  "shop": {
    "name": "Shop name as printed",
    "whatsapp": "919800000000",
    "currency": "INR",
    "currencySymbol": "₹",
    "locale": "en-IN",
    "timezone": "Asia/Kolkata"
  },
  "ordering": {
    "modes": ["pickup", "delivery"],
    "previewOnly": false
  },
  "payment": { "type": "none" },
  "menu": {
    "categories": [
      {
        "id": "biryani",
        "name": "Biryani",
        "items": [
          {
            "id": "chicken-dum-biryani",
            "name": "Chicken Dum Biryani",
            "price": 149,
            "veg": false,
            "variants": [
              { "id": "half", "name": "Half", "price": 149 },
              { "id": "full", "name": "Full", "price": 249 }
            ]
          },
          { "id": "double-ka-meetha", "name": "Double Ka Meetha", "price": 89, "veg": true }
        ]
      }
    ]
  }
}
```

Currency from the symbols on the menu. If it is unclear, ask.

| Sign | currency | currencySymbol | locale | example timezone |
|---|---|---|---|---|
| ₹, Rs | INR | ₹ | en-IN | Asia/Kolkata |
| R$ | BRL | R$ | pt-BR | America/Sao_Paulo |
| AED, د.إ | AED | AED | en-AE | Asia/Dubai |
| ₦ | NGN | ₦ | en-NG | Africa/Lagos |
| KSh | KES | KSh | en-KE | Africa/Nairobi |
| R (South Africa) | ZAR | R | en-ZA | Africa/Johannesburg |
| RM | MYR | RM | ms-MY | Asia/Kuala_Lumpur |
| S$ | SGD | S$ | en-SG | Asia/Singapore |
| Rp | IDR | Rp | id-ID | Asia/Jakarta |
| $ (Mexico) | MXN | $ | es-MX | America/Mexico_City |

Payment: leave `{ "type": "none" }` unless the user gives you a UPI ID
(`{ "type": "upi", "upi": { "vpa": "shopname@example", "payeeName": "Shop name" } }`),
a Pix key (`{ "type": "pix", "pix": { "key": "..." } }`) or a payment link
(`{ "type": "link", "link": { "url": "https://..." } }`). Do not set
`"intent": true` for UPI: the upi://pay button is only for verified merchants.

## 5. Check it

Run the checker that sits next to this file (it has no dependencies):

```
node <this skill's folder>/check-menu.mjs menu.json
```

Fix every `error` line and run it again until it says `OK`. Read the `warning`
lines and fix the ones that apply. The `check` lines are your `_note` flags.

## 6. Report back

Keep it short:

1. The file path, and the counts from the checker (categories, items, items with sizes).
2. A table of everything to confirm: each `_note`, any item you set to unavailable,
   and the order number if it is a placeholder.
3. One sentence: the shop owner should check every price against the menu before
   the site goes live.
4. How to try it. Either point to `examples/index.html` in the order-button repo, or
   give this snippet with the JSON pasted inside:

```html
<link rel="stylesheet" href="order-button.css">
<div data-ob-menu></div>
<script type="application/json" data-order-button>
  { ...the menu.json content... }
</script>
<script src="order-button.iife.js"></script>
```

Do not publish, upload or send the menu anywhere. The user decides where it goes.
