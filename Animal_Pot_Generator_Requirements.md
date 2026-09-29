# Animal Pot Generator Requirements

## Purpose

Build a browser-based app that lets a user design a cute animal-themed plant pot or decorative container, preview it in 3D, and export a printable model. The app should generate geometry from editable parameters. The first visual target is the supplied cat pot: a rounded open vessel with two ears rising behind the rim, large eyes, a small mouth, cheeks, and rounded paws on the front. This image guides the style; its exact shape and appearance are not an export requirement.

This brief describes the intended product and a practical first release. It does not choose a domain, brand, pricing model, or deployment stack.

## Core experience

1. Start from an animal preset, initially **cat**. Show a usable default model immediately.
2. Adjust vessel dimensions and shape, wall and floor thickness, ears, facial features, paws, and optional drainage.
3. See the changes in an interactive 3D preview, including the opening and interior. Show dimensions in millimetres.
4. Choose a printable assembly: a single-colour integrated model, or a body plus separate contrasting face pieces when that mode is supported.
5. Generate and download the mesh, initially as STL. Preserve the chosen configuration so the design can be reopened or shared later if persistence is implemented.

The UI should prioritize quick creation. Presets give coherent combinations, while advanced controls allow individual changes. Changes to a preset should never silently reset unrelated edits.

## First release scope

### Vessel

- A rounded body with a flat, stable base, open top, visible interior, continuous wall, and solid floor.
- Adjustable overall width, depth, height, opening size, body roundness/taper, wall thickness, and floor thickness. Define whether width/depth includes projecting features; report the final bounding box separately.
- A clean, softened lip around the opening. Ears may project above the rim without closing or narrowing the usable opening unexpectedly.
- Optional drainage hole in the floor, with a defined diameter and location. Default to **off** so the model can also serve as a decorative pot or dry container. Do not promise a watertight printed vase: watertightness depends on material, slicer settings, and printing.
- Keep the geometry in real millimetres. Expose safe parameter ranges and explain invalid combinations in the UI rather than exporting a broken mesh.

### Animal features

- **Cat preset first:** paired pointed ears, two large eyes, a small mouth, cheek accents, and optional paired rounded paws. Provide a modest set of eye and mouth variants. Symmetry is the default, with independent positioning only if it is straightforward to implement safely.
- Position face features on the *curved front surface*, using local surface position and orientation. Controls for spacing, vertical position, scale, depth, and visibility must keep the parts attached as the body changes.
- Ears must join the vessel without thin, fragile tips or exposed intersections. The opening must remain accessible.
- Paws must have a substantial joined contact with the body and avoid creating a base that rocks. A tail and other animal-specific details are later features.
- Colour in the preview is an appearance aid, not a guarantee that a single STL prints in multiple colours. The supplied image's glossy eyes and pink cheeks are visual inspiration; printable geometry and colour assignment must be explicit.

### Export and print checks

- Export a correctly scaled, oriented, closed manifold solid for each printable part. The vessel is open at the top but its material forms a closed mesh, including the inner wall and rim.
- Ensure outward-facing normals, no self-intersections, no duplicate internal faces, and no detached details in the integrated model. In separate-part mode, provide distinct meshes with an intentional locating or joining method; do not simply export floating eyes.
- Place the base on Z = 0 and use the intended upright orientation. Include a dimension summary and a warning when geometry exceeds the chosen printable envelope.
- Validate minimum thickness and narrow connections at ears, paws, face lines, and the rim. Make thresholds configurable in code; choose conservative initial values and confirm them with real prints before treating them as guarantees.
- Include a low-cost preview mesh and a higher quality export mesh if performance requires it. Preview and export must use the same parameters and visibly agree.

## Interaction details

The editing panel should group controls into Body, Opening and Base, Animal, Face, Details, and Export. The preview should support orbit, zoom, reset view, and a cutaway or hide-front inspection mode for the interior. Show the current animal and dimensions near the export action. An explicit reset-to-preset action should be available.

Provide sensible defaults around a small desktop planter scale, but keep actual values as implementation choices until tested. A parameter change should update the preview promptly. If a combination cannot be generated, keep the last valid preview, show which control caused the problem, and block export of the invalid configuration.

## Suggested geometry approach

Represent the design as a versioned parameter object, not a saved STL alone. Generate the vessel from coordinated outer and inner profiles so rim, wall, and floor are controlled together. Attach parameterized features to the evaluated front surface. Use robust union/boolean or field-based meshing for integrated features, and validate the resulting mesh before download. The implementation may use existing geometry services or client-side generation; choose after a small prototype compares robustness, export time, and preview responsiveness.

Do not assume ordinary overlapping meshes become one printable solid. Test the hard joins between ears, paws, and the vessel, especially after changing taper, width, and wall thickness. Smoothness must not erase small facial details or shrink the usable opening.

The app should be independent of the cookie-cutter product at first. Reuse common preview, export, account, or billing components only where doing so reduces work without coupling the geometry generators.

## Acceptance criteria for MVP

- A user can load the cat preset, change width, height, opening, wall thickness, and feature size/placement, then download an STL without editing code.
- The preview shows the open interior and matches the exported silhouette, feature layout, and dimensions within the chosen mesh resolution.
- The default model and a matrix of minimum/maximum valid body settings produce slicer-readable, manifold meshes with attached ears, eyes, mouth, and paws when enabled.
- Turning drainage off produces a continuous floor; turning it on creates a through-hole without stray geometry.
- Ear and paw joints remain intact for valid settings, and the base lies flat at Z = 0.
- Invalid settings show a useful error and cannot be exported.
- At least one default integrated cat model is physically test printed, with any changes to the safe parameter ranges recorded afterward.

## Later phases

After the cat geometry is reliable, add a small animal system: bear (round ears), bunny (long ears), fox (pointed ears and muzzle), dog (ear variants), and panda (round ears and eye patches). Build these from compatible feature families rather than maintaining a separate bespoke generator for each animal. Add tails, feet, more expressions, colour-separated parts or 3MF, saved designs, preset sharing, and optional prompt-to-parameters AI as separate milestones. AI should select and adjust validated parameters, not be required to invent the printable mesh.

## Decisions for product owner before expansion

- Primary use: decorative plant pot, functional planter with drainage, or vessel for dry items. The MVP can support both drained and undrained forms but should not claim food safety or water tightness.
- Whether multi-colour output means separate printable parts, slicer paint instructions, or true multi-material 3MF.
- Target print sizes and printer constraints; these determine safe ranges and test models.
- Whether saved designs, login, credits, subscriptions, and commercial-use terms belong in this product. They are outside the geometry MVP.
