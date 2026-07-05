(function () {
  const PRICING = {
    "11x14": { label: "11 × 14", deposit: 75, starting: 225, detailed: 325 },
    "16x20": { label: "16 × 20", deposit: 100, starting: 300, detailed: 450 },
    "20x30": { label: "20 × 30", deposit: 150, starting: 400, detailed: 575 },
    "24x36": { label: "24 × 36", deposit: 175, starting: 500, detailed: 750 },
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
    };
  }

  function updateSummary() {
    const quote = getQuote();

    if (!quote) {
      priceSummaryEl.textContent = "Select a frame size and design type to see your total.";
      button.textContent = "Submit Request + Pay Deposit";
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
      button.textContent = "Submit Request + Pay " + formatMoney(quote.checkoutAmount);
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
      button.textContent = "Submit Request + Pay " + formatMoney(quote.deposit) + " Deposit";
    }
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
      noticeEl.textContent = "Checkout was canceled. Your details were not submitted — you can try again below.";
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  [frameSizeEl, designTypeEl, paymentModeEl].forEach(function (el) {
    el.addEventListener("change", updateSummary);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const quote = getQuote();
    if (!quote) {
      alert("Please choose a frame size and design type.");
      return;
    }

    button.disabled = true;
    button.textContent = "Opening Secure Checkout...";

    const payload = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      frameSize: quote.frameSize,
      designType: quote.designType,
      paymentMode: quote.paymentMode,
      concept: document.getElementById("concept").value.trim(),
      colors: document.getElementById("colors").value.trim(),
      space: document.getElementById("space").value.trim(),
      deadline: document.getElementById("deadline").value,
      delivery: document.getElementById("delivery").value,
      referenceUrl: document.getElementById("referenceUrl").value.trim(),
    };

    try {
      const response = await fetch("/api/custom-framed-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      alert(data.error || "Unable to open checkout. Please try again.");
    } catch (error) {
      alert("Something went wrong. Please try again.");
    }

    button.disabled = false;
    updateSummary();
  });

  showCheckoutNotice();
  updateSummary();
})();
