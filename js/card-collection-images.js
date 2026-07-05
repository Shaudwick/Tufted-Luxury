(function () {
  window.CARD_COLLECTION_IMAGES = {
    sunCard: [
      "Website-Images/suncard.jpeg",
      "Website-Images/IMG_5052.jpeg",
      "Website-Images/suncard.jpg",
      "Website-Images/SunCard.jpeg",
      "Website-Images/SunCard.jpg",
    ],
    magician: [
      "Website-Images/themagician.jpeg",
      "Website-Images/IMG_5053.jpeg",
      "Website-Images/themagician.jpg",
      "Website-Images/TheMagician.jpeg",
      "Website-Images/TheMagician.jpg",
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
