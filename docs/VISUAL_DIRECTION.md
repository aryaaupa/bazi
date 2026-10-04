# Bazi editorial visual direction

The website takes its visual reference from [Oura’s official website](https://ouraring.com/): spacious lifestyle imagery, restrained natural colors, clear editorial hierarchy, and an integrated product story. The composition, copy, assets, and Bazi identity are original to this implementation.

## Implementation

- Full-width woodland hero with warm ivory interface details.
- Instrument Serif for editorial headings; the existing Hanken Grotesk for interface text. Both fonts are hosted locally; licenses are under `assets/fonts/`.
- Three original generated lifestyle photographs, encoded as WebP for delivery. Their combined payload is approximately 260 KB.
- A computed product preview uses the same frozen reference model, observed events, explanations, and retrospective warning interval as the workspace.
- All narrative photographs depict fictional illustrative people. They are not patient testimonials or evidence of a clinical partnership.
- The supplied Bazi logo is unmodified.

## Generated assets and final prompts

Generation method: built-in image generation. Original outputs were inspected and retained; site copies were format-encoded as WebP without changing their composition.

### hero

Saved project asset: [`assets/imagery/bazi-forest-hero.webp`](../assets/imagery/bazi-forest-hero.webp)

Use case: photorealistic-natural. Asset type: premium health technology website full-width hero photograph for Bazi, an engagement intelligence product for care teams. Create an original cinematic editorial lifestyle photograph, not a website mockup. Wide landscape 3:2 composition. In a tranquil coastal woodland at early morning, a fictional adult woman in her early 30s with dark wavy hair, wearing a cream knit sweater and soft neutral trousers, walking slowly along a natural path, candid side/back three-quarter view, her face small and not posed to camera. Person positioned in the right third, from head to upper thighs visible, taking about half the image height. Rich out-of-focus deep evergreen foliage fills the left half with naturally dark quiet negative space for white website text. Warm low sun catches her hair and the tall grasses at right. Palette deep muted forest green, olive, warm oat, quiet gold. High-end analog editorial photography, subtle film grain, realistic skin and materials, organic atmosphere, believable light and depth. Natural scene only. No text, no logos, no rings, no wearables, no UI, no graphic overlays, no medical equipment, no watermark. Avoid generic stock photo smiles, gym clothes, glowing effects, artificial saturated greens.

### everyday

Saved project asset: [`assets/imagery/bazi-everyday.webp`](../assets/imagery/bazi-everyday.webp)

Use case: photorealistic-natural. Asset type: original editorial lifestyle photograph for a premium care technology website, vertical portrait 4:5. A fictional adult woman with warm brown skin and loose dark curly hair, seated in profile at a sunlit wooden dining table in a quiet modern apartment, wearing a relaxed sand-colored cotton shirt. She is writing a short note in a small plain notebook beside a ceramic cup; a phone lies face down on the table. A candid, reflective ordinary morning, relaxed expression, no posing to the camera. Frame her from head to waist, with softly blurred cream curtains and a leafy outdoor view behind. Beautiful dappled morning light, warm cream and terracotta neutrals, muted olive details, tactile linen, subtle fine film grain. Tasteful wellness magazine photography, genuine proportions and skin texture. This is an illustrative fictional person, not a patient testimonial. No text, no visible interfaces, no logos, no wearables, no rings, no hospital imagery, no watermark.

### careteam

Saved project asset: [`assets/imagery/bazi-care-team.webp`](../assets/imagery/bazi-care-team.webp)

Use case: photorealistic-natural. Asset type: original premium editorial photography for a digital-care team's website, landscape 4:3. A fictional adult female care professional in her late 30s, short dark hair, wearing an elegant dark olive blouse, thoughtfully reviewing a slim silver laptop at a warm oak table in a calm daylight office. Natural three-quarter view, camera across the table, laptop back visible and screen facing away from camera so no readable interface. Her hands rest naturally near the keyboard. A paper notebook, water glass, soft off-white plaster wall and gently blurred plant in the background. Large soft side-window light, sophisticated quiet cream, walnut, forest-green palette, subtle analog grain, believable human expression, real material texture. Spacious composition with the person toward the right and table foreground. No lab coat, no stethoscope, no medical symbols, no text, no logos, no claims, no badges, no rings, no watermark. Avoid staged stock-photo handshake or exaggerated smiles.

## Font provenance

Instrument Serif was obtained from Google Fonts with its SIL Open Font License. Source: `https://github.com/google/fonts/tree/main/ofl/instrumentserif`. Fonts are used locally; the published site makes no Google Fonts request.
