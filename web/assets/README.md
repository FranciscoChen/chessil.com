# Sculpted chess pieces

`sculpted-pieces.json` is the editable source for all six silhouettes and their
carved details. `node web/scripts/build-pieces.js` generates both colors from each
shared shape, the asset-version manifest, and the Sculpted CSS selectors. Run
`node web/scripts/build-board.js` afterward to update the production stylesheet.
The landing-page renderer uses that same generated version manifest.

All twelve SVGs have a 1000 × 1000 viewBox and a common base at y=875. The white
rook's old 1000 × 1250 viewBox was the cause of its smaller displayed size. Each
color pair now has identical geometry, an 18-unit outer contour, a restrained
inner rim, and a matching inset baseline. The ivory/obsidian materials use native
linear and radial gradients, not images or SVG blur filters. Opposite-color
inlays have a small offset edge to suggest a carved channel. Knight details
include an eye, nostril, muzzle and curved mane. The bishop mitre and the king's
cross remain distinct. Jagged decorative incisions were smoothed out while
preserving the original recognizable silhouettes.

These are adaptations of Benjamin Kinard's chess pieces from The Noun Project,
licensed CC BY 3.0. Original author, source and adaptation notices remain in every
SVG; source URLs are recorded with each silhouette in the JSON.

Visual verification is required after editing shapes. Run
`node web/scripts/preview-pieces.js /tmp/sculpted-review.png`, then open the
rendered PNG and inspect every piece in both colors. The sheet includes 92 px
squares, a 40 px row and enlarged knight/bishop/king details. Also inspect the
Sculpted set in the game page on both board palettes. XML validity alone is not a
visual check. Screenshots are review artifacts and are not served as piece assets.

## Shared piece colors

`piece-palette.json` owns both sets’ material colors. White uses warm ivory
`#F2EAD6`; Black uses blue charcoal `#26343D`. Classic uses these solid body
colors with opposite-color details; Sculpted uses the same body stops with
restrained highlights and shadows. Sculpted’s dark highlights are deliberately
subdued to keep the silhouette distinct from both board palettes.

`classic-pieces.json` preserves the original Classic SVG geometry as templates.
`build-pieces.js` resolves their color tokens and generates `classic-pieces.css`
alongside all Sculpted SVGs, CSS and version hashes. Edit the shared palette,
then run `node web/scripts/build-pieces.js` and `node web/scripts/build-board.js`.
The preview script renders both sets, including every piece on both square
colors at 40 px. Inspect the PNG before publishing palette changes.
