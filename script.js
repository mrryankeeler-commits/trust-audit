const revealItems = document.querySelectorAll(".reveal");

if (revealItems.length) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    revealItems.forEach((item) => observer.observe(item));
  }
}

const GOOGLE_SCRIPT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzigOYWXX01SL2vzqgW6rdira2-D_zajxOugLLjrcAtnp27qFgV63OtUr4Bw0h7CBQ4bw/exec";

const form = document.querySelector("#trust-audit-form");
const requestSection = document.querySelector("#request");
const headerRequestLink = document.querySelector('.header-link[href="#request"]');
const heroRequestLink = document.querySelector('.hero-actions a[href="#request"]');

// Shared with the early analytics guard in index.html.
const previewMode = window.TRUST_AUDIT_PREVIEW === true;

if (form) {
  const steps = Array.from(form.querySelectorAll(".form-step"));
  const TOTAL_STEPS = steps.length;
  const stepText = document.querySelector("#form-step-text");
  const progressBar = document.querySelector("#form-progress-bar");
  const backButton = document.querySelector("#form-back");
  const nextButton = document.querySelector("#form-next");
  const submitButton = document.querySelector("#form-submit");
  const successPanel = document.querySelector("#form-success");
  const submitError = document.querySelector("#form-submit-error");
  const testPanel = document.querySelector("#form-test-panel");
  const testStatus = document.querySelector("#form-test-status");
  const testMode = previewMode;
  const hasRealEndpoint =
    GOOGLE_SCRIPT_ENDPOINT &&
    GOOGLE_SCRIPT_ENDPOINT !== "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
  const SESSION_STORAGE_KEY = "trust_audit_session_id";
  const REQUEST_SECTION_VIEW_KEY = "trust_audit_request_section_viewed";
  const FORM_STARTED_KEY = "trust_audit_form_started";
  const STEP_VIEW_KEY = "trust_audit_step_views";
  const pageStartTime = Date.now();

  const sampleRequest = {
    name: "Alex Example",
    email: "alex@example.com",
    company_name: "Example Advisory",
    role: "Founder / co-founder",
    linkedin_url: "alex-example",
    offer_summary: "We help B2B software teams plan and deliver complex implementation projects.",
    commercial_focus: "I’d like potential clients to understand why they would hire us.",
    linkedin_current_state: "I get views or engagement, but few useful conversations",
    specific_notes: "Please look at whether my profile explains the value of our client work."
  };

  // Preview data stays in memory and is never sent to the live endpoint.
  if (previewMode) window.trustAuditPreview = { submissions: [], events: [] };

  let currentStep = 0;
  let isSubmitting = false;
  let maxStepReached = 1;
  let submitted = false;
  let pageExitTracked = false;
  let sessionSummaryTracked = false;

  const logTest = (...args) => {
    if (!testMode) return;
    console.log(...args);
  };

  const safeSessionStorage = {
    getItem(key) {
      try {
        return window.sessionStorage.getItem(key);
      } catch (error) {
        logTest("[analytics] sessionStorage get failed", key, error);
        return null;
      }
    },
    setItem(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch (error) {
        logTest("[analytics] sessionStorage set failed", key, error);
      }
    }
  };

  const getSessionId = () => {
    const existingId = safeSessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existingId) return existingId;

    const generatedId =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `trust-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    safeSessionStorage.setItem(SESSION_STORAGE_KEY, generatedId);
    return generatedId;
  };

  const sessionId = getSessionId();
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = {
    utm_source: urlParams.get("utm_source") || "",
    utm_medium: urlParams.get("utm_medium") || "",
    utm_campaign: urlParams.get("utm_campaign") || ""
  };

  const getStoredStepViews = () => {
    const raw = safeSessionStorage.getItem(STEP_VIEW_KEY);
    if (!raw) return new Set();

    try {
      return new Set(JSON.parse(raw));
    } catch (error) {
      logTest("[analytics] step view parse failed", error);
      return new Set();
    }
  };

  const trackedStepViews = getStoredStepViews();
  const EVENT_FIELD_DEFAULTS = {
    record_type: "event",
    event_name: "",
    session_id: sessionId,
    timestamp: "",
    page_url: "",
    referrer: "",
    utm_source: utmParams.utm_source,
    utm_medium: utmParams.utm_medium,
    utm_campaign: utmParams.utm_campaign,
    step_number: "",
    step_name: "",
    fit_outcome: "",
    duration_seconds: "",
    max_step_reached: "",
    form_started: false,
    submitted: false,
    viewport_width: "",
    source: "trust-audit-page"
  };
  const BLOCKED_EVENT_FIELDS = new Set([
    "name",
    "email",
    "linkedin_url",
    "company_name",
    "role",
    "offer_summary",
    "specific_notes",
    "commercial_focus",
    "commercial_focus_other_detail",
    "current_gaps",
    "current_gaps_other_detail",
    "linkedin_current_state",
    "linkedin_current_state_other_detail",
    "role_other_detail"
  ]);

  const persistTrackedSteps = () => {
    safeSessionStorage.setItem(STEP_VIEW_KEY, JSON.stringify(Array.from(trackedStepViews)));
  };

  const hasStartedForm = () => safeSessionStorage.getItem(FORM_STARTED_KEY) === "true";

  const markFormStarted = () => {
    safeSessionStorage.setItem(FORM_STARTED_KEY, "true");
  };

  const trackClarityEvent = (eventName) => {
    if (!previewMode && typeof window.clarity === "function") {
      window.clarity("event", eventName);
    }
  };

  const getCurrentStepMeta = (index = currentStep) => {
    const step = steps[index];
    const stepNumber = index + 1;
    const stepName = step?.querySelector("h3")?.textContent?.trim() || "";

    return {
      stepNumber,
      stepName
    };
  };

  const getDurationSeconds = () => Math.max(0, Math.round((Date.now() - pageStartTime) / 1000));

  const serializeEventPayload = (payload) =>
    Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        value === undefined || value === null ? "" : String(value)
      ])
    );

  const sanitizeEventProperties = (properties = {}) =>
    Object.fromEntries(
      Object.entries(properties).filter(([key]) => !BLOCKED_EVENT_FIELDS.has(key))
    );

  const buildEventPayload = (eventName, properties = {}) => ({
    ...EVENT_FIELD_DEFAULTS,
    event_name: eventName,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    page_url: window.location.href,
    referrer: document.referrer || "",
    fit_outcome: "",
    max_step_reached: maxStepReached,
    form_started: hasStartedForm(),
    submitted,
    viewport_width: window.innerWidth || document.documentElement.clientWidth || "",
    ...sanitizeEventProperties(properties)
  });

  const sendAnalyticsPayload = (payload, { keepalive = false } = {}) => {
    if (previewMode) {
      window.trustAuditPreview.events.push(payload);
      return;
    }
    if (!hasRealEndpoint) {
      logTest("[analytics:send] skipped because endpoint is placeholder", payload);
      return;
    }

    const body = new URLSearchParams(serializeEventPayload(payload));
    logTest("[analytics:send] posting to Google Apps Script", payload);
    fetch(GOOGLE_SCRIPT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive,
      body
    }).catch((error) => {
      logTest("[analytics:send] failed", error, payload);
    });
  };

  const trackEvent = (eventName, properties = {}, options = {}) => {
    const payload = buildEventPayload(eventName, properties);

    trackClarityEvent(eventName);

    if (testMode) {
      console.log("[analytics:event]", eventName, payload);
      console.log("[analytics:state]", {
        max_step_reached: maxStepReached,
        submitted
      });
    }

    sendAnalyticsPayload(payload, options);
  };

  const trackStepView = (index) => {
    const { stepNumber, stepName } = getCurrentStepMeta(index);
    const stepKey = `${stepNumber}:${stepName}`;

    maxStepReached = Math.max(maxStepReached, stepNumber);

    if (trackedStepViews.has(stepKey)) return;

    trackedStepViews.add(stepKey);
    persistTrackedSteps();
    trackEvent("form_step_view", {
      step_number: stepNumber,
      step_name: stepName,
      max_step_reached: maxStepReached
    });
  };

  const trackFormStarted = () => {
    if (hasStartedForm()) return;

    markFormStarted();
    trackEvent("form_started");
  };

  const countVisibleErrorsForStep = (index) => {
    const step = steps[index];
    if (!step) return 0;

    return Array.from(step.querySelectorAll(".field-error.is-visible")).filter((node) => {
      const text = node.textContent?.trim();
      return Boolean(text);
    }).length;
  };

  const trackValidationError = (index) => {
    const { stepNumber, stepName } = getCurrentStepMeta(index);
    const missingCount = countVisibleErrorsForStep(index);

    trackEvent("form_validation_error", {
      step_number: stepNumber,
      step_name: stepName,
      missing_count: missingCount
    });
  };

  const buildSessionSummaryProperties = () => ({
    duration_seconds: getDurationSeconds(),
    max_step_reached: maxStepReached,
    form_started: hasStartedForm(),
    submitted
  });

  const trackPageExit = () => {
    if (pageExitTracked) return;
    pageExitTracked = true;

    trackEvent(
      "page_exit",
      buildSessionSummaryProperties(),
      { keepalive: true }
    );
  };

  const trackSessionSummary = () => {
    if (sessionSummaryTracked) return;
    sessionSummaryTracked = true;

    trackEvent("session_summary", buildSessionSummaryProperties(), { keepalive: true });
  };

  const updateTestStatus = (message = "") => {
    if (testStatus) testStatus.textContent = message;
  };

  const setStep = (index) => {
    currentStep = Math.max(0, Math.min(index, TOTAL_STEPS - 1));

    steps.forEach((step, stepIndex) => {
      const isActive = stepIndex === currentStep;
      step.hidden = !isActive;
      step.classList.toggle("is-active", isActive);
    });

    const stepNumber = Math.min(currentStep + 1, TOTAL_STEPS);
    const percent = Math.min((stepNumber / TOTAL_STEPS) * 100, 100);
    const isFinalStep = currentStep === TOTAL_STEPS - 1;
    maxStepReached = Math.max(maxStepReached, stepNumber);

    if (stepText) stepText.textContent = `Step ${stepNumber} of ${TOTAL_STEPS}`;
    if (progressBar) progressBar.style.width = `${percent}%`;

    if (backButton) {
      const shouldHideBack = currentStep === 0;
      backButton.hidden = shouldHideBack;
      backButton.disabled = shouldHideBack || isSubmitting;
      backButton.setAttribute("aria-hidden", String(shouldHideBack));
    }
    if (nextButton) {
      nextButton.hidden = isFinalStep;
      nextButton.disabled = isFinalStep || isSubmitting;
      nextButton.setAttribute("aria-hidden", String(isFinalStep));
    }
    if (submitButton) {
      submitButton.hidden = !isFinalStep;
      submitButton.disabled = !isFinalStep || isSubmitting;
      submitButton.setAttribute("aria-hidden", String(!isFinalStep));
    }

    trackStepView(currentStep);
  };

  const setError = (name, message = "") => {
    const field = form.elements[name];
    const errorNode = form.querySelector(`[data-error-for="${name}"]`);
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.toggle("is-visible", Boolean(message));
    }
    if (field) {
      field.classList.toggle("is-invalid", Boolean(message));
      field.setAttribute("aria-invalid", String(Boolean(message)));
      if (errorNode?.id) {
        const descriptions = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
        descriptions.add(errorNode.id);
        field.setAttribute("aria-describedby", Array.from(descriptions).join(" "));
      }
    }
  };

  const getTrimmedValue = (name) => String(form.elements[name]?.value || "").trim();

  const usesProfileFallback = () => !getTrimmedValue("linkedin_url") && Boolean(getTrimmedValue("company_name"));

  const normalizeLinkedInValue = (value) => {
    const entered = String(value || "").trim();
    const usernamePattern = /^[\p{L}\p{N}][\p{L}\p{N}-]*$/u;
    const username = entered.replace(/^@/, "");
    if (usernamePattern.test(username)) {
      return `https://www.linkedin.com/in/${encodeURIComponent(username)}/`;
    }

    try {
      const candidate = /^(www\.)?linkedin\.com\//i.test(entered) ? `https://${entered}` : entered;
      const url = new URL(candidate);
      if (!/^https?:$/.test(url.protocol) ||
          !/^(www\.)?linkedin\.com$/i.test(url.hostname) ||
          url.username || url.password || url.port) return "";
      const profile = url.pathname.match(/^\/in\/([^/]+)\/?$/);
      const handle = profile ? decodeURIComponent(profile[1]) : "";
      if (!usernamePattern.test(handle)) return "";
      return `https://www.linkedin.com/in/${encodeURIComponent(handle)}/`;
    } catch {
      return "";
    }
  };

  const validateStep = (index) => {
    let valid = true;
    steps[index].querySelectorAll("[required]").forEach((field) => {
      let message = "";
      const value = field.value.trim();
      if (!value) {
        const messages = {
          name: "Please add your name.",
          email: "Please add your email address.",
          offer_summary: "Tell me what you sell and who you sell it to.",
          commercial_focus: "Tell me what you’d like LinkedIn to help you with."
        };
        message = messages[field.name];
      } else if (field.name === "email" &&
                 (!field.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
        message = "Please enter a valid email address.";
      }
      setError(field.name, message);
      if (message) valid = false;
    });
    if (index === 0) {
      const profile = getTrimmedValue("linkedin_url");
      let message = "";
      if (!profile && !getTrimmedValue("company_name")) {
        message = "Add your LinkedIn profile link or username, or enter your business name above.";
      } else if (profile && !normalizeLinkedInValue(profile)) {
        message = "Enter a valid LinkedIn profile link or username, or leave this blank and enter your business name above.";
      }
      setError("linkedin_url", message);
      if (message) valid = false;
    }
    return valid;
  };

  const focusFirstError = () => steps[currentStep].querySelector(".is-invalid")?.focus();
  const focusStepTitle = () => steps[currentStep].querySelector("h3")?.focus();

  const clearValidationState = () => {
    submitError.textContent = "";
    submitError.classList.remove("is-visible");
    form.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
      node.classList.remove("is-visible");
    });
    form.querySelectorAll("[name]").forEach((field) => setError(field.name));
  };

  // Keep the existing Apps Script / Requests Sheet keys and order.
  // The goal uses commercial_focus; every retired field remains blank.
  const buildPayload = () => ({
    record_type: "request",
    timestamp: new Date().toISOString(),
    name: getTrimmedValue("name"),
    email: getTrimmedValue("email"),
    linkedin_url: usesProfileFallback() ? "" : normalizeLinkedInValue(getTrimmedValue("linkedin_url")),
    company_name: getTrimmedValue("company_name"),
    role: getTrimmedValue("role"),
    offer_summary: getTrimmedValue("offer_summary"),
    deal_size: "",
    commercial_focus: getTrimmedValue("commercial_focus"),
    current_gaps: "",
    readiness: "",
    linkedin_current_state: getTrimmedValue("linkedin_current_state"),
    specific_notes: [
      usesProfileFallback() ? "Profile not supplied — confirm by email" : "",
      getTrimmedValue("specific_notes")
    ].filter(Boolean).join("\n\n"),
    fit_outcome: "",
    source: "trust-audit-page"
  });

  const renderSuccessState = () => {
    if (!successPanel) return;
    successPanel.innerHTML = `
      <h3>Thanks, I’ve got your request.</h3>
      <p>I’ll review your profile and recent posts with your goal in mind and email you your Trust Audit.</p>
      <div class="form-success-reset">
        <p class="form-success-subtitle">Made a mistake?</p>
        <button type="button" class="form-success-reset-button" id="form-reset-success">Start again</button>
      </div>
    `;
    successPanel.hidden = false;
    form.hidden = true;
    successPanel.focus();
    trackEvent("thank_you_shown", { duration_seconds: getDurationSeconds() });
  };

  const submitPayload = async (payload) => {
    if (previewMode) {
      window.trustAuditPreview.submissions.push({ ...payload });
      updateTestStatus("Simulated request saved in this page’s memory. No live data was sent.");
      return;
    }
    if (!hasRealEndpoint) throw new Error("Submission endpoint is not configured.");
    await fetch(GOOGLE_SCRIPT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(payload)
    });
  };

  const resetFormState = () => {
    isSubmitting = false;
    submitted = false;
    pageExitTracked = false;
    form.reset();
    form.hidden = false;
    if (successPanel) {
      successPanel.hidden = true;
      successPanel.innerHTML = "";
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = `
        <span>Request my Trust Audit</span>
        <span class="material-symbols-rounded button-icon" aria-hidden="true">send</span>
      `;
    }
    if (nextButton) nextButton.disabled = false;
    if (backButton) backButton.disabled = true;
    clearValidationState();
    updateTestStatus("");
    setStep(0);
  };

  const loadTestProfile = () => {
    resetFormState();
    Object.entries(sampleRequest).forEach(([key, value]) => {
      form.elements[key].value = value;
    });
    updateTestStatus("Sample request loaded. Continue and submit to simulate a request.");
  };

  backButton?.addEventListener("click", () => {
    if (currentStep === 0 || isSubmitting) return;
    submitError.textContent = "";
    submitError.classList.remove("is-visible");
    setStep(currentStep - 1);
    focusStepTitle();
  });

  nextButton?.addEventListener("click", () => {
    submitError.textContent = "";
    if (currentStep >= TOTAL_STEPS - 1 || isSubmitting) return;
    trackFormStarted();
    const { stepNumber, stepName } = getCurrentStepMeta(currentStep);
    trackEvent("form_continue_click", {
      step_number: stepNumber,
      step_name: stepName
    });
    if (!validateStep(currentStep)) {
      trackValidationError(currentStep);
      focusFirstError();
      return;
    }
    setStep(currentStep + 1);
    focusStepTitle();
  });

  form.addEventListener("focusin", () => {
    trackFormStarted();
  });

  form.addEventListener("click", () => {
    trackFormStarted();
  });

  const clearFieldError = (event) => {
    trackFormStarted();
    const name = event.target.getAttribute("name");
    if (name) setError(name);
    if (name === "company_name") setError("linkedin_url");
  };
  form.addEventListener("input", clearFieldError);
  form.addEventListener("change", clearFieldError);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting || submitted) return;
    trackFormStarted();
    submitError.textContent = "";
    submitError.classList.remove("is-visible");

    if (currentStep !== TOTAL_STEPS - 1) {
      nextButton?.click();
      return;
    }

    trackEvent("form_submit_attempt", {
      step_number: TOTAL_STEPS,
      step_name: getCurrentStepMeta(TOTAL_STEPS - 1).stepName
    });

    // Revalidate both steps before sending, including details changed by autofill.
    const firstInvalidStep = steps.findIndex((_, index) => !validateStep(index));
    if (firstInvalidStep !== -1) {
      setStep(firstInvalidStep);
      trackValidationError(firstInvalidStep);
      focusFirstError();
      submitError.textContent = "Please complete the required fields before submitting.";
      submitError.classList.add("is-visible");
      return;
    }

    isSubmitting = true;
    const honeypot = getTrimmedValue("contact_time");
    const payload = buildPayload();
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = "<span>Sending...</span>";
    }
    if (nextButton) nextButton.disabled = true;
    if (backButton) backButton.disabled = true;

    try {
      // Preserve the honeypot: silently discard spam and show the same confirmation.
      if (!honeypot) await submitPayload(payload);
      submitted = true;
      trackEvent("form_submitted", {
        step_number: TOTAL_STEPS,
        step_name: getCurrentStepMeta(TOTAL_STEPS - 1).stepName,
        duration_seconds: getDurationSeconds()
      });
      renderSuccessState();
    } catch (error) {
      console.error("Trust Audit submission error:", error);
      submitError.textContent =
        "There was a problem sending your request. Please try again in a moment.";
      submitError.classList.add("is-visible");
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = `
          <span>Request my Trust Audit</span>
          <span class="material-symbols-rounded button-icon" aria-hidden="true">send</span>
        `;
      }
      if (backButton) backButton.disabled = false;
      setStep(currentStep);
    }
  });

  successPanel?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest("#form-reset-success")) {
      trackEvent("start_again_click", {
        fit_outcome: ""
      });
      resetFormState();
      focusStepTitle();
    }
  });

  if (testMode && testPanel) {
    window.sendTrustAuditTestEvent = function () {
      trackEvent("manual_test_event", {
        step_number: "",
        step_name: "",
        fit_outcome: "",
        duration_seconds: "",
        max_step_reached: "",
        form_started: false,
        submitted: false
      });
    };

    testPanel.hidden = false;
    testPanel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const fillButton = target.closest("[data-test-fill]");
      if (fillButton instanceof HTMLElement) {
        loadTestProfile(fillButton.dataset.testFill);
        return;
      }

      const clearButton = target.closest("[data-test-clear]");
      if (clearButton instanceof HTMLElement) {
        resetFormState();
        updateTestStatus("Form cleared.");
        logTest("[test-mode] Form cleared");
      }
    });
  } else {
    delete window.sendTrustAuditTestEvent;
  }

  headerRequestLink?.addEventListener("click", () => {
    trackEvent("header_request_click");
  });

  heroRequestLink?.addEventListener("click", () => {
    trackEvent("hero_request_click");
  });

  if (requestSection) {
    const trackRequestSectionView = () => {
      if (safeSessionStorage.getItem(REQUEST_SECTION_VIEW_KEY) === "true") return;

      safeSessionStorage.setItem(REQUEST_SECTION_VIEW_KEY, "true");
      trackEvent("request_section_view");
    };

    if (!("IntersectionObserver" in window)) {
      trackRequestSectionView();
    } else {
      const requestObserver = new IntersectionObserver(
        (entries, currentObserver) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            trackRequestSectionView();
            currentObserver.unobserve(entry.target);
          });
        },
        {
          threshold: 0.25
        }
      );

      requestObserver.observe(requestSection);
    }
  }

  setStep(0);
  trackEvent("page_view");

  window.addEventListener("pagehide", () => {
    trackPageExit();
    trackSessionSummary();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      trackPageExit();
      trackSessionSummary();
    }
  });
}
