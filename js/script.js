// Mobile menu toggle - wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  // Try multiple selectors to find the menu icon
  const menuIcon = document.querySelector('.icon-menu') || document.querySelector('.menu__icon') || document.querySelector('button[class*="icon-menu"]');
  const menuBody = document.querySelector('.menu__body');
  const menuLinks = document.querySelectorAll('.menu__link');
  
  // Toggle menu when hamburger icon is clicked
  if (menuIcon) {
    // Remove any existing listeners by cloning
    const newMenuIcon = menuIcon.cloneNode(true);
    menuIcon.parentNode.replaceChild(newMenuIcon, menuIcon);
    
    newMenuIcon.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.toggle("menu-open");
      
      // Prevent body scroll when menu is open
      if (document.body.classList.contains("menu-open")) {
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
      } else {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
      }
    });
    
    // Also add touch event for better mobile support
    newMenuIcon.addEventListener("touchend", function (event) {
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.toggle("menu-open");
      
      if (document.body.classList.contains("menu-open")) {
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
      } else {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
      }
    });
  }
  
  // Close menu when clicking navigation links
  menuLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Allow navigation to happen, but close menu
      setTimeout(() => {
        document.body.classList.remove('menu-open');
        document.body.style.overflow = "";
      }, 100);
    });
  });
  
  // Close menu when clicking outside (on overlay/background)
  if (menuBody) {
    menuBody.addEventListener('click', function(e) {
      // Only close if clicking the menu body itself, not the links
      if (e.target === menuBody || e.target.classList.contains('menu__body')) {
        document.body.classList.remove('menu-open');
        document.body.style.overflow = "";
      }
    });
  }
  
  // Close menu on window resize (if resizing to desktop)
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      document.body.classList.remove('menu-open');
      document.body.style.overflow = "";
    }
  });
});

const spollerButtons = document.querySelectorAll("[data-spoller] .spollers-faq__button");

spollerButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const currentItem = button.closest("[data-spoller]");
    const content = currentItem.querySelector(".spollers-faq__text");

    const parent = currentItem.parentNode;
    const isOneSpoller = parent.hasAttribute("data-one-spoller");

    if (isOneSpoller) {
      const allItems = parent.querySelectorAll("[data-spoller]");
      allItems.forEach((item) => {
        if (item !== currentItem) {
          const otherContent = item.querySelector(".spollers-faq__text");
          item.classList.remove("active");
          otherContent.style.maxHeight = null;
        }
      });
    }

    if (currentItem.classList.contains("active")) {
      currentItem.classList.remove("active");
      content.style.maxHeight = null;
    } else {
      currentItem.classList.add("active");
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
});

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

// Video background handling
document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('hero-video');
    
    if (video) {
        // Simple play attempt
        const playVideo = () => {
            video.play()
                .then(() => console.log('Video playing successfully'))
                .catch(error => {
                    console.error('Error playing video:', error);
                    // Retry after a short delay
                    setTimeout(() => {
                        video.load();
                        video.play().catch(e => console.error('Retry failed:', e));
                    }, 1000);
                });
        };

        // Initial play attempt
        playVideo();

        // Handle successful loading
        video.addEventListener('loadeddata', () => {
            console.log('Video loaded');
            playVideo();
        });

        // Handle errors
        video.addEventListener('error', (e) => {
            console.error('Video error:', video.error);
        });
    }
});

// Ensure services card preview videos autoplay and loop
document.addEventListener('DOMContentLoaded', function() {
  const previews = document.querySelectorAll('.item-services__image video[autoplay], .about__media video[autoplay]');
  previews.forEach((vid) => {
    try {
      vid.muted = true; // ensure autoplay policy compliance
      vid.setAttribute('playsinline', '');
      const attemptPlay = () => {
        const playPromise = vid.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {
            // retry once after small delay
            setTimeout(() => {
              vid.load();
              vid.play().catch(() => {});
            }, 500);
          });
        }
      };

      // Playlist support (comma-separated paths in data-playlist)
      const playlistAttr = vid.getAttribute('data-playlist');
      if (playlistAttr) {
        const sources = playlistAttr.split(',').map(s => s.trim()).filter(Boolean);
        let idx = 0;
        const switchTo = (i) => {
          if (!sources.length) return;
          idx = (i + sources.length) % sources.length;
          vid.src = sources[idx];
          vid.load();
          attemptPlay();
        };
        // Start playlist
        switchTo(0);
        vid.addEventListener('ended', () => switchTo(idx + 1));
        // In case readyState fires before src set
        vid.addEventListener('loadeddata', attemptPlay, { once: true });
      } else {
        // Simple single-video loop
        if (vid.readyState >= 2) attemptPlay();
        else vid.addEventListener('loadeddata', attemptPlay, { once: true });
        vid.addEventListener('ended', () => { vid.currentTime = 0; vid.play().catch(() => {}); });
      }
    } catch (e) {}
  });
});

// =========================
// Collections Carousel + Video Autoplay
// =========================
document.addEventListener('DOMContentLoaded', function() {
  const carousels = document.querySelectorAll('.carousel');
  carousels.forEach((carousel) => {
    const row = carousel.querySelector('.carousel-row');
    const prevBtn = carousel.querySelector('.carousel__button--prev');
    const nextBtn = carousel.querySelector('.carousel__button--next');
    if (!row) return;

    const getStep = () => Math.max(320, Math.floor(row.clientWidth * 0.8));
    const updateButtons = () => {
      const maxScroll = row.scrollWidth - row.clientWidth - 2;
      if (prevBtn) prevBtn.disabled = row.scrollLeft <= 0;
      if (nextBtn) nextBtn.disabled = row.scrollLeft >= maxScroll;
    };
    updateButtons();
    row.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);

    if (prevBtn) prevBtn.addEventListener('click', () => {
      row.scrollBy({ left: -getStep(), behavior: 'smooth' });
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      row.scrollBy({ left: getStep(), behavior: 'smooth' });
    });

    // Video fallback handling for carousel videos (user-controlled playback)
    const videos = row.querySelectorAll('video');
    
    // Install source fallback logic for videos that fail to load
    const installFallback = (vid) => {
      try {
        // Build list: current src or first <source>, then data-alt-sources
        const explicitSource = (vid.currentSrc || vid.src || (vid.querySelector('source') && vid.querySelector('source').getAttribute('src')) || '').trim();
        const altAttr = (vid.getAttribute('data-alt-sources') || '').trim();
        const alternates = altAttr ? altAttr.split(',').map(s => s.trim()).filter(Boolean) : [];
        const candidates = [];
        if (explicitSource) candidates.push(explicitSource);
        alternates.forEach(a => { if (!candidates.includes(a)) candidates.push(a); });
        if (!candidates.length) return;
        vid.dataset.fallbackIndex = '0';

        const mimeFor = (url) => {
          const u = url.toLowerCase();
          if (u.endsWith('.mp4') || u.includes('.mp4?')) return 'video/mp4';
          if (u.endsWith('.mov') || u.includes('.mov?')) return 'video/mp4'; // many .mov files contain H.264
          if (u.endsWith('.webm')) return 'video/webm';
          return '';
        };

        const canPlay = (url) => {
          try {
            const mime = mimeFor(url);
            if (!mime) return true; // let browser sniff if unknown
            const res = vid.canPlayType(mime);
            return res === 'probably' || res === 'maybe';
          } catch { return true; }
        };

        const tryNext = () => {
          let i = parseInt(vid.dataset.fallbackIndex || '0', 10);
          i = (i + 1);
          if (i >= candidates.length) return; // no more fallbacks
          vid.dataset.fallbackIndex = String(i);
          const nextSrc = candidates[i];
          // swap out <source> child for consistency
          const s = vid.querySelector('source') || document.createElement('source');
          s.setAttribute('src', nextSrc);
          const mime = mimeFor(nextSrc);
          if (mime) s.setAttribute('type', mime); else s.removeAttribute('type');
          if (!s.parentNode) vid.appendChild(s);
          vid.src = nextSrc;
          vid.load();
        };

        // On error, skip to the next candidate; also pre-skip if canPlayType says no
        if (!canPlay(candidates[0])) {
          tryNext();
        }
        vid.addEventListener('error', tryNext);
      } catch (e) {}
    };

    // Install fallbacks but don't autoplay - users will click play
    videos.forEach((v) => {
      installFallback(v);
      // Ensure loop works when user plays video
      v.addEventListener('ended', () => { 
        if (!v.paused) {
          v.currentTime = 0;
          v.play().catch(() => {});
        }
      });
    });
  });
});

// =========================
// Tickets Drawer & Payments
// =========================
(function() {
  const TICKET_PRICE = 49; // USD
  const PAYPAL_ME = "https://paypal.me/YourName"; // replace
  const VENMO_USER = "YourVenmo"; // replace, no @
  const CASHAPP_TAG = "YourCashTag"; // replace, no $
  const STRIPE_LINK = "https://buy.stripe.com/your_link"; // replace
  const ZELLE_EMAIL = "tickets@example.com"; // replace or leave blank
  const ZELLE_PHONE = ""; // optional

  const $ = (s, p = document) => p.querySelector(s);
  const overlay = $("#checkoutOverlay");
  const drawer = $("#checkoutDrawer");
  const openBtn = $("#openCheckout");
  const closeBtn = $("#closeCheckout");
  const qtyInput = $("#ticketQty");
  const priceEl = $("#ticketPrice");
  const totalEl = $("#ticketTotal");
  const zelleInfo = $("#zelleInfo");
  const zelleTarget = $("#zelleTarget");
  const zelleAmount = $("#zelleAmount");
  const copyZelle = $("#copyZelle");

  const payPayPal = $("#payPayPal");
  const payVenmo = $("#payVenmo");
  const payCashApp = $("#payCashApp");
  const payCard   = $("#payCard");
  const payZelle  = $("#payZelle");

  function formatUSD(n) {
    try { return n.toLocaleString("en-US", { style: "currency", currency: "USD" }); } catch { return `$${n.toFixed(2)}`; }
  }
  function getQty() {
    let q = parseInt(qtyInput && qtyInput.value, 10);
    if (isNaN(q) || q < 1) q = 1;
    return q;
  }
  function updateTotals() {
    if (!priceEl || !totalEl) return;
    const q = getQty();
    priceEl.textContent = formatUSD(TICKET_PRICE);
    totalEl.textContent = formatUSD(q * TICKET_PRICE);
    if (zelleAmount) zelleAmount.textContent = formatUSD(q * TICKET_PRICE);
  }
  function openDrawer() {
    updateTotals();
    if (overlay) overlay.hidden = false;
    requestAnimationFrame(() => {
      if (overlay) overlay.classList.add("active");
      if (drawer) {
        drawer.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
      }
    });
  }
  function closeDrawer() {
    if (overlay) overlay.classList.remove("active");
    if (drawer) {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
    }
    setTimeout(() => { if (overlay) overlay.hidden = true; }, 300);
    if (zelleInfo) zelleInfo.hidden = true;
  }

  if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openDrawer(); });
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  if (drawer) drawer.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".qty-btn");
    if (!btn) return;
    const step = parseInt(btn.getAttribute("data-step"), 10) || 0;
    if (qtyInput) {
      qtyInput.value = Math.max(1, getQty() + step);
      updateTotals();
    }
  });
  if (qtyInput) qtyInput.addEventListener("input", updateTotals);

  // Payment links
  if (payPayPal) payPayPal.addEventListener("click", (e) => {
    const amount = (getQty() * TICKET_PRICE).toFixed(2);
    payPayPal.setAttribute("href", `${PAYPAL_ME}/${amount}`);
  });

  if (payVenmo) payVenmo.addEventListener("click", (e) => {
    e.preventDefault();
    const amount = (getQty() * TICKET_PRICE).toFixed(2);
    const note = encodeURIComponent("Event Tickets");
    const deepLink = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(VENMO_USER)}&amount=${amount}&note=${note}`;
    const webFallback = `https://venmo.com/u/${encodeURIComponent(VENMO_USER)}`;
    const timeout = setTimeout(() => window.open(webFallback, "_blank", "noopener"), 800);
    window.location.href = deepLink;
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearTimeout(timeout); }, { once: true });
  });

  if (payCashApp) payCashApp.addEventListener("click", () => {
    const amount = (getQty() * TICKET_PRICE).toFixed(2);
    payCashApp.setAttribute("href", `https://cash.app/$${encodeURIComponent(CASHAPP_TAG)}/${amount}`);
  });

  if (payCard) payCard.addEventListener("click", () => {
    payCard.setAttribute("href", STRIPE_LINK);
  });

  if (payZelle) payZelle.addEventListener("click", () => {
    if (zelleInfo) zelleInfo.hidden = false;
    const target = ZELLE_EMAIL || ZELLE_PHONE || "your Zelle";
    if (zelleTarget) zelleTarget.textContent = target;
  });

  if (copyZelle) copyZelle.addEventListener("click", async () => {
    const amount = formatUSD(getQty() * TICKET_PRICE);
    const target = ZELLE_EMAIL || ZELLE_PHONE || "";
    const text = `Zelle Payment\nTo: ${target}\nAmount: ${amount}\nNote: Event Tickets`;
    try {
      await navigator.clipboard.writeText(text);
      copyZelle.textContent = "Copied!";
      setTimeout(() => (copyZelle.textContent = "Copy details"), 1500);
    } catch (err) {
      copyZelle.textContent = "Copy failed";
      setTimeout(() => (copyZelle.textContent = "Copy details"), 1500);
    }
  });

  updateTotals();
})();

// =========================
// Merchandise Shirt Toggle (Front/Back View)
// =========================
document.addEventListener('DOMContentLoaded', function() {
  const toggleItems = document.querySelectorAll('.merchandise__item--toggle');
  
  toggleItems.forEach(item => {
    const imageContainer = item.querySelector('.merchandise__image--toggle');
    const frontImage = item.querySelector('.merchandise__image-front');
    const backImage = item.querySelector('.merchandise__image-back');
    const viewText = item.querySelector('.merchandise__view-text');
    
    if (!imageContainer || !frontImage || !backImage) return;
    
    let isShowingFront = true;
    
    imageContainer.addEventListener('click', function(e) {
      // Don't toggle if clicking the button
      if (e.target.closest('.merchandise__button')) return;
      
      isShowingFront = !isShowingFront;
      
      // Smooth fade transition
      if (isShowingFront) {
        backImage.style.opacity = '0';
        setTimeout(() => {
          frontImage.style.display = 'block';
          backImage.style.display = 'none';
          frontImage.style.opacity = '1';
        }, 200);
        if (viewText) viewText.textContent = 'Front';
      } else {
        frontImage.style.opacity = '0';
        setTimeout(() => {
          backImage.style.display = 'block';
          frontImage.style.display = 'none';
          backImage.style.opacity = '1';
        }, 200);
        if (viewText) viewText.textContent = 'Back';
      }
    });
  });
});