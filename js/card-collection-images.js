(function () {
  window.CARD_COLLECTION_IMAGES = {
    sunCard: [
      "Website-Images/SunCard/Sun Card.jpg",
      "Website-Images/SunCard/Sun Card.jpeg",
      "Website-Images/SunCard/sun-card.jpg",
      "Website-Images/SunCard/sun-card.jpeg",
      "Website-Images/Sun Card.jpg",
      "Website-Images/Sun Card.jpeg",
    ],
    magician: [
      "Website-Images/Magician/The Magician.jpg",
      "Website-Images/Magician/The Magician.jpeg",
      "Website-Images/Magician/the-magician.jpg",
      "Website-Images/Magician/the-magician.jpeg",
      "Website-Images/The Magician.jpg",
      "Website-Images/The Magician.jpeg",
    ],
  };

  function wireCardImage(img) {
    const key = img.getAttribute("data-card-image");
    const sources = window.CARD_COLLECTION_IMAGES[key];
    if (!sources || !sources.length) return;

    let index = 0;
    img.onerror = function () {
      index += 1;
      if (index < sources.length) {
        img.src = sources[index];
      }
    };
    img.src = sources[0];
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-card-image]").forEach(wireCardImage);
  });
})();
