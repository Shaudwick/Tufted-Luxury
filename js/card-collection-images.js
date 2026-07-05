(function () {
  window.CARD_COLLECTION_IMAGES = {
    sunCard: [
      "Website-Images/Sun Card.jpg",
      "Website-Images/Sun Card.jpeg",
      "Website-Images/Sun Card.png",
      "Website-Images/The Sun.jpg",
      "Website-Images/The Sun.jpeg",
      "Website-Images/sun-card.jpg",
      "Website-Images/sun-card.jpeg",
      "Website-Images/SunCard.jpg",
      "Website-Images/SunCard.jpeg",
    ],
    magician: [
      "Website-Images/The Magician.jpg",
      "Website-Images/The Magician.jpeg",
      "Website-Images/The Magician.png",
      "Website-Images/Magician.jpg",
      "Website-Images/Magician.jpeg",
      "Website-Images/the-magician.jpg",
      "Website-Images/the-magician.jpeg",
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
