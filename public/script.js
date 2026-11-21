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
const canHover = window.matchMedia("(hover: hover)").matches;
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

/* ---------- Buttons that jump back to the chat ---------- */
const navWrap = document.getElementById("navWrap");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

function closeMenu() {
  navLinks.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}

function goToChat(then) {
  closeMenu();
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  setTimeout(then, reduceMotion ? 0 : 700);
}

// Just open the chat and focus the input
document.querySelectorAll("[data-open-chat]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    goToChat(() => userInput.focus({ preventScroll: true }));
  })
);

// Open the chat and ask a ready-made question (room cards)
document.querySelectorAll("[data-ask]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    goToChat(() => sendMessage(el.dataset.ask));
  })
);

/* ---------- Floating pill nav: hide on scroll down, show on scroll up ---------- */
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

/* ---------- Scroll effects: nav, parallax, floating button ---------- */
const heroMedia = document.getElementById("heroMedia");
const fab = document.getElementById("fab");
let lastY = window.scrollY;
let chatInView = true;
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const menuOpen = navLinks.classList.contains("open");

  if (!menuOpen) {
    if (y > lastY + 6 && y > 220) navWrap.classList.add("hide");
    else if (y < lastY - 6 || y < 120) navWrap.classList.remove("hide");
  }
  lastY = y;

  if (!reduceMotion && y < window.innerHeight * 1.2) {
    heroMedia.style.transform = `translate3d(0, ${y * 0.14}px, 0)`;
  }
  fab.classList.toggle("show", !chatInView && y > 300);
  ticking = false;
}
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(onScroll);
    ticking = true;
  }
}, { passive: true });
onScroll();

if ("IntersectionObserver" in window) {
  new IntersectionObserver(
    ([entry]) => {
      chatInView = entry.isIntersecting;
      onScroll();
    },
    { threshold: 0.15 }
  ).observe(chatPanel);
}

/* ---------- Magnetic buttons ---------- */
if (!reduceMotion && canHover) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
    });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  });
}

/* ---------- Rooms: arrows + drag to scroll ---------- */
const roomTrack = document.getElementById("roomTrack");
function scrollRooms(dir) {
  const card = roomTrack.querySelector(".room");
  const step = card ? card.offsetWidth + 22 : 400;
  roomTrack.scrollBy({ left: dir * step, behavior: reduceMotion ? "auto" : "smooth" });
}
document.getElementById("roomPrev").addEventListener("click", () => scrollRooms(-1));
document.getElementById("roomNext").addEventListener("click", () => scrollRooms(1));

let dragStartX = 0;
let dragStartScroll = 0;
let dragging = false;
let moved = false;
roomTrack.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.target.closest("button")) return;
  dragging = true;
  moved = false;
  dragStartX = e.clientX;
  dragStartScroll = roomTrack.scrollLeft;
});
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragStartX;
  if (Math.abs(dx) > 4) {
    moved = true;
    roomTrack.classList.add("dragging");
  }
  roomTrack.scrollLeft = dragStartScroll - dx;
});
window.addEventListener("pointerup", () => {
  if (!dragging) return;
  dragging = false;
  roomTrack.classList.remove("dragging");
});

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
  const duration = 1800;
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