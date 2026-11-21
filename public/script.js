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

/* ---------- "Ask the Assistant" buttons: back to the chat and focus the input ---------- */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

function closeMenu() {
  navLinks.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}

document.querySelectorAll("[data-open-chat]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    setTimeout(() => userInput.focus({ preventScroll: true }), reduceMotion ? 0 : 650);
  })
);

/* ---------- Hero: floating gold particles ---------- */
const particleBox = document.getElementById("particles");
if (!reduceMotion) {
  for (let i = 0; i < 22; i++) {
    const s = document.createElement("span");
    const size = 2 + Math.random() * 3.5;
    s.style.width = s.style.height = `${size}px`;
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDuration = `${12 + Math.random() * 14}s`;
    s.style.animationDelay = `${-Math.random() * 20}s`;
    particleBox.appendChild(s);
  }
}

/* ---------- Hero: mouse spotlight ---------- */
const hero = document.getElementById("hero");
if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
    hero.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
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

/* ---------- Header, progress bar, floating button ---------- */
const header = document.getElementById("siteHeader");
const progress = document.getElementById("progress");
const fab = document.getElementById("fab");
let chatInView = true;
let ticking = false;

function update() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  header.classList.toggle("scrolled", y > 40);
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  fab.classList.toggle("show", !chatInView && y > 300);
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

if ("IntersectionObserver" in window) {
  new IntersectionObserver(
    ([entry]) => {
      chatInView = entry.isIntersecting;
      update();
    },
    { threshold: 0.15 }
  ).observe(chatPanel);
}

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

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