# Juleillumination · Hotel d'Angleterre

An animated three.js piece built from photos of the Christmas illumination at
Hotel d'Angleterre, Kongens Nytorv, Copenhagen (13 November 2026), with
Københavns Drengekor singing from the balcony.

- `index.html`, `scene.js` – the hotel built procedurally in three.js: façade, ground-floor arcade,
  gingerbread tower, light curtain, the choir on the balcony, the crowd, trees and snow
- `photos.html`, `photos.js` – the original photos as an animated sequence
- `music.js` – "Glade jul" / "Silent Night" (Gruber, 1818, public domain), synthesised
  with the Web Audio API. Put a recording you hold a licence for at `audio/music.mp3`
  and it is played instead.
- `img/` – the reference photos, resized for the web

Run locally with `python3 -m http.server --directory .` and open the printed address.
Add `?t=30` to the address to start just before the lights come on, or `?t=50&hold` for a still.
