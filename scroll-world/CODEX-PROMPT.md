# Generate the six scene stills in the Codex app (free with your ChatGPT plan)

> Status (2026-09-22): the live posters were generated through the Cloudinary
> generate-image tool (model `gpt-image-2`, 1536×1024) instead of the Codex app, with
> one re-roll of the kitchen scene so the trailer matches the black truck. The source
> PNGs are kept in the Cloudinary media library under `kravekulture/still_*` and are
> gitignored here. This file stays as the manual route if the stills ever need redoing
> by hand. Same prompts either way.

Scripted Codex cannot reach the image tool, but the Codex app can. Open the Codex app,
point it at this folder (`kravekulture`), and paste the block below as one message.
It saves six PNGs into `scroll-world/work/`. When they exist, tell Claude "stills are in"
and the rest is automatic.

---

Use $imagegen to generate six images for this project, one at a time, each 3:2 landscape, high quality. Save each one to the exact path given. Do not do anything else.

Use this identical style text at the start of every prompt:

"Isometric low-poly 3D diorama floating as a small rounded island on a plain solid #F6F4EE off-white background with a soft contact shadow beneath it. Soft matte clay 3D render, rounded toy-model shapes, warm Miami sunset lighting from the side with a golden-orange glow, soft long shadows, tilt-shift miniature look. Cohesive color palette of oxide red #C4261D, Haitian blue #18359C, sun gold #F2B632, sunset orange #F26B1D, palm green #2E7D4F, ink black #111111 and whitewash #F6F4EE. Highly detailed, centered composition with a little headroom, absolutely no text, no letters, no numbers, no logos, no signage."

1. Save as `scroll-world/work/still_market.png`. Subject: a small Little Haiti morning street market on the island: two vendor stalls with red-and-white striped awnings, wooden crates overflowing with green and yellow plantains, scotch bonnet peppers, cabbages and carrots, woven baskets, a vendor in a gold apron handing a bag to a customer, two tall coconut palms, a painted blue concrete wall behind, a small cat on the curb.

2. Save as `scroll-world/work/still_kitchen.png`. Subject: the interior of a food trailer kitchen, the trailer walls cut away to show inside: a big black cast-iron pot of golden fried pork cubes over a burner, a flat-top grill with glossy red-sauced chicken wings, a tall steaming rice pot, a tray of fried plantain slices, a small bowl of shredded cabbage slaw, one cook in a red cap flipping wings with tongs, hanging ladles, a serving window on the far wall glowing with sunset light.

3. Save as `scroll-world/work/still_truck.png`. Subject: a black food trailer with a blue and red stripe parked on a small palm-lined lot at sunset, string lights strung from the trailer to two palms, a serving window with a fold-out counter, a short line of four customers waiting with phones and takeout boxes, a picnic table, a tiny Miami skyline silhouette and a low orange sun on the horizon behind.

4. Save as `scroll-world/work/still_plate.png`. Subject: one oversized open white foam takeout clamshell as the centerpiece, floating slightly above the island, filled with a heaping plate: a mound of red-tinted rice with beans, golden crispy fried pork cubes, three fried plantain slices, a scoop of baked macaroni and cheese, and a small clear cup of pickled cabbage and carrot slaw; a few small clay props orbiting it (a fork, a lime wedge, a scotch bonnet pepper).

5. Save as `scroll-world/work/still_wings.png`. Subject: an oversized red-checked paper basket of glossy sauced chicken wings piled on a bed of seasoned fries, floating slightly above the island, with four small round sauce bowls arranged in front in a row: honey-orange, pale lemon-yellow speckled with black pepper, dark brown barbecue, and bright buffalo red; a squeeze bottle and a small pile of celery sticks beside them.

6. Save as `scroll-world/work/still_finale.png`. Subject: a sweet finale still life floating above the island: a tall clear cup of layered banana pudding with vanilla wafers on top, a frosty glass bottle of pale yellow lemonade with a lemon slice, a tall glass of orange passion fruit juice with a straw, a red soda can and a water bottle beside them, a few clay bananas and a passion fruit cut in half, warm sunset glow, a tiny palm frond.
