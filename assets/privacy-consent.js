(function () {
  "use strict";

  var STORAGE_KEY = "dq_cookie_consent_v1";
  var CONSENT_VERSION = 1;
  var CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  var MEASUREMENT_ID = "G-V04PWW3N8K";
  var CRISP_WEBSITE_ID = "c785cede-88b3-45b5-8a16-4c8b9508d7d3";
  var currentConsent = null;
  var previousFocus = null;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    personalization_storage: "denied",
    wait_for_update: 500
  });
  window.gtag("set", "ads_data_redaction", true);

  function hasPrivacySignal() {
    return navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";
  }

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.version !== CONSENT_VERSION || !parsed.savedAt) return null;
      if (Date.now() - parsed.savedAt > CONSENT_MAX_AGE_MS) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return {
        version: CONSENT_VERSION,
        analytics: parsed.analytics === true,
        supportChat: parsed.supportChat === true,
        savedAt: parsed.savedAt
      };
    } catch (error) {
      return null;
    }
  }

  function writeConsent(analytics, supportChat) {
    var choice = {
      version: CONSENT_VERSION,
      analytics: analytics === true,
      supportChat: supportChat === true,
      savedAt: Date.now()
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch (error) {
      // The choice still applies to the current page if storage is unavailable.
    }
    return choice;
  }

  function updateGoogleConsent(isGranted) {
    window.gtag("consent", "update", {
      analytics_storage: isGranted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      personalization_storage: "denied"
    });
  }

  function loadAnalytics() {
    if (document.querySelector("script[data-dq-google-analytics]")) return;
    updateGoogleConsent(true);
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    script.setAttribute("data-dq-google-analytics", "true");
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: "SameSite=Lax;Secure"
    });
  }

  function positionCrispLauncher() {
    if (!window.matchMedia("(max-width: 860px)").matches) return;
    document.querySelectorAll(".crisp-client *").forEach(function (element) {
      var style = window.getComputedStyle(element);
      if (style.position !== "fixed") return;
      var rect = element.getBoundingClientRect();
      var isLauncher = rect.width >= 44 && rect.width <= 100
        && rect.height >= 44 && rect.height <= 100
        && rect.right >= window.innerWidth - 32
        && rect.bottom >= window.innerHeight - 32;
      if (!isLauncher) return;
      element.style.setProperty("right", "22px", "important");
      element.style.setProperty("bottom", "22px", "important");
    });
  }

  function loadSupportChat() {
    if (!document.documentElement.hasAttribute("data-dq-crisp")) return;
    if (document.querySelector("script[data-dq-crisp-chat]")) return;
    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    var script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    script.setAttribute("data-dq-crisp-chat", "true");
    document.head.appendChild(script);

    var observer = new MutationObserver(positionCrispLauncher);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", positionCrispLauncher);
    window.addEventListener("load", positionCrispLauncher);
  }

  function expireCookie(name, domain) {
    document.cookie = name + "=; Max-Age=0; path=/; SameSite=Lax" + (domain ? "; domain=" + domain : "");
  }

  function clearAnalyticsStorage() {
    document.cookie.split(";").forEach(function (entry) {
      var name = entry.split("=")[0].trim();
      if (name.indexOf("_ga") === 0) {
        expireCookie(name, "");
        expireCookie(name, location.hostname);
        expireCookie(name, ".bookdominicanquest.com");
      }
    });
  }

  function clearSupportChatStorage() {
    document.cookie.split(";").forEach(function (entry) {
      var name = entry.split("=")[0].trim();
      if (name.indexOf("crisp-client") === 0) {
        expireCookie(name, "");
        expireCookie(name, location.hostname);
        expireCookie(name, ".bookdominicanquest.com");
      }
    });
    try {
      Object.keys(window.localStorage).forEach(function (key) {
        if (key.indexOf("crisp-client") === 0) window.localStorage.removeItem(key);
      });
    } catch (error) {
      // Optional storage may be unavailable in private browsing modes.
    }
  }

  function closeBanner() {
    var banner = document.getElementById("dqConsentBanner");
    if (banner) banner.remove();
  }

  function closePreferences() {
    var modal = document.getElementById("dqConsentPreferences");
    if (modal) modal.remove();
    document.body.classList.remove("dq-consent-modal-open");
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    previousFocus = null;
  }

  function applyChoice(analytics, supportChat) {
    var shouldReload = currentConsent && (
      (currentConsent.analytics && !analytics)
      || (currentConsent.supportChat && !supportChat)
    );
    currentConsent = writeConsent(analytics, supportChat);
    updateGoogleConsent(analytics);
    if (analytics) loadAnalytics();
    if (supportChat) loadSupportChat();
    if (!analytics) clearAnalyticsStorage();
    if (!supportChat) clearSupportChatStorage();
    closeBanner();
    closePreferences();
    if (shouldReload) window.location.reload();
  }

  function openPreferences() {
    closePreferences();
    previousFocus = document.activeElement;
    var modal = document.createElement("div");
    modal.id = "dqConsentPreferences";
    modal.className = "dq-consent-overlay";
    modal.innerHTML = [
      '<section class="dq-consent-preferences" role="dialog" aria-modal="true" aria-labelledby="dqPreferencesTitle">',
      '  <div class="dq-consent-preferences__head">',
      '    <div><span class="dq-consent-kicker">Privacy controls</span><h2 id="dqPreferencesTitle">Cookie settings</h2></div>',
      '    <button type="button" class="dq-consent-icon-button" data-dq-close-preferences aria-label="Close cookie settings">&times;</button>',
      '  </div>',
      '  <p>Choose which optional services may load. Essential website features remain available either way.</p>',
      '  <div class="dq-consent-option">',
      '    <div><strong>Necessary storage</strong><span>Remembers your privacy choice and supports security and booking functions.</span></div>',
      '    <span class="dq-consent-always">Always active</span>',
      '  </div>',
      '  <label class="dq-consent-option" for="dqAnalyticsConsent">',
      '    <div><strong>Analytics</strong><span>Google Analytics helps us understand visits, pages viewed, and website performance.</span></div>',
      '    <input id="dqAnalyticsConsent" type="checkbox">',
      '  </label>',
      '  <label class="dq-consent-option" for="dqChatConsent">',
      '    <div><strong>Support chat</strong><span>Crisp provides the optional live-chat widget and remembers a chat session.</span></div>',
      '    <input id="dqChatConsent" type="checkbox">',
      '  </label>',
      '  <p class="dq-consent-detail">Advertising storage and personalized advertising remain disabled. Read our <a href="/privacy/">Privacy &amp; Cookie Policy</a>.</p>',
      '  <div class="dq-consent-actions dq-consent-actions--preferences">',
      '    <button type="button" class="dq-consent-button dq-consent-button--secondary" data-dq-reject>Reject optional</button>',
      '    <button type="button" class="dq-consent-button dq-consent-button--primary" data-dq-save-preferences>Save preferences</button>',
      '  </div>',
      '</section>'
    ].join("");
    document.body.appendChild(modal);
    document.body.classList.add("dq-consent-modal-open");
    modal.querySelector("#dqAnalyticsConsent").checked = currentConsent ? currentConsent.analytics : false;
    modal.querySelector("#dqChatConsent").checked = currentConsent ? currentConsent.supportChat : false;
    modal.querySelector("[data-dq-close-preferences]").focus();
  }

  function showBanner() {
    if (document.getElementById("dqConsentBanner")) return;
    var banner = document.createElement("section");
    banner.id = "dqConsentBanner";
    banner.className = "dq-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "dqConsentTitle");
    banner.innerHTML = [
      '<div class="dq-consent-banner__copy">',
      '  <span class="dq-consent-kicker">Your privacy, your choice</span>',
      '  <h2 id="dqConsentTitle">Optional cookies are off until you choose</h2>',
      '  <p>We use Google Analytics to improve the website and Crisp for optional live chat. You can accept, reject, or choose each service. Booking and WhatsApp still work without them. <a href="/privacy/">Privacy &amp; Cookie Policy</a></p>',
      '</div>',
      '<div class="dq-consent-actions">',
      '  <button type="button" class="dq-consent-button dq-consent-button--ghost" data-dq-open-preferences>Choose settings</button>',
      '  <button type="button" class="dq-consent-button dq-consent-button--secondary" data-dq-reject>Reject optional</button>',
      '  <button type="button" class="dq-consent-button dq-consent-button--primary" data-dq-accept>Accept optional</button>',
      '</div>'
    ].join("");
    document.body.appendChild(banner);
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-dq-accept], [data-dq-reject], [data-dq-open-preferences], [data-dq-close-preferences], [data-dq-save-preferences], [data-dq-cookie-settings]");
    if (!target) return;
    if (target.matches("[data-dq-cookie-settings]")) event.preventDefault();
    if (target.matches("[data-dq-accept]")) applyChoice(true, true);
    if (target.matches("[data-dq-reject]")) applyChoice(false, false);
    if (target.matches("[data-dq-open-preferences], [data-dq-cookie-settings]")) openPreferences();
    if (target.matches("[data-dq-close-preferences]")) closePreferences();
    if (target.matches("[data-dq-save-preferences]")) {
      var analytics = document.getElementById("dqAnalyticsConsent").checked;
      var supportChat = document.getElementById("dqChatConsent").checked;
      applyChoice(analytics, supportChat);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.getElementById("dqConsentPreferences")) closePreferences();
  });

  currentConsent = readConsent();
  if (hasPrivacySignal()) {
    currentConsent = currentConsent || { analytics: false, supportChat: false, savedAt: Date.now() };
    currentConsent.analytics = false;
    currentConsent.supportChat = false;
  }

  if (currentConsent) {
    updateGoogleConsent(currentConsent.analytics);
    if (currentConsent.analytics) loadAnalytics();
    if (currentConsent.supportChat) loadSupportChat();
    if (!currentConsent.analytics) clearAnalyticsStorage();
    if (!currentConsent.supportChat) clearSupportChatStorage();
  }

  function startConsentUi() {
    if (!currentConsent) showBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startConsentUi, { once: true });
  } else {
    startConsentUi();
  }
})();
