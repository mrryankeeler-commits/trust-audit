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
      role: "Founder / Co-founder",
      role_other_detail: "",
      offer_summary:
        "We help technical teams reduce implementation risk on complex B2B projects.",
      deal_size: "£25k to £50k (~$31k to $63k)",
      commercial_focus: [
        "Build trust before sales calls",
        "Attract better-fit inbound leads",
        "Help buyers understand the value I offer faster"
      ],
      commercial_focus_other_detail: "",
      current_gaps: [
        "My proof or case studies aren’t visible enough",
        "My profile undersells me"
      ],
      current_gaps_other_detail: "",
      readiness: "Now / next 30 days",
      linkedin_current_state: "I get some conversations, but they’re not usually the right fit",
      linkedin_current_state_other_detail: "",
      specific_notes: "TEST SUBMISSION: strong fit route.",
      expected_fit_outcome: "strong_fit"
    },
    medium: {
      name: "Test Medium Fit",
      email: "mediumfit@example.com",
      linkedin_url: "mrryankeeler",
      company_name: "Medium Fit Test Co",
      role: "Consultant",
      role_other_detail: "",
      offer_summary: "I provide specialist B2B consulting to small and mid-sized firms.",
      deal_size: "£5k to £15k (~$6k to $19k)",
      commercial_focus: ["Attract better-fit inbound leads"],
      commercial_focus_other_detail: "",
      current_gaps: ["My content doesn’t position me as credible"],
      current_gaps_other_detail: "",
      readiness: "Next 30 to 90 days",
      linkedin_current_state: "I get views or engagement, but few real conversations",
      linkedin_current_state_other_detail: "",
      specific_notes: "TEST SUBMISSION: medium fit route.",
      expected_fit_outcome: "medium_fit"
    },
    poor: {
      name: "Test Poor Fit",
      email: "poorfit@example.com",
      linkedin_url: "mrryankeeler",
      company_name: "Poor Fit Test Co",
      role: "Other",
      role_other_detail: "Creator",
      offer_summary: "I want help with low-ticket general social media content.",
      deal_size: "Under £2.5k (under ~$3k)",
      commercial_focus: ["Other"],
      commercial_focus_other_detail: "Generic content ideas",
      current_gaps: ["I’m not sure"],
      current_gaps_other_detail: "",
      readiness: "Just curious for now",
      linkedin_current_state: "Nothing meaningful yet",
      linkedin_current_state_other_detail: "",
      specific_notes: "TEST SUBMISSION: poor fit route.",
      expected_fit_outcome: "poor_fit"
    }
  };

  const conditionalFields = [
    {
      name: "role",
      triggerValue: "Other",
      groupId: "role-other-group",
      fieldName: "role_other_detail"
    },
    {
      name: "commercial_focus",
      triggerValue: "Other",
      groupId: "commercial-focus-other-group",
      fieldName: "commercial_focus_other_detail"
    },
    {
      name: "current_gaps",
      triggerValue: "Other",
      groupId: "current-gaps-other-group",
      fieldName: "current_gaps_other_detail"
    },
    {
      name: "linkedin_current_state",
      triggerValue: "Other",
      groupId: "linkedin-current-state-other-group",
      fieldName: "linkedin_current_state_other_detail"
    }
  ];

  const seriousBusinessOutcomes = new Set([
    "Build trust before sales calls",
    "Make referrals land with more context",
    "Attract better-fit inbound leads",
    "Help buyers understand the value I offer faster",
    "Support investor, partner, or stakeholder confidence",
    "Shorten the trust-building stage in sales"
  ]);

  const strongFitDealSizes = new Set([
    "£15k to £25k (~$19k to $31k)",
    "£25k to £50k (~$31k to $63k)",
    "£50k to £100k (~$63k to $125k)",
    "£100k+ (~$125k+)"
  ]);

  const mediumFitDealSizes = new Set([
    "£2.5k to £5k (~$3k to $6k)",
    "£5k to £15k (~$6k to $19k)",
    "Varies / not sure"
  ]);

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

  const getSelectedValue = (name) => {
    const field = form.elements[name];

    if (field instanceof RadioNodeList) {
      return String(field.value || "").trim();
    }

    return getTrimmedValue(name);
  };

  const appendOtherDetail = (value, detail) => {
    if (value !== "Other") return value;

    const trimmedDetail = String(detail || "").trim();
    return trimmedDetail ? `Other (${trimmedDetail})` : "Other";
  };

  const buildJoinedValue = (name, otherFieldName) => {
    const detail = getTrimmedValue(otherFieldName);

    return getCheckedValues(name)
      .map((value) => appendOtherDetail(value, detail))
      .join(" | ");
  };

  const syncConditionalField = (name, triggerValue, groupId, fieldName) => {
    const values = getCheckedValues(name);
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
      clearGroupState("role");
      setError("role", "");
      if (!getSelectedValue("role")) {
        invalidateField("role", "Select the role that best describes you.");
        valid = false;
      }

      if (getSelectedValue("role") === "Other" && !getTrimmedValue("role_other_detail")) {
        invalidateField("role_other_detail", "Tell me what your role is.");
        valid = false;
      }

      clearGroupState("offer_summary");
      setError("offer_summary", "");
      if (!getTrimmedValue("offer_summary")) {
        invalidateField("offer_summary", "Tell me what you do and who it is for.");
        valid = false;
      }

      clearGroupState("deal_size");
      setError("deal_size", "");
      if (!getSelectedValue("deal_size")) {
        invalidateField("deal_size", "Choose the closest contract or deal size.");
        valid = false;
      }

      return valid;
    },
    () => {
      clearGroupState("commercial_focus");
      setError("commercial_focus", "");

      if (!getCheckedValues("commercial_focus").length) {
        const group = form.querySelector('[data-step="3"] .option-group');
        group?.classList.add("is-invalid");
        setError("commercial_focus", "Select at least one thing your LinkedIn should support.");
        return false;
      }

      const focusAreas = getCheckedValues("commercial_focus");
      if (focusAreas.includes("Other") && !getTrimmedValue("commercial_focus_other_detail")) {
        invalidateField(
          "commercial_focus_other_detail",
          "Tell me what else LinkedIn should support."
        );
        return false;
      }

      return true;
    },
    () => {
      clearGroupState("current_gaps");
      setError("current_gaps", "");

      const currentGaps = getCheckedValues("current_gaps");
      if (!currentGaps.length) {
        const group = form.querySelector('[data-step="4"] .option-group');
        group?.classList.add("is-invalid");
        setError("current_gaps", "Select at least one current gap.");
        return false;
      }

      if (currentGaps.includes("Other") && !getTrimmedValue("current_gaps_other_detail")) {
        invalidateField("current_gaps_other_detail", "Tell me what else feels weak.");
        return false;
      }

      return true;
    },
    () => {
      clearGroupState("readiness");
      setError("readiness", "");

      if (!getSelectedValue("readiness")) {
        invalidateField("readiness", "Tell me roughly how soon you are looking to improve this.");
        return false;
      }

      clearGroupState("linkedin_current_state");
      setError("linkedin_current_state", "");

      if (!getSelectedValue("linkedin_current_state")) {
        invalidateField(
          "linkedin_current_state",
          "Tell me how LinkedIn is currently working for you."
        );
        return false;
      }

      if (
        getSelectedValue("linkedin_current_state") === "Other" &&
        !getTrimmedValue("linkedin_current_state_other_detail")
      ) {
        invalidateField(
          "linkedin_current_state_other_detail",
          "Tell me how LinkedIn is currently working for you."
        );
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
    const selectedRole = getSelectedValue("role");

    const payload = {
      timestamp: new Date().toISOString(),
      name: getTrimmedValue("name"),
      email: getTrimmedValue("email"),
      linkedin_url: normalizeLinkedInValue(getTrimmedValue("linkedin_url")),
      company_name: getTrimmedValue("company_name"),
      role: appendOtherDetail(selectedRole, getTrimmedValue("role_other_detail")),
      offer_summary: getTrimmedValue("offer_summary"),
      deal_size: getSelectedValue("deal_size"),
      commercial_focus: buildJoinedValue("commercial_focus", "commercial_focus_other_detail"),
      current_gaps: buildJoinedValue("current_gaps", "current_gaps_other_detail"),
      readiness: getSelectedValue("readiness"),
      linkedin_current_state: appendOtherDetail(
        getSelectedValue("linkedin_current_state"),
        getTrimmedValue("linkedin_current_state_other_detail")
      ),
      specific_notes: getTrimmedValue("specific_notes"),
      fit_outcome: "medium_fit",
      source: "trust-audit-page"
    };

    return payload;
  };

  const calculateFitOutcome = (payload) => {
    const commercialFocus = payload.commercial_focus
      ? payload.commercial_focus.split(" | ").filter(Boolean)
      : [];
    const role = payload.role.toLowerCase();
    const readiness = payload.readiness;
    const offerLength = payload.offer_summary.trim().length;
    const offerWordCount = payload.offer_summary.trim().split(/\s+/).filter(Boolean).length;
    const offerIsShort = offerLength < 30 || offerWordCount < 6;
    const offerIsVague =
      /help people|various|many things|bit of everything|general help|not sure/i.test(
        payload.offer_summary
      ) ||
      (!/b2b|buyer|firm|team|technical|consult|advis|implementation|sales|stakeholder|project|founder|partner|operator|company/i.test(
        payload.offer_summary
      ) &&
        offerLength < 55);
    const genericLowTicketSignal =
      /low-ticket|generic|social media|posting|creator|content ideas|general content/i.test(
        `${payload.offer_summary} ${payload.specific_notes} ${payload.role}`
      );
    const roleIsRelevant =
      !/creator|influencer|social media/i.test(role) &&
      Boolean(payload.role) &&
      !/^other\s*\(\s*\)$/.test(payload.role);
    const hasSeriousBusinessOutcome = commercialFocus.some((item) => {
      const normalizedItem = item.startsWith("Other (") ? "Other" : item;
      return seriousBusinessOutcomes.has(normalizedItem);
    });

    logTest("[test-mode] Selected deal size", payload.deal_size);
    logTest("[test-mode] Selected readiness", readiness);

    if (
      payload.deal_size === "Under £2.5k (under ~$3k)" ||
      offerIsShort ||
      offerIsVague ||
      genericLowTicketSignal
    ) {
      logTest("[test-mode] Calculated fit outcome", "poor_fit");
      return "poor_fit";
    }

    if (
      strongFitDealSizes.has(payload.deal_size) &&
      (readiness === "Now / next 30 days" || readiness === "Next 30 to 90 days") &&
      roleIsRelevant &&
      offerLength >= 45 &&
      hasSeriousBusinessOutcome
    ) {
      logTest("[test-mode] Calculated fit outcome", "strong_fit");
      return "strong_fit";
    }

    if (
      mediumFitDealSizes.has(payload.deal_size) ||
      readiness === "Later / not sure yet" ||
      (readiness === "Just curious for now" && roleIsRelevant && offerLength >= 45)
    ) {
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
        cta_intro:
          "If you already know this is something you want help with, you can book a short 30-minute call below.",
        action_label: "Book a 30-minute call",
        action_url: "https://calendly.com/mrryankeeler/clarity-call"
      },
      medium_fit: {
        title: "Thanks. I’ve got your request.",
        body: "I’ll review your profile and last 3 posts and, if there’s a clear angle where I can give useful feedback, I’ll send over a short private audit within 2 working days.",
        extra: "",
        cta_intro:
          "If you already know this is something you want help with, you can book a short 30-minute call below.",
        action_label: "Book a 30-minute call",
        action_url: "https://calendly.com/mrryankeeler/clarity-call"
      },
      poor_fit: {
        title: "Thanks for submitting.",
        body: "This audit is mainly designed for founders and B2B experts with real expertise, proof, and a high-trust sales process.",
        extra: "Based on your answers, it may not be the most useful next step right now.",
        cta_intro:
          "If your situation is more nuanced than the form allows, send me a message on LinkedIn with a bit of context and I’ll take a look.",
        action_label: "Send me context on LinkedIn",
        action_url: "https://www.linkedin.com/in/mrryankeeler/"
      }
    };

    const state = states[fitOutcome] || states.medium_fit;
    successPanel.innerHTML = `
      <h3>${state.title}</h3>
      <p>${state.body}</p>
      ${state.extra ? `<p>${state.extra}</p>` : ""}
      <div class="form-success-action">
        ${state.cta_intro ? `<p class="form-success-subtitle">${state.cta_intro}</p>` : ""}
        ${
          state.action_url
            ? `<a class="form-success-button" href="${state.action_url}" target="_blank" rel="noopener noreferrer">${state.action_label}</a>`
            : ""
        }
      </div>
      <div class="form-success-reset">
        <p class="form-success-subtitle">Made a mistake?</p>
        <button type="button" class="form-success-reset-button" id="form-reset-success">Start again</button>
      </div>
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
    conditionalFields.forEach(({ name, triggerValue, groupId, fieldName }) => {
      syncConditionalField(name, triggerValue, groupId, fieldName);
    });
    updateTestStatus("");
    setStep(0);
  };

  const loadTestProfile = (profileName) => {
    const profile = testProfiles[profileName];
    if (!profile) return;

    resetFormState();

    Object.entries(profile).forEach(([key, value]) => {
      if (key === "commercial_focus") {
        setCheckboxValues("commercial_focus", value);
        return;
      }

      if (key === "current_gaps") {
        setCheckboxValues("current_gaps", value);
        return;
      }

      if (key === "role" || key === "deal_size" || key === "readiness" || key === "linkedin_current_state") {
        setRadioValue(key, value);
        return;
      }

      if (key === "expected_fit_outcome") return;

      const field = form.elements[key];
      if (field) field.value = value;
    });

    const normalized = normalizeLinkedInValue(getTrimmedValue("linkedin_url"));
    if (normalized) form.elements.linkedin_url.value = normalized;
    conditionalFields.forEach(({ name, triggerValue, groupId, fieldName }) => {
      syncConditionalField(name, triggerValue, groupId, fieldName);
    });

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
      "[test-mode] Expected fit outcome",
      profile.expected_fit_outcome,
      "Match:",
      previewFit === profile.expected_fit_outcome
    );
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

    conditionalFields
      .filter((field) => field.name === name)
      .forEach(({ name: fieldName, triggerValue, groupId, fieldName: detailFieldName }) => {
        syncConditionalField(fieldName, triggerValue, groupId, detailFieldName);
      });
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

      await submitPayload(payload);
      renderSuccessState(fitOutcome);
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

  successPanel?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest("#form-reset-success")) {
      resetFormState();
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

  conditionalFields.forEach(({ name, triggerValue, groupId, fieldName }) => {
    syncConditionalField(name, triggerValue, groupId, fieldName);
  });
  setStep(0);
}
