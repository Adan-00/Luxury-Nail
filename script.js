console.log("✅ script.js loaded");

(() => {
  "use strict";

  // =========================
  // Helpers
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const storage = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };

  // ✅ Backend base
  const isFile = location.protocol === "file:";
  const BACKEND = isFile
    ? "http://localhost:8080"
    : "https://luxury-nail-backend.onrender.com";

  document.addEventListener("DOMContentLoaded", () => {
    themeToggleInit();
    navDropdownInit();
    revealInit(); // ✅ ONE reveal system (auto-tags missing sections)
    bookingInit();
    authTabsInit();
    faqInit();
    sliderInit();
    cookieInit();
    lightboxInit();
  });

  // =========================
  // Theme Toggle
  // =========================
  function themeToggleInit() {
    const btn = $("#themeToggle");
    if (!btn) return;

    const root = document.documentElement;
    const saved = storage.get("theme");

    if (saved === "dark" || saved === "light") {
      root.setAttribute("data-theme", saved);
    } else {
      root.removeAttribute("data-theme");
    }

    const deviceDark = window.matchMedia?.("(prefers-color-scheme: dark)");

    const isDarkNow = () => {
      const attr = root.getAttribute("data-theme");
      if (attr === "dark") return true;
      if (attr === "light") return false;
      return !!deviceDark?.matches;
    };

    const setIcon = () => {
      btn.textContent = isDarkNow() ? "☀️" : "🌙";
    };

    setIcon();

    btn.addEventListener("click", () => {
      const next = isDarkNow() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      storage.set("theme", next);
      setIcon();
    });

    deviceDark?.addEventListener?.("change", () => {
      if (!storage.get("theme")) setIcon();
    });
  }

  // =========================
  // Nav dropdown <details>
  // =========================
  function navDropdownInit() {
    const drop = $(".nav-drop");
    if (!drop) return;

    drop.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) drop.open = false;
    });

    document.addEventListener("click", (e) => {
      if (!drop.open) return;
      if (!drop.contains(e.target)) drop.open = false;
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drop.open) drop.open = false;
    });
  }

  // =========================
  // ✅ Reveal on Scroll (FIXED)
  // =========================
  function revealInit() {
    document
      .querySelectorAll(
        [
          ".service-guide__card",
          ".aftercare__card",
          ".about__point",
          ".about__card",
          ".service-guide__header",
          ".service-guide__cta",
          ".aftercare__header",
          ".aftercare__note",
          ".about__content",
          ".about__cta",
          ".faq__header",
          ".faq__item",
          ".footer .footer-block",
          ".footer-bottom",
        ].join(",")
      )
      .forEach((el) => {
        if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "");
      });

    const els = Array.from(document.querySelectorAll('[data-reveal], .reveal, .stagger'));
    if (!els.length) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    els.forEach((el) => {
      if (!el.classList.contains("reveal")) el.classList.add("reveal");
      const d = Number(el.getAttribute("data-delay") || 0);
      if (d) el.style.transitionDelay = `${d}ms`;
    });

    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;

          requestAnimationFrame(() => {
            el.classList.add("is-visible");

            if (el.classList.contains("stagger")) {
              Array.from(el.children).forEach((child, i) => {
                child.style.transitionDelay = `${i * 90}ms`;
              });
            }
          });

          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => io.observe(el));
  }

  window.addEventListener("hashchange", () => {
    setTimeout(() => {
      try {
        revealInit();
      } catch {}
    }, 60);
  });

  // =========================
  // Booking / Slots ✅ FIXED
  // =========================
function bookingInit() {
  const form = $("#bookingForm");
  if (!form) return;

  const successBox = $("#formSuccess");
  const errorBox = $("#formError");
  const serviceSelect = $("#service");
  const dateInput = $("#date");
  const timeSelect = $("#time");
  const timeHint = $("#timeHint");

  if (!successBox || !errorBox || !serviceSelect || !dateInput || !timeSelect || !timeHint) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  const setStatus = ({ ok, msg }) => {
    hide(successBox);
    hide(errorBox);
    if (!msg) return;
    if (ok) {
      successBox.textContent = msg;
      show(successBox);
    } else {
      errorBox.textContent = msg;
      show(errorBox);
    }
  };

  // ✅ helper: read field by id OR by form.name
  const getVal = (id, formName) => {
    const byId = document.getElementById(id);
    if (byId && typeof byId.value === "string") return byId.value.trim();
    const byName = form[formName];
    if (byName && typeof byName.value === "string") return byName.value.trim();
    return "";
  };

  // ✅ timezone-safe min date
  const pad = (n) => String(n).padStart(2, "0");
  const todayLocal = new Date();
  dateInput.min = `${todayLocal.getFullYear()}-${pad(todayLocal.getMonth() + 1)}-${pad(todayLocal.getDate())}`;

  function resetTimeDropdown(msg) {
    timeSelect.innerHTML = `<option value="">Pick a time</option>`;
    timeSelect.disabled = true;
    timeHint.textContent = msg || "Pick a service + date to see available times.";
  }

  function getServiceValue() {
    // ✅ handles cases where option value="" but text exists
    const v = (serviceSelect.value || "").trim();
    if (v) return v;
    const text = serviceSelect.options?.[serviceSelect.selectedIndex]?.textContent?.trim() || "";
    // avoid placeholder text
    if (!text || /select/i.test(text)) return "";
    return text;
  }

  function toggleSubmit() {
    if (!submitBtn) return;

    const fullName = getVal("fullName", "fullName");
    const email = getVal("clientEmail", "clientEmail");
    const contact = getVal("contactDetail", "contactDetail");
    const service = getServiceValue();
    const date = (dateInput.value || "").trim();
    const time = (timeSelect.value || "").trim();

    submitBtn.disabled = !(fullName && email && contact && service && date && time);
  }

  form.addEventListener("input", toggleSubmit);
  form.addEventListener("change", toggleSubmit);

  async function loadAvailableSlots() {
    const date = (dateInput.value || "").trim();
    const service = getServiceValue();

    resetTimeDropdown("Loading available times...");

    if (!date || !service) return;

    try {
      const res = await fetch(`${BACKEND}/api/slots?date=${encodeURIComponent(date)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load slots");

      const available = Array.isArray(data.slots) ? data.slots : [];

      if (!available.length) {
        resetTimeDropdown("No slots left 😭");
        toggleSubmit();
        return;
      }

      timeSelect.innerHTML = `<option value="">Pick a time</option>`;
      available.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        timeSelect.appendChild(opt);
      });

      timeSelect.disabled = false;
      timeHint.textContent = "Choose a time to continue.";
      toggleSubmit();
    } catch (err) {
      resetTimeDropdown(
        isFile
          ? "Server not running on localhost:8080"
          : (err?.message || "Could not load slots right now.")
      );
      toggleSubmit();
    }
  }

  serviceSelect.addEventListener("change", loadAvailableSlots);
  dateInput.addEventListener("change", loadAvailableSlots);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus({ ok: true, msg: "" });

    const originalText = submitBtn?.textContent || "Send Booking Request";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }

    const payload = {
      fullName: getVal("fullName", "fullName"),
      clientEmail: getVal("clientEmail", "clientEmail"),
      contactDetail: getVal("contactDetail", "contactDetail"),
      service: getServiceValue(),
      date: (dateInput.value || "").trim(),
      time: (timeSelect.value || "").trim(),
      notes: getVal("notes", "notes"),
      website: getVal("website", "website"),
    };

    console.log("📦 booking payload ->", payload);

    if (!payload.service || !payload.date || !payload.time) {
      setStatus({ ok: false, msg: "Please select a service, date and time 🫶" });
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Booking failed");

      setStatus({ ok: true, msg: "Request sent ✅ We’ll confirm your booking soon." });
      form.reset();
      resetTimeDropdown();
      toggleSubmit();
    } catch (err) {
      setStatus({ ok: false, msg: err?.message || "Something went wrong. Try again." });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });

  resetTimeDropdown();
  toggleSubmit();
}


    // ✅ FIX: timezone-safe min date (no ISO shift)
    const pad = (n) => String(n).padStart(2, "0");
    const todayLocal = new Date();
    dateInput.min = `${todayLocal.getFullYear()}-${pad(todayLocal.getMonth() + 1)}-${pad(todayLocal.getDate())}`;

    function resetTimeDropdown(msg) {
      timeSelect.innerHTML = `<option value="">Pick a time</option>`;
      timeSelect.disabled = true;
      timeHint.textContent = msg || "Pick a service + date to see available times.";
    }

    function toggleSubmit() {
      if (!submitBtn) return;

      const fullName = form.fullName?.value?.trim();
      const email = form.clientEmail?.value?.trim();
      const contact = form.contactDetail?.value?.trim();
      const service = serviceSelect.value;
      const date = dateInput.value;
      const time = timeSelect.value;

      submitBtn.disabled = !(fullName && email && contact && service && date && time);
    }

    form.addEventListener("input", toggleSubmit);
    form.addEventListener("change", toggleSubmit);

    // ✅ FIXED SLOT LOADER
    async function loadAvailableSlots() {
      const date = dateInput.value;
      const service = serviceSelect.value;

      resetTimeDropdown("Loading available times...");

      if (!date || !service) return;

      try {
        const res = await fetch(`${BACKEND}/api/slots?date=${encodeURIComponent(date)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load slots");

        // ✅ server returns { slots: [...] }
        const available = Array.isArray(data.slots) ? data.slots : [];

        if (!available.length) {
          resetTimeDropdown("No slots left 😭");
          toggleSubmit();
          return;
        }

        timeSelect.innerHTML = `<option value="">Pick a time</option>`;
        available.forEach((t) => {
          const opt = document.createElement("option");
          opt.value = t;
          opt.textContent = t;
          timeSelect.appendChild(opt);
        });

        timeSelect.disabled = false;
        timeHint.textContent = "Choose a time to continue.";
        toggleSubmit();
      } catch (err) {
        resetTimeDropdown(
          isFile
            ? "Server not running on localhost:8080"
            : (err?.message || "Could not load slots right now.")
        );
        toggleSubmit();
      }
    }

    serviceSelect.addEventListener("change", loadAvailableSlots);
    dateInput.addEventListener("change", loadAvailableSlots);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus({ ok: true, msg: "" });

      const originalText = submitBtn?.textContent || "Send Booking Request";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      const payload = {
        fullName: form.fullName?.value?.trim(),
        clientEmail: form.clientEmail?.value?.trim(),
        contactDetail: form.contactDetail?.value?.trim(),
        service: serviceSelect.value,
        date: dateInput.value,
        time: timeSelect.value,
        notes: form.notes?.value?.trim() || "",
        website: form.website?.value || "",
      };

      try {
        const res = await fetch(`${BACKEND}/api/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Booking failed");

        setStatus({ ok: true, msg: "Request sent ✅ We’ll confirm your booking soon." });
        form.reset();
        resetTimeDropdown();
        toggleSubmit();
      } catch (err) {
        setStatus({ ok: false, msg: err?.message || "Something went wrong. Try again." });
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });

    resetTimeDropdown();
    toggleSubmit();
  }

  // =========================
  // Auth Tabs
  // =========================
  function authTabsInit() {
    const tabs = $$(".auth-tab");
    const panels = $$("[data-auth-panel]");
    if (!tabs.length || !panels.length) return;

    function setActive(tabName) {
      tabs.forEach((t) => {
        const isActive = t.dataset.authTab === tabName;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      panels.forEach((p) => {
        const match = p.dataset.authPanel === tabName;
        p.classList.toggle("hidden", !match);
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        setActive(tab.dataset.authTab);
      });
    });

    const alreadyActive = $(".auth-tab.is-active")?.dataset.authTab;
    setActive(alreadyActive || "login");
  }

  // =========================
  // FAQ: only one open
  // =========================
  function faqInit() {
    const items = $$(".faq__item");
    if (!items.length) return;

    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  // =========================
  // Slider
  // =========================
  function sliderInit() {
    const root = $("[data-slider]") || $("#slider");
    if (!root) return;

    const track = $("[data-track]", root) || $(".slider__track", root);
    const slides = $$(".slide", root);
    const nextBtn = $(".slider__btn.next", root);
    const prevBtn = $(".slider__btn.prev", root);
    const dots = $$(".dot", root);

    if (!track || !slides.length) return;

    let index = 0;
    let autoplay = null;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const clamp = (i) => (i % slides.length + slides.length) % slides.length;

    const update = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
    };

    const next = () => {
      index = clamp(index + 1);
      update();
    };
    const prev = () => {
      index = clamp(index - 1);
      update();
    };

    nextBtn?.addEventListener("click", next);
    prevBtn?.addEventListener("click", prev);

    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        index = i;
        update();
      });
      dot.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          index = i;
          update();
        }
      });
    });

    const start = () => {
      if (reduced) return;
      stop();
      autoplay = setInterval(next, 5500);
    };
    const stop = () => {
      if (autoplay) clearInterval(autoplay);
      autoplay = null;
    };

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

    update();
    start();
  }

  // =========================
  // Cookies (data-cookie)
  // =========================
  function cookieInit() {
    const CONSENT_KEY = "cookieConsent_v1";

    const banner = $("#cookieBanner");
    const modal = $("#cookieModal");
    if (!banner || !modal) return;

    const btnAccept = $('[data-cookie="accept"]', banner);
    const btnReject = $('[data-cookie="reject"]', banner);
    const btnManage = $('[data-cookie="manage"]', banner);

    const btnClose = $('[data-cookie="close"]', modal);
    const btnSave = $('[data-cookie="save"]', modal);
    const btnAcceptAll = $('[data-cookie="accept"]', modal);

    const analyticsToggle = $("#cookieAnalytics");
    const marketingToggle = $("#cookieMarketing");

    const showBanner = () => (banner.style.display = "block");
    const hideBanner = () => (banner.style.display = "none");

    const openModal = () => modal.classList.remove("hidden");
    const closeModal = () => modal.classList.add("hidden");

    const safeJson = (str) => {
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    };

    const existing = safeJson(storage.get(CONSENT_KEY, ""));
    const hasChoice = existing && typeof existing.choice === "string";

    if (hasChoice) {
      hideBanner();
      if (analyticsToggle) analyticsToggle.checked = !!existing.analytics;
      if (marketingToggle) marketingToggle.checked = !!existing.marketing;
    } else {
      showBanner();
    }

    const saveConsent = (data) => storage.set(CONSENT_KEY, JSON.stringify(data));

    const acceptAll = () => {
      saveConsent({ choice: "accepted", analytics: true, marketing: true, ts: Date.now() });
      hideBanner();
      closeModal();
    };

    const rejectNonEssential = () => {
      saveConsent({ choice: "rejected", analytics: false, marketing: false, ts: Date.now() });
      hideBanner();
      closeModal();
    };

    const saveCustom = () => {
      saveConsent({
        choice: "custom",
        analytics: !!analyticsToggle?.checked,
        marketing: !!marketingToggle?.checked,
        ts: Date.now(),
      });
      hideBanner();
      closeModal();
    };

    btnAccept?.addEventListener("click", acceptAll);
    btnReject?.addEventListener("click", rejectNonEssential);
    btnManage?.addEventListener("click", openModal);

    btnAcceptAll?.addEventListener("click", acceptAll);
    btnSave?.addEventListener("click", saveCustom);
    btnClose?.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
      const panel = $(".cookie-modal__panel", modal);
      if (panel && !panel.contains(e.target)) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
    });

    document.addEventListener("click", (e) => {
      const t = e.target.closest("#openCookieSettings, #openCookieSettingsMobile");
      if (!t) return;
      e.preventDefault();
      openModal();
    });
  }

  // =========================
  // Lightbox
  // =========================
  function lightboxInit() {
    const items = $$("[data-gallery]");
    const lightbox = $("#lightbox");
    const img = $("#lightboxImg");
    const title = $("#lightboxTitle");
    const closeBtn = $("#closeBtn");
    const prevBtn = $("#prevBtn");
    const nextBtn = $("#nextBtn");

    if (!items.length || !lightbox || !img || !title || !closeBtn || !prevBtn || !nextBtn) return;

    let index = 0;

    const open = (i) => {
      index = i;
      const el = items[index];
      const src = el.getAttribute("data-src") || el.querySelector("img")?.src;
      const t = el.getAttribute("data-title") || "Gallery";
      const alt = el.getAttribute("data-alt") || t;

      img.src = src || "";
      img.alt = alt;
      title.textContent = t;

      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      setTimeout(() => {
        try {
          revealInit();
        } catch {}
      }, 50);
    };

    const close = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    const prev = () => open((index - 1 + items.length) % items.length);
    const next = () => open((index + 1) % items.length);

    items.forEach((el, i) => {
      el.addEventListener("click", () => open(i));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(i);
        }
      });
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", prev);
    nextBtn.addEventListener("click", next);

    lightbox.addEventListener("click", (e) => {
      const panel = $(".lightbox-panel", lightbox);
      if (panel && !panel.contains(e.target)) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });
  }
})();


