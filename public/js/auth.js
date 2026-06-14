function showFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = "message " + type;
  el.style.display = "block";
}

function populateNav() {
  const nav = document.getElementById("navLinks");
  if (!nav) return;
  nav.innerHTML = `
    <li><a href="index.html">Home</a></li>
    <li><a href="books.html">Books</a></li>
    <li><a href="admin-books.html">Admin</a></li>
  `;
}

function setupHamburger() {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateNav();
  setupHamburger();
});