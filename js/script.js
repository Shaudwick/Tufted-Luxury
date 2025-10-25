document.querySelector(".icon-menu").addEventListener("click", function (event) {
  event.preventDefault();
  document.body.classList.toggle("menu-open");
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
