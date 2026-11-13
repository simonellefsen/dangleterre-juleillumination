# Juleillumination · Hotel d'Angleterre

An animated three.js piece built from photos of the Christmas illumination at
Hotel d'Angleterre, Kongens Nytorv, Copenhagen (13 November 2026), with
Københavns Drengekor singing from the balcony.

- `index.html`, `main.js` – the scene: light-led cross-fades, twinkling lights, snow
- `music.js` – "Glade jul" / "Silent Night" (Gruber, 1818, public domain), synthesised
  with the Web Audio API. Put a recording you hold a licence for at `audio/music.mp3`
  and it is played instead.
- `img/` – the photos, resized for the web

Run locally with `python3 -m http.server --directory .` and open the printed address.
Add `?t=47` to the address to start just before the lights come on.
