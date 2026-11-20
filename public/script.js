/* ==========================================================
   Grand Palace Hotel - frontend script (vanilla JS)
   The chat still talks to POST /api/chat with fetch.
   ========================================================== */

// ---- Chat configuration ------------------------------------
// If your original script used different names, change them here.
const CHAT_ENDPOINT = "/api/chat";
const buildRequestBody = (message) => ({ message });          // request body sent to the server
const extractReply = (data) =>                                 // where the answer sits in the response
  data.reply ?? data.response ?? data.message ?? data.answer ?? data.text ?? "";
const WELCOME_TEXT =
  "Welcome to Grand Palace Hotel. I can help with rooms, food, timings and services. What would you like to know?";
// ------------------------------------------------------------

const chatBox = document.getElementById("chat-box");
const chatPanel = document.getElementById("chat-panel");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const statusText = document.getElementById("statusText");
const chips = document.querySelectorAll(".chip");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let isSending = false;

/* ---------- Chat helpers ---------- */
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildMessage(sender, extraClass = "") {
  const row = document.createElement("div");
  row.className = `msg ${sender} ${extraClass}`.trim();

  if (sender === "bot") {
    const mini = document.createElement("div");
    mini.className = "mini";
    mini.textContent = "GP";
    mini.setAttribute("aria-hidden", "true");
    row.appendChild(mini);
  }

  const stack = document.createElement("div");
  stack.className = "stack";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  stack.appendChild(bubble);
  row.appendChild(stack);
  return { row, stack, bubble };
}

function addTime(stack) {
  const t = document.createElement("div");
  t.className = "time";
  t.textContent = timeNow();
  stack.appendChild(t);
}

function addMessage(text, sender, extraClass = "") {
  const { row, stack, bubble } = buildMessage(sender, extraClass);
  bubble.textContent = text;            // textContent keeps replies safe from HTML injection
  addTime(stack);
  chatBox.appendChild(row);
  scrollToBottom();
  return row;
}

// Shows the bot reply word by word (fast), then resolves
function addBotReplyAnimated(text) {
  return new Promise((resolve) => {
    const { row, stack, bubble } = buildMessage("bot");
    chatBox.appendChild(row);

    if (reduceMotion) {
      bubble.textContent = text;
      addTime(stack);
      scrollToBottom();
      return resolve();
    }

    const parts = text.split(/(\s+)/);
    const step = Math.max(1, Math.ceil(parts.length / 70));   // caps total time for long replies
    let i = 0;
    const timer = setInterval(() => {
      i += step;
      bubble.textContent = parts.slice(0, i).join("");
      scrollToBottom();
      if (i >= parts.length) {
        clearInterval(timer);
        bubble.textContent = text;
        addTime(stack);
        scrollToBottom();
        resolve();
      }
    }, 28);
  });
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "msg bot typing";
  row.setAttribute("aria-label", "Assistant is typing");
  row.innerHTML =
    '<div class="mini" aria-hidden="true">GP</div><div class="stack"><div class="bubble"><span></span><span></span><span></span></div></div>';
  chatBox.appendChild(row);
  scrollToBottom();
  return row;
}

function setBusy(busy) {
  isSending = busy;
  sendBtn.disabled = busy;
  userInput.disabled = busy;
  clearBtn.disabled = busy;
  chips.forEach((c) => (c.disabled = busy));
  chatPanel.classList.toggle("thinking", busy);
  statusText.textContent = busy ? "Typing..." : "Online now";
  if (!busy) userInput.focus({ preventScroll: true });
}

function resetChat() {
  chatBox.innerHTML = "";
  addMessage(WELCOME_TEXT, "bot");
}

/* ---------- Send message ---------- */
async function sendMessage(text) {
  const message = (text ?? userInput.value).trim();
  if (!message || isSending) return;

  addMessage(message, "user");
  userInput.value = "";
  setBusy(true);

  sendBtn.classList.remove("fly");
  void sendBtn.offsetWidth;            // restart the animation
  sendBtn.classList.add("fly");

  const typing = showTyping();

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody(message)),
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = await res.json();
    const reply = extractReply(data);

    typing.remove();
    await addBotReplyAnimated(reply || "Sorry, I could not find an answer. Please try again.");
  } catch (err) {
    console.error("Chat error:", err);
    typing.remove();
    addMessage("The assistant is unavailable right now. Please try again in a moment.", "bot", "error");
  } finally {
    setBusy(false);
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});
chips.forEach((chip) => chip.addEventListener("click", () => sendMessage(chip.dataset.question)));
clearBtn.addEventListener("click", resetChat);
resetChat();

/* ---------- Question tabs ---------- */
const tabs = document.querySelectorAll(".tab");
const groups = document.querySelectorAll(".chip-group");
tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    groups.forEach((g) => g.classList.toggle("active", g.dataset.group === tab.dataset.tab));
  })
);

/* ---------- Hero: typing question card ---------- */
const heroQ = document.getElementById("heroQ");
const heroAsk = document.getElementById("heroAsk");
const heroQuestions = Array.from(chips).map((c) => c.dataset.question);
let hqIndex = 0;
let hqChars = 0;
let hqDeleting = false;

function heroTick() {
  const q = heroQuestions[hqIndex];
  if (!hqDeleting) {
    hqChars++;
    heroQ.textContent = q.slice(0, hqChars);
    if (hqChars >= q.length) {
      hqDeleting = true;
      return setTimeout(heroTick, 2400);
    }
    return setTimeout(heroTick, 45);
  }
  hqChars -= 2;
  if (hqChars <= 0) {
    hqChars = 0;
    hqDeleting = false;
    hqIndex = (hqIndex + 1) % heroQuestions.length;
    heroQ.textContent = "";
    return setTimeout(heroTick, 350);
  }
  heroQ.textContent = q.slice(0, hqChars);
  setTimeout(heroTick, 18);
}

if (reduceMotion) {
  heroQ.textContent = heroQuestions[0];
} else {
  setTimeout(heroTick, 1600);
}

heroAsk.addEventListener("click", () => {
  const question = heroQuestions[hqIndex];
  document.getElementById("assistant").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  setTimeout(() => sendMessage(question), reduceMotion ? 0 : 800);
});

/* ---------- Hero: mouse spotlight + card tilt ---------- */
const hero = document.getElementById("hero");
const heroCard = document.getElementById("heroCard");
if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
    hero.style.setProperty("--my", `${e.clientY - r.top}px`);

    const cr = heroCard.getBoundingClientRect();
    const dx = (e.clientX - (cr.left + cr.width / 2)) / window.innerWidth;
    const dy = (e.clientY - (cr.top + cr.height / 2)) / window.innerHeight;
    heroCard.style.transform = `rotateY(${dx * 12}deg) rotateX(${-dy * 12}deg)`;
  });
  hero.addEventListener("mouseleave", () => (heroCard.style.transform = ""));
}

/* ---------- Expanding panels ---------- */
const panels = document.querySelectorAll(".panel");
function activatePanel(panel) {
  panels.forEach((p) => p.classList.toggle("active", p === panel));
}
panels.forEach((p) => {
  p.addEventListener("mouseenter", () => {
    if (window.matchMedia("(hover: hover)").matches) activatePanel(p);
  });
  p.addEventListener("click", () => activatePanel(p));
  p.addEventListener("focus", () => activatePanel(p));
});

/* ---------- Header, progress, parallax, timeline ---------- */
const header = document.getElementById("siteHeader");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const fab = document.getElementById("fab");
const assistantSection = document.getElementById("assistant");
const progress = document.getElementById("progress");
const heroSlides = document.getElementById("heroSlides");
const timeline = document.getElementById("timeline");

let assistantVisible = false;
let ticking = false;

function update() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;

  header.classList.toggle("scrolled", y > 40);
  fab.classList.toggle("show", y > 700 && !assistantVisible);
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  if (!reduceMotion && y < window.innerHeight * 1.2) {
    heroSlides.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
  }

  const r = timeline.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (window.innerHeight * 0.65 - r.top) / r.height));
  timeline.style.setProperty("--p", p.toFixed(3));

  ticking = false;
}
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(update);
    ticking = true;
  }
}, { passive: true });
window.addEventListener("resize", update);
update();

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  })
);

/* ---------- Hide floating button while the chat is on screen ---------- */
if ("IntersectionObserver" in window) {
  new IntersectionObserver(
    ([entry]) => {
      assistantVisible = entry.isIntersecting;
      update();
    },
    { threshold: 0.25 }
  ).observe(assistantSection);
}

/* ---------- Scroll reveal ---------- */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}

/* ---------- Counting numbers ---------- */
function animateCount(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (reduceMotion) {
    el.textContent = target + suffix;
    return;
  }
  const duration = 1600;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const counters = document.querySelectorAll("[data-count]");
if ("IntersectionObserver" in window) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((c) => countObserver.observe(c));
} else {
  counters.forEach(animateCount);
}

document.getElementById("year").textContent = new Date().getFullYear();