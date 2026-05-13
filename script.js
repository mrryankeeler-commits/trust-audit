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

function isTestMode() {
  const params = new URLSearchParams(window.location.search);
  return window.location.hostname === "localhost" || params.get("test") === "1";
}

if (form) {
  const steps = Array.from(form.querySelectorAll(".form-step"));
  const TOTAL_STEPS = 5;
  const stepText = document.querySelector("#form-step-text");
  const progressBar = document.querySelector("#form-progress-bar");
  const backButton = document.querySelector("#form-back");
  const nextButton = document.querySelector("#form-next");
  const submitButton = document.querySelector("#form-submit");
  const successPanel = document.querySelector("#form-success");
  const submitError = document.querySelector("#form-submit-error");
  const fitOutcomeField = document.querySelector("#fit_outcome");
  const testPanel = document.querySelector("#form-test-panel");
  const testStatus = document.querySelector("#form-test-status");
  const testMode = isTestMode();
  const hasRealEndpoint =
    GOOGLE_SCRIPT_ENDPOINT &&
    GOOGLE_SCRIPT_ENDPOINT !== "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

  const testProfiles = {
    strong: {
      name: "Test Strong Fit",
      email: "strongfit@example.com",
      linkedin_url: "mrryankeeler",
      company_name: "Strong Fit Test Co",
      what_they_sell: "High-value B2B implementation and advisory services for technical teams.",
      who_they_sell_to: "Technical founders, operators, and senior B2B decision-makers.",
      deal_size: "£15k to £50k",
      linkedin_goals: [
        "Trust before sales calls",
        "Stronger referrals",
        "Better-fit inbound conversations"
      ],
      linkedin_goals_other: "",
      weakest_area: [
        "My proof or case studies aren’t visible enough",
        "My profile undersells me"
      ],
      weakest_area_other: "",
      readiness: "Now / next 30 days",
      specific_notes: "TEST SUBMISSION: strong fit route."
    },
    medium: {
      name: "Test Medium Fit",
      email: "mediumfit@example.com",
      linkedin_url: "mrryankeeler",
      company_name: "Medium Fit Test Co",
      what_they_sell: "B2B consulting services.",
      who_they_sell_to: "Small business owners and operators.",
      deal_size: "£5k to £15k",
      linkedin_goals: ["Better-fit inbound conversations"],
      linkedin_goals_other: "",
      weakest_area: [
        "My profile undersells me",
        "My content doesn’t position me as credible"
      ],
      weakest_area_other: "",
      readiness: "Next 30 to 90 days",
      specific_notes: "TEST SUBMISSION: medium fit route."
    },
    poor: {
      name: "Test Poor Fit",
      email: "poorfit@example.com",
      linkedin_url: "mrryankeeler",
      company_name: "Poor Fit Test Co",
      what_they_sell: "Low-ticket content help and general social media posting.",
      who_they_sell_to: "Early-stage creators.",
      deal_size: "Under £5k",
      linkedin_goals: ["Other"],
      linkedin_goals_other: "Generic content ideas",
      weakest_area: ["I’m not sure"],
      weakest_area_other: "",
      readiness: "Just curious for now",
      specific_notes: "TEST SUBMISSION: poor fit route."
    }
  };

  let currentStep = 0;
  let isSubmitting = false;

  const logTest = (...args) => {
    if (!testMode) return;
    console.log(...args);
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

    if (stepText) stepText.textContent = `Step ${stepNumber} of ${TOTAL_STEPS}`;
    if (progressBar) progressBar.style.width = `${percent}%`;

    if (backButton) backButton.disabled = currentStep === 0;
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
  };

  const setError = (name, message = "") => {
    const errorNode = form.querySelector(`[data-error-for="${name}"]`);
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.toggle("is-visible", Boolean(message));
    }
  };

  const clearGroupState = (name) => {
    const field = form.elements[name];

    if (!field) return;

    if (field instanceof RadioNodeList) {
      const items = Array.from(field);
      const group = items[0]?.closest(".option-group");
      group?.classList.remove("is-invalid");
      return;
    }

    field.classList.remove("is-invalid");
  };

  const invalidateField = (name, message) => {
    setError(name, message);
    const field = form.elements[name];

    if (field instanceof RadioNodeList) {
      const items = Array.from(field);
      const group = items[0]?.closest(".option-group");
      group?.classList.add("is-invalid");
      return;
    }

    if (field) field.classList.add("is-invalid");
  };

  const getCheckedValues = (name) =>
    Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);

  const getTrimmedValue = (name) => String(form.elements[name]?.value || "").trim();

  const syncConditionalField = (checkboxName, triggerValue, groupId, fieldName) => {
    const values = getCheckedValues(checkboxName);
    const group = document.querySelector(`#${groupId}`);
    const field = form.elements[fieldName];
    const shouldShow = values.includes(triggerValue);

    if (group) group.hidden = !shouldShow;
    if (!field || shouldShow) return;

    field.value = "";
    field.classList.remove("is-invalid");
    setError(fieldName, "");
  };

  const normalizeLinkedInValue = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";

    let candidate = trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/^linkedin\.com\/in\//i, "")
      .replace(/^linkedin\.com\//i, "")
      .replace(/^in\//i, "")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\?.*$/, "")
      .replace(/#.*$/, "");

    if (!candidate) return "";

    if (candidate.includes("/")) {
      const segments = candidate.split("/").filter(Boolean);
      const inIndex = segments.findIndex((segment) => segment.toLowerCase() === "in");
      if (inIndex >= 0 && segments[inIndex + 1]) {
        candidate = segments[inIndex + 1];
      } else {
        candidate = segments[segments.length - 1];
      }
    }

    candidate = candidate.replace(/^@/, "").trim();
    return candidate ? `https://www.linkedin.com/in/${candidate}/` : "";
  };

  const validators = [
    () => {
      const required = [
        ["name", "Please add your name."],
        ["email", "Please add your email address."],
        ["linkedin_url", "Add your LinkedIn profile URL or handle."]
      ];

      let valid = true;

      required.forEach(([name, message]) => {
        clearGroupState(name);
        setError(name, "");
        const value = getTrimmedValue(name);

        if (!value) {
          invalidateField(name, message);
          valid = false;
        }
      });

      const email = getTrimmedValue("email");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        invalidateField("email", "Please enter a valid email address.");
        valid = false;
      }

      const linkedin = getTrimmedValue("linkedin_url");
      const normalizedLinkedIn = normalizeLinkedInValue(linkedin);
      if (linkedin && !normalizedLinkedIn) {
        invalidateField("linkedin_url", "Add your LinkedIn profile URL or handle.");
        valid = false;
      }
      if (normalizedLinkedIn) {
        form.elements.linkedin_url.value = normalizedLinkedIn;
      }

      return valid;
    },
    () => {
      let valid = true;
      const textFields = [
        ["what_they_sell", "Please describe what you sell."],
        ["who_they_sell_to", "Please describe who you sell to."]
      ];

      textFields.forEach(([name, message]) => {
        clearGroupState(name);
        setError(name, "");
        if (!getTrimmedValue(name)) {
          invalidateField(name, message);
          valid = false;
        }
      });

      clearGroupState("deal_size");
      setError("deal_size", "");
      if (!getTrimmedValue("deal_size")) {
        invalidateField("deal_size", "Please choose a typical client value / deal size.");
        valid = false;
      }

      return valid;
    },
    () => {
      clearGroupState("linkedin_goals");
      setError("linkedin_goals", "");

      if (!getCheckedValues("linkedin_goals").length) {
        const group = form.querySelector('[data-step="3"] .option-group');
        group?.classList.add("is-invalid");
        setError("linkedin_goals", "Select at least one thing your LinkedIn should support.");
        return false;
      }

      const goals = getCheckedValues("linkedin_goals");
      if (goals.includes("Other") && !getTrimmedValue("linkedin_goals_other")) {
        invalidateField("linkedin_goals_other", "Tell me what else LinkedIn should support.");
        return false;
      }

      return true;
    },
    () => {
      clearGroupState("weakest_area");
      setError("weakest_area", "");

      const weakestAreas = getCheckedValues("weakest_area");
      if (!weakestAreas.length) {
        const group = form.querySelector('[data-step="4"] .option-group');
        group?.classList.add("is-invalid");
        setError("weakest_area", "Select at least one current gap.");
        return false;
      }

      if (weakestAreas.includes("Other") && !getTrimmedValue("weakest_area_other")) {
        invalidateField("weakest_area_other", "Tell me what else feels weak.");
        return false;
      }

      return true;
    },
    () => {
      clearGroupState("readiness");
      setError("readiness", "");

      if (!getTrimmedValue("readiness")) {
        invalidateField("readiness", "Tell me roughly how soon you are looking to improve this.");
        return false;
      }

      return true;
    }
  ];

  const validateStep = (index) => validators[index]?.() ?? true;

  const clearValidationState = () => {
    submitError.textContent = "";
    submitError.classList.remove("is-visible");
    form.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
      node.classList.remove("is-visible");
    });
    form.querySelectorAll(".is-invalid").forEach((node) => node.classList.remove("is-invalid"));
  };

  const buildPayload = () => {
    const linkedinGoals = getCheckedValues("linkedin_goals");

    const payload = {
      timestamp: new Date().toISOString(),
      name: getTrimmedValue("name"),
      email: getTrimmedValue("email"),
      linkedin_url: normalizeLinkedInValue(getTrimmedValue("linkedin_url")),
      company_name: getTrimmedValue("company_name"),
      what_they_sell: getTrimmedValue("what_they_sell"),
      who_they_sell_to: getTrimmedValue("who_they_sell_to"),
      deal_size: getTrimmedValue("deal_size"),
      linkedin_goals: linkedinGoals.join(" | "),
      linkedin_goals_other: getTrimmedValue("linkedin_goals_other"),
      weakest_area: getCheckedValues("weakest_area").join(" | "),
      weakest_area_other: getTrimmedValue("weakest_area_other"),
      readiness: getTrimmedValue("readiness"),
      timing: getTrimmedValue("readiness"),
      specific_notes: getTrimmedValue("specific_notes"),
      fit_outcome: "medium_fit",
      source: "trust-audit-page"
    };

    return payload;
  };

  const calculateFitOutcome = (payload) => {
    const goals = payload.linkedin_goals ? payload.linkedin_goals.split(" | ").filter(Boolean) : [];
    const readiness = payload.readiness;
    const businessStrength =
      payload.what_they_sell.length >= 12 && payload.who_they_sell_to.length >= 12;
    const genericTipsSignal =
      /viral|content tips|profile polish|generic|social media/i.test(payload.specific_notes) ||
      /viral|generic|social media|content help/i.test(payload.what_they_sell);
    const commerciallyRelevantGoal = goals.some((goal) =>
      [
        "Trust before sales calls",
        "Stronger referrals",
        "Better-fit inbound conversations",
        "Investor / partner confidence",
        "Stakeholder credibility"
      ].includes(goal)
    );

    logTest("[test-mode] Selected deal size", payload.deal_size);
    logTest("[test-mode] Selected readiness", readiness);

    if (
      payload.deal_size === "Under £5k" ||
      readiness === "Just curious for now" ||
      !businessStrength ||
      genericTipsSignal
    ) {
      logTest("[test-mode] Calculated fit outcome", "poor_fit");
      return "poor_fit";
    }

    if (
      (payload.deal_size === "£15k to £50k" || payload.deal_size === "£50k+") &&
      (readiness === "Now / next 30 days" || readiness === "Next 30 to 90 days") &&
      businessStrength &&
      commerciallyRelevantGoal
    ) {
      logTest("[test-mode] Calculated fit outcome", "strong_fit");
      return "strong_fit";
    }

    if (
      (payload.deal_size === "£5k to £15k" || payload.deal_size === "Varies / not sure") &&
      businessStrength
    ) {
      logTest("[test-mode] Calculated fit outcome", "medium_fit");
      return "medium_fit";
    }

    if (readiness === "Later / not sure yet") {
      logTest("[test-mode] Calculated fit outcome", "medium_fit");
      return "medium_fit";
    }

    logTest("[test-mode] Calculated fit outcome", "medium_fit");
    return "medium_fit";
  };

  const renderSuccessState = (fitOutcome) => {
    if (!successPanel) return;

    const states = {
      strong_fit: {
        title: "Thanks. From what you’ve shared, there’s likely a clear trust gap I can help you tighten.",
        body: "I’ll review your profile and last 3 posts and send your short private priority audit within 2 working days.",
        extra:
          "If there’s a clear trust gap I can help you spot, I’ll show what I’d tighten first to help serious buyers understand and trust you earlier.",
        secondary_heading:
          "If you already know this is something you want help with, you can book a short 30-minute call below.",
        action:
          '<a class="form-success-button" href="https://calendly.com/mrryankeeler/clarity-call" target="_blank" rel="noopener noreferrer">Book a 30-minute call</a>'
      },
      medium_fit: {
        title: "Thanks. I’ve got your request.",
        body: "I’ll review your profile and last 3 posts and, if there’s a clear angle where I can give useful feedback, I’ll send over a short private audit within 2 working days.",
        extra: "",
        secondary_heading:
          "If you already know this is something you want help with, you can book a short 30-minute call below.",
        action:
          '<a class="form-success-button" href="https://calendly.com/mrryankeeler/clarity-call" target="_blank" rel="noopener noreferrer">Book a 30-minute call</a>'
      },
      poor_fit: {
        title: "Thanks for submitting.",
        body: "This audit is mainly designed for founders and B2B experts with real expertise, proof, and a high-trust sales process.",
        extra: "Based on your answers, it may not be the most useful next step right now.",
        secondary_heading: "",
        action: ""
      }
    };

    const state = states[fitOutcome] || states.medium_fit;
    successPanel.innerHTML = `
      <h3>${state.title}</h3>
      <p>${state.body}</p>
      ${state.extra ? `<p>${state.extra}</p>` : ""}
      ${
        state.action
          ? `<div class="form-success-action">
              ${
                state.secondary_heading
                  ? `<p class="form-success-subtitle">${state.secondary_heading}</p>`
                  : ""
              }
              ${state.action}
            </div>`
          : ""
      }
    `;
    successPanel.hidden = false;
    form.hidden = true;
  };

  const submitPayload = async (payload) => {
    if (!hasRealEndpoint) {
      console.log("Trust Audit payload", payload);
      return;
    }

    await fetch(GOOGLE_SCRIPT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(payload)
    });
  };

  const setRadioValue = (name, value) => {
    form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = input.value === value;
    });
  };

  const setCheckboxValues = (name, values) => {
    const selectedValues = new Set(values);
    form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = selectedValues.has(input.value);
    });
  };

  const resetFormState = () => {
    isSubmitting = false;
    form.reset();
    form.hidden = false;
    if (successPanel) {
      successPanel.hidden = true;
      successPanel.innerHTML = "";
    }
    if (fitOutcomeField) fitOutcomeField.value = "";
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = `
        <span>Submit request</span>
        <span class="material-symbols-rounded button-icon" aria-hidden="true">send</span>
      `;
    }
    if (nextButton) nextButton.disabled = false;
    if (backButton) backButton.disabled = true;
    clearValidationState();
    updateTestStatus("");
    setStep(0);
  };

  const loadTestProfile = (profileName) => {
    const profile = testProfiles[profileName];
    if (!profile) return;

    resetFormState();

    Object.entries(profile).forEach(([key, value]) => {
      if (key === "linkedin_goals") {
        setCheckboxValues("linkedin_goals", value);
        return;
      }

      if (key === "weakest_area") {
        setCheckboxValues("weakest_area", value);
        return;
      }

      if (key === "deal_size" || key === "readiness") {
        setRadioValue(key, value);
        return;
      }

      const field = form.elements[key];
      if (field) field.value = value;
    });

    const normalized = normalizeLinkedInValue(getTrimmedValue("linkedin_url"));
    if (normalized) form.elements.linkedin_url.value = normalized;
    syncConditionalField("linkedin_goals", "Other", "linkedin-goals-other-group", "linkedin_goals_other");
    syncConditionalField("weakest_area", "Other", "weakest-area-other-group", "weakest_area_other");

    const previewPayload = buildPayload();
    const previewFit = calculateFitOutcome(previewPayload);
    if (fitOutcomeField) fitOutcomeField.value = previewFit;

    const statusMap = {
      strong: "Strong-fit test data loaded. Continue through the form and submit to test the route.",
      medium: "Medium-fit test data loaded. Continue through the form and submit to test the route.",
      poor: "Poor-fit test data loaded. Continue through the form and submit to test the route."
    };

    updateTestStatus(statusMap[profileName] || "Test data loaded.");
    logTest(`[test-mode] Loaded ${profileName} profile`, previewPayload);
    logTest("[test-mode] Calculated fit outcome", previewFit);
    logTest(
      `[test-mode] Submission endpoint ${hasRealEndpoint ? "will be used" : "will be skipped"}`
    );
  };

  backButton?.addEventListener("click", () => {
    if (currentStep === 0) return;
    submitError.textContent = "";
    setStep(Math.max(currentStep - 1, 0));
  });

  nextButton?.addEventListener("click", () => {
    submitError.textContent = "";
    if (currentStep >= TOTAL_STEPS - 1) return;
    if (!validateStep(currentStep)) return;
    setStep(Math.min(currentStep + 1, TOTAL_STEPS - 1));
  });

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const name = target.getAttribute("name");
    if (!name) return;
    setError(name, "");
    clearGroupState(name);

    if (name === "linkedin_goals") {
      syncConditionalField("linkedin_goals", "Other", "linkedin-goals-other-group", "linkedin_goals_other");
    }

    if (name === "weakest_area") {
      syncConditionalField("weakest_area", "Other", "weakest-area-other-group", "weakest_area_other");
    }
  });

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const name = target.getAttribute("name");
    if (!name) return;
    setError(name, "");
    clearGroupState(name);
  });

  form.elements.linkedin_url?.addEventListener("blur", () => {
    const normalized = normalizeLinkedInValue(getTrimmedValue("linkedin_url"));
    if (normalized) {
      form.elements.linkedin_url.value = normalized;
      setError("linkedin_url", "");
      clearGroupState("linkedin_url");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    submitError.textContent = "";
    submitError.classList.remove("is-visible");

    if (currentStep !== TOTAL_STEPS - 1) {
      return;
    }

    if (!validateStep(currentStep)) {
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
      submitError.textContent = "Please complete the required fields before submitting.";
      submitError.classList.add("is-visible");
      return;
    }

    isSubmitting = true;
    const honeypot = getTrimmedValue("contact_time");
    const payload = buildPayload();
    const fitOutcome = honeypot ? "poor_fit" : calculateFitOutcome(payload);
    payload.fit_outcome = fitOutcome;
    if (fitOutcomeField) fitOutcomeField.value = fitOutcome;
    logTest("[test-mode] Payload before submission", payload);
    logTest("[test-mode] Calculated fit outcome", fitOutcome);
    logTest(
      `[test-mode] Submission endpoint ${hasRealEndpoint ? "being used" : "being skipped"}`
    );

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = "<span>Sending...</span>";
    }
    if (nextButton) nextButton.disabled = true;
    if (backButton) backButton.disabled = true;

    try {
      if (!hasRealEndpoint || honeypot) {
        console.log("Trust Audit payload", payload);
        renderSuccessState(fitOutcome);
        return;
      }

      const submitPromise = submitPayload(payload);

      window.setTimeout(() => {
        renderSuccessState(fitOutcome);
      }, 400);

      submitPromise.catch((error) => {
        console.error("Trust Audit submission failed:", error);
      });
    } catch (error) {
      console.error("Trust Audit submission error:", error);
      submitError.textContent =
        "There was a problem sending your request. Please try again in a moment.";
      submitError.classList.add("is-visible");
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = `
          <span>Submit request</span>
          <span class="material-symbols-rounded button-icon" aria-hidden="true">send</span>
        `;
      }
      if (backButton) backButton.disabled = false;
      setStep(currentStep);
    }
  });

  if (testMode && testPanel) {
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
  }

  syncConditionalField("linkedin_goals", "Other", "linkedin-goals-other-group", "linkedin_goals_other");
  syncConditionalField("weakest_area", "Other", "weakest-area-other-group", "weakest_area_other");
  setStep(0);
}
