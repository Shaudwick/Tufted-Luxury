(function () {
  "use strict";

  var rooms = document.querySelectorAll(".exhibit-room");
  var navLinks = document.querySelectorAll(".exhibit-room-nav a");

  if (!rooms.length) return;

  /* Reveal on scroll */
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );
    rooms.forEach(function (room) {
      revealObs.observe(room);
    });
  } else {
    rooms.forEach(function (room) {
      room.classList.add("is-visible");
    });
  }

  /* Active nav dot */
  if (navLinks.length && "IntersectionObserver" in window) {
    var navObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navLinks.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + id
            );
          });
        });
      },
      { threshold: 0.45 }
    );
    rooms.forEach(function (room) {
      navObs.observe(room);
    });
  }

  /* Subtle parallax on images */
  var frames = document.querySelectorAll(".exhibit-piece__frame img");
  var parallaxEnabled =
    window.matchMedia("(prefers-reduced-motion: no-preference)").matches &&
    window.innerWidth > 900;

  if (parallaxEnabled && frames.length) {
    var ticking = false;
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          frames.forEach(function (img) {
            var rect = img.getBoundingClientRect();
            var center = rect.top + rect.height * 0.5 - window.innerHeight * 0.5;
            var shift = Math.max(-24, Math.min(24, center * 0.04));
            img.style.transform = "translateY(" + shift + "px) scale(1)";
          });
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  /* Smooth anchor scroll */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
