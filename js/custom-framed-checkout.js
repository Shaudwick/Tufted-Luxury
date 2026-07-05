(function () {
  const PRICING = {
    "11x14": { label: "11 × 14", deposit: 75, starting: 225, detailed: 325 },
    "16x20": { label: "16 × 20", deposit: 100, starting: 300, detailed: 450 },
    "20x30": { label: "20 × 30", deposit: 150, starting: 400, detailed: 575 },
    "24x36": { label: "24 × 36", deposit: 175, starting: 500, detailed: 750 },
  };

  const DEPOSIT_LINK_KEYS = {
    "11x14": "framedDeposit11x14",
    "16x20": "framedDeposit16x20",
    "20x30": "framedDeposit20x30",
    "24x36": "framedDeposit24x36",
  };

  const FULL_LINK_KEYS = {
    "11x14": "framedFull11x14",
    "16x20": "framedFull16x20",
    "20x30": "framedFull20x30",
    "24x36": "framedFull24x36",
  };

  const form = document.getElementById("commissionForm");
  if (!form) return;

  const button = document.getElementById("submitButton");
  const frameSizeEl = document.getElementById("frameSize");
  const designTypeEl = document.getElementById("designType");
  const paymentModeEl = document.getElementById("paymentMode");
  const priceSummaryEl = document.getElementById("priceSummary");
  const noticeEl = document.getElementById("checkoutNotice");

  function formatMoney(amount) {
    return "$" + amount.toLocaleString("en-US");
  }

  function getPaymentLinks() {
    return typeof window.BLACK_LOBBY_PAYMENT_LINKS === "object" &&
      window.BLACK_LOBBY_PAYMENT_LINKS !== null
      ? window.BLACK_LOBBY_PAYMENT_LINKS
      : {};
  }

  function getPaymentLink(frameSize, mode) {
    const links = getPaymentLinks();
    const keyMap = mode === "full" ? FULL_LINK_KEYS : DEPOSIT_LINK_KEYS;
    const key = keyMap[frameSize];
    if (!key || !links[key]) return "";
    const url = String(links[key]).trim();
    return /^https:\/\/.+/.test(url) ? url : "";
  }

  function getQuote() {
    const frameSize = frameSizeEl.value;
    const designType = designTypeEl.value;
    const paymentMode = paymentModeEl.value;

    if (!frameSize || !designType || !PRICING[frameSize]) {
      return null;
    }

    const tier = PRICING[frameSize];
    const fullPrice = designType === "detailed" ? tier.detailed : tier.starting;
    const deposit = tier.deposit;
    const checkoutAmount = paymentMode === "full" ? fullPrice : deposit;
    const remaining = paymentMode === "full" ? 0 : fullPrice - deposit;

    return {
      frameSize,
      designType,
      paymentMode,
      frameLabel: tier.label,
      fullPrice,
      deposit,
      checkoutAmount,
      remaining,
      checkoutUrl: getPaymentLink(frameSize, paymentMode),
    };
  }

  function updateSummary() {
    const quote = getQuote();

    if (!quote) {
      priceSummaryEl.textContent = "Select a frame size and design type to see your total.";
      button.textContent = "Claim your Exclusive Piece";
      return;
    }

    const designLabel = quote.designType === "detailed" ? "Detailed design" : "Starting design";

    if (quote.paymentMode === "full") {
      priceSummaryEl.innerHTML =
        "<strong>" +
        quote.frameLabel +
        " · " +
        designLabel +
        "</strong><br>Total due today: " +
        formatMoney(quote.checkoutAmount) +
        " (paid in full)";
    } else {
      priceSummaryEl.innerHTML =
        "<strong>" +
        quote.frameLabel +
        " · " +
        designLabel +
        "</strong><br>Deposit due today: " +
        formatMoney(quote.deposit) +
        " · Remaining balance: " +
        formatMoney(quote.remaining) +
        " · Full price: " +
        formatMoney(quote.fullPrice);
    }

    button.textContent = "Claim your Exclusive Piece";
  }

  function showCheckoutNotice() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
      noticeEl.hidden = false;
      noticeEl.className = "framed-pieces__notice framed-pieces__notice--success";
      noticeEl.textContent =
        "Thank you — your payment was received. We will review your design details and follow up shortly.";
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("canceled") === "true") {
      noticeEl.hidden = false;
      noticeEl.className = "framed-pieces__notice framed-pieces__notice--cancel";
      noticeEl.textContent = "Checkout was canceled. You can try again below.";
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  [frameSizeEl, designTypeEl, paymentModeEl].forEach(function (el) {
    el.addEventListener("change", updateSummary);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const quote = getQuote();
    if (!quote) {
      alert("Please choose a frame size and design type.");
      return;
    }

    if (!quote.checkoutUrl) {
      alert("Checkout is not available for this selection. Please contact us.");
      return;
    }

    button.disabled = true;
    button.textContent = "Opening Secure Checkout...";
    window.location.href = quote.checkoutUrl;
  });

  showCheckoutNotice();
  updateSummary();
})();
