# The Echo Chamber

A single exploratory first-person puzzle inside the Evidence Observatory. Eight independently operated lamps carry four underlying sources. The wiring is randomized each new game; there are sixteen valid solutions. A bank of lamps is never already a complete set of sources.

The doorway responds continuously to the circuit: each source must reach the receiver exactly once. Repeated contributions produce unstable overlapping rings; missing sources leave gaps. More light alone cannot open the doorway. Correct choices are reversible until the player actually leaves.

Clues are physical and agree with the circuit:

- Floor cables run from the backs of the lamp pedestals to wells behind opaque screens.
- Markings on the backs of lamps match their source wells.
- Pulsing a well excites its two connected lamp paths.
- Each shutter changes that lamp's contribution to the receiver.

Walk with WASD and look with the captured mouse. Escape releases the cursor for menus; click the scene to resume. Touch and the optional uncaptured mode use dragging. Approach and look at an object. E switches a lamp or inspects a well, receiver, or doorway. Q traces the targeted lamp's cable. There is no automatic approach, global solve action, scripted sequence, timer, penalty, spreadsheet, or quest card. Optional hints are requested in settings.

“Explore without walking” provides individual landmark navigation, and text view describes the same circuit without showing unearned connections. These modes retain the same decisions and win condition. Reduced motion preserves static markings and wires.

Open `play.html` or `dist/index.html` directly in a browser. Both are self-contained. No account, API key, model call, or server is required. Edit `shell.html` and the modules/styles under `dist/`, then run `node build-standalone.mjs` to update the local files and the GitHub Pages entry. Run `node check.mjs` to verify all switch configurations across multiple wirings, cable destinations, occlusion, movement passages, and packaging.

The course lesson emerges from the player's actions: trace the origins of apparently separate observations before treating them as independent evidence. The ending makes this connection explicit only after the player solves the circuit.

Inspired by [COMPSS 211A: Computing I](https://github.com/macss-berkeley/compss-211a), especially its [course synthesis](https://github.com/macss-berkeley/compss-211a/blob/main/lessons/week13_final-presentations/course_synthesis_and_next_steps.md). This is a metaphor rather than a real dataset. The unlisted GitHub Pages entry is `docs/interactives/echo-chamber.html`. It is omitted from course navigation and requests `noindex,nofollow,noarchive`; the URL is publicly accessible. Local previews remain available.

## Atmosphere

The chamber is now a vaulted moonlit instrument hall with brass orbital frames, an eclipsed moon, procedural stars, lit stone, reflective floor highlights, low drifting haze, suspended dust, and a bloom/vignette compositing pass. The doorway opens gradually and reveals a receding corridor of light. All geometry and effects are generated locally.

Optional Web Audio starts only after a gesture. Source tones become unsettled when contributions overlap, and settle into a chord when balanced. Switches, well pulses, and soft footsteps share a generated reverb. Sound can be muted in the header or settings. Reduced motion and text mode remain available; the circuit needs no audio clue.
