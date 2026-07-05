(function () {
  window.CARD_COLLECTION_IMAGES = {
    theSun: [
      "Website-Images/The Sun.jpg",
      "Website-Images/The Sun.jpeg",
      "Website-Images/The Sun.png",
      "Website-Images/Sun Card.jpg",
      "Website-Images/Sun Card.jpeg",
      "Website-Images/SunCard.jpg",
      "Website-Images/SunCard.jpeg",
    ],
    theMagician: [
      "Website-Images/The Magician.jpg",
      "Website-Images/The Magician.jpeg",
      "Website-Images/The Magician.png",
      "Website-Images/Magician.jpg",
      "Website-Images/Magician.jpeg",
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
