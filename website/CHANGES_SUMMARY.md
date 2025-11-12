# Website Changes Summary for Online Deployment

## Files Modified in This Session

### 1. **services.html** (Collections Page)
**Location:** `services.html`

**Changes Made:**
- Added Exodus video (Masterpiece1.mov) as first item in Gods Collection carousel
- Changed all videos from autoplay to user-controlled (added `controls`, removed `autoplay`)
- Changed `preload="none"` to `preload="metadata"` for all videos (shows poster/first frame)
- Added `type="video/mp4"` to all video sources for better browser compatibility
- All videos now have `muted`, `loop`, `playsinline`, `preload="metadata"`, and `controls` attributes

**SECTION TO COPY/PASTE:**

Replace the entire carousel sections (lines 44-143) with:

```html
      <section id="gods-collection" class="gallery">
        <div class="gallery__container">
          <h2 class="services__title">Gods Collection</h2>
          <div class="main__text" style="text-align:center; max-width:800px; margin: 0 auto 2rem;">
            A curated series uniting Masterpiece works. All pieces belong to the Gods Collection.<br/>
            Featured works: <strong>Exodus</strong> and <strong>Chronicles</strong>.
          </div>
          <div class="carousel">
            <button class="carousel__button carousel__button--prev" aria-label="Previous">&#x2190;</button>
            <div class="carousel-row">
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls poster="Website Images/Home/Home-Service-2.png">
                  <source src="Website Images/Home/Masterpiece1.mov" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div class="gallery__label">Gods Collection — Exodus</div>
              </div>
              <div class="gallery__item">
                <img src="Website Images/Home/Masterpiece2.jpeg" alt="Masterpiece 2" />
              <div class="gallery__label">Gods Collection — Exodus</div>
              </div>
              <div class="gallery__item">
                <img src="Website Images/Home/Masterpiece4.jpeg" alt="Masterpiece 4" />
              <div class="gallery__label">Gods Collection — Exodus</div>
              </div>
              <div class="gallery__item">
                <img src="Website Images/Home/Masterpiece5.jpeg" alt="Masterpiece 5" />
              <div class="gallery__label">Gods Collection — Exodus</div>
              </div>
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls poster="Website Images/Home/MasterpieceChronicles1.jpeg">
                  <source src="Website Images/Home/MasterpieceChronicles.mov" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div class="gallery__label">Gods Collection — Chronicles</div>
              </div>
              <div class="gallery__item">
                <img src="Website Images/Home/MasterpieceChronicles1.jpeg" alt="Masterpiece Chronicles 1" />
              <div class="gallery__label">Gods Collection — Chronicles</div>
              </div>
              <div class="gallery__item">
                <img src="Website Images/Home/MasterpieceChronicles2.jpeg" alt="Masterpiece Chronicles 2" />
              <div class="gallery__label">Gods Collection — Chronicles</div>
              </div>
            </div>
            <button class="carousel__button carousel__button--next" aria-label="Next">&#x2192;</button>
          </div>
        </div>
      </section>
      <section id="chakra-collection" class="gallery">
        <div class="gallery__container">
          <h2 class="services__title">Chakra Collection</h2>
          <div class="main__text" style="text-align:center; max-width:800px; margin: 0 auto 2rem;">
            Seven meditative works inspired by the chakras. Scroll to explore each piece.
          </div>
          <div class="carousel">
            <button class="carousel__button carousel__button--prev" aria-label="Previous">&#x2190;</button>
            <div class="carousel-row">
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls data-name="sahasrara" data-alt-sources="Website Images/Home/Sahasrara.mp4, Website Images/Home/Sahasrara.MP4" poster="Website Images/Home/Home-Service-1.png">
                  <source src="Website Images/Home/Sahasrara.mov" type="video/mp4" />
                </video>
                <div class="gallery__label">Chakra Collection — Sahasrara</div>
              </div>
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls data-alt-sources="Website Images/Home/Anja.mp4, Website Images/Home/Anja.MP4, Website Images/Home/Ajna.mp4, Website Images/Home/Ajna.MP4">
                  <source src="Website Images/Home/Anja.mov" type="video/mp4" />
                </video>
                <div class="gallery__label">Chakra Collection — Anja</div>
              </div>
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls data-alt-sources="Website Images/Home/Vishudda.mp4, Website Images/Home/Vishudda.MP4, Website Images/Home/Vishuddha.mp4, Website Images/Home/Vishuddha.MP4">
                  <source src="Website Images/Home/Vishudda.mov" type="video/mp4" />
                </video>
                <div class="gallery__label">Chakra Collection — Vishudda</div>
              </div>
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls>
                  <source src="Website Images/Home/Manipura.mp4" type="video/mp4" />
                </video>
                <div class="gallery__label">Chakra Collection — Manipura</div>
              </div>
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls>
                  <source src="Website Images/Home/Svadhishthana.mp4" type="video/mp4" />
                </video>
                <div class="gallery__label">Chakra Collection — Svadhishthana</div>
              </div>
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls>
                  <source src="Website Images/Home/Anahata.mp4" type="video/mp4" />
                </video>
                <div class="gallery__label">Chakra Collection — Anahata</div>
              </div>
              <div class="gallery__item">
                <video muted loop playsinline preload="metadata" controls>
                  <source src="Website Images/Home/Muldhara.mp4" type="video/mp4" />
                </video>
                <div class="gallery__label">Chakra Collection — Muldhara</div>
              </div>
            </div>
            <button class="carousel__button carousel__button--next" aria-label="Next">&#x2192;</button>
          </div>
        </div>
      </section>
```

---

### 2. **js/script.js** (JavaScript)
**Location:** `js/script.js`

**Changes Made:**
- Added code to ensure ALL videos are muted programmatically
- Added listener to prevent users from unmuting videos

**SECTION TO COPY/PASTE:**

Add this code block after line 33 (after the spollerButtons code, before the Video background handling section):

```javascript
// Ensure all videos are muted
document.addEventListener('DOMContentLoaded', function() {
  const allVideos = document.querySelectorAll('video');
  allVideos.forEach((video) => {
    video.muted = true;
    video.setAttribute('muted', '');
    // Ensure muted state persists even if user tries to unmute
    video.addEventListener('volumechange', function() {
      if (!video.muted) {
        video.muted = true;
      }
    });
  });
});
```

**ALSO UPDATE:** The carousel video handling section (around lines 130-235) should have user-controlled playback (no autoplay). The current code already has this - just ensure it matches the section that handles video fallbacks but doesn't autoplay.

---

### 3. **css/style.css** (Styling)
**Location:** `css/style.css`

**Changes Made:**
- Updated `.gallery__item video` to include `display: block`
- Added styling for videos with poster attributes
- Changed video controls from hidden to visible with rounded corners

**SECTION TO COPY/PASTE:**

Replace the video styling section (around lines 1389-1425) with:

```css
.gallery__item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
  background: #000;
  display: block;
}

.gallery__item video[poster] {
  background-color: #000;
  background-image: var(--poster-bg, none);
}

/* Fine-tune crop for Sahasrara: keep centered */
.gallery__item video[data-name="sahasrara"] {
  object-position: center center;
}

/* Ensure homepage Heritage preview stays centered */
.item-services__image #heritagePreview {
  object-position: center center;
}

/* Ensure homepage Gods preview stays centered */
.item-services__image #contemporaryPreview {
  object-position: center center;
}

/* Show native controls for user interaction */
.gallery__item video::-webkit-media-controls-enclosure {
  border-radius: 0 0 16px 16px;
}
```

---

## Files That Need to Be Copied to Server

Make sure these video/image files are uploaded to your server in the correct locations:

### From `Website Images/Collections/` → Copy to `Website Images/Home/`:
- `Masterpiece1.mov` (19MB)
- `Masterpiece2.jpeg` (3.0MB)
- `Masterpiece4.jpeg` (1.7MB)
- `Masterpiece5.jpeg` (1.9MB)

### Files already in `Website Images/Home/` (ensure these are uploaded):
- `Masterpiece1.mov` ✓
- `Masterpiece2.jpeg` ✓
- `Masterpiece4.jpeg` ✓
- `Masterpiece5.jpeg` ✓
- `MasterpieceChronicles.mov` ✓
- `MasterpieceChronicles1.jpeg` ✓
- `MasterpieceChronicles2.jpeg` ✓
- `Sahasrara.mov` ✓
- `Anja.mov` ✓
- `Vishudda.mov` ✓
- `Manipura.mp4` ✓
- `Svadhishthana.mp4` ✓
- `Anahata.mp4` ✓
- `Muldhara.mp4` ✓
- `Home-Service-1.png` (poster for Sahasrara) ✓
- `Home-Service-2.png` (poster for Exodus) ✓

---

## Summary of Key Changes

1. ✅ **Exodus video added** - Now displays as first item in Gods Collection carousel
2. ✅ **All videos muted** - Both in HTML and enforced via JavaScript
3. ✅ **User-controlled playback** - Videos show controls, users must click play (better loading performance)
4. ✅ **Poster images visible** - Videos show preview/poster before play with `preload="metadata"`
5. ✅ **Better browser compatibility** - Added `type="video/mp4"` to all video sources

---

## Testing Checklist Before Going Live

- [ ] All videos display poster images before play
- [ ] All videos are muted and stay muted
- [ ] Exodus video displays correctly in Gods Collection
- [ ] All Chakra Collection videos show previews
- [ ] Carousel navigation works (previous/next buttons)
- [ ] Videos play when user clicks play button
- [ ] Videos loop properly when playing
- [ ] All images load correctly
- [ ] Page loads quickly (videos don't autoplay, improving performance)

---

**Last Updated:** Current session
**Files Modified:** services.html, js/script.js, css/style.css
