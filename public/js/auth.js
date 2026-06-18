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

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");

  let html = `
    <li><a href="index.html">Home</a></li>
    <li><a href="books.html">Books</a></li>
  `;

  if (token) {
    if (role === "admin") {
      html += `<li><a href="admin-books.html">Admin</a></li>`
      html += `<li><a href="borrow-records.html">Borrow Records</a></li>`
      html += `<li><a href="manage-users.html">Users</a></li>`
    } else {
      html += `<li><a href="my-books.html">My Books</a></li>`
    }
    html += `
      <li class="user-info" style="color: var(--gold); font-size: 0.95rem; display: flex; align-items: center;">
        Welcome, ${name || "User"}
      </li>
      <li><a href="#" class="btn-nav" id="logoutBtn">Logout</a></li>
    `;
  } else {
    html += `
      <li><a href="login.html">Login</a></li>
      <li><a href="register.html" class="btn-nav">Register</a></li>
    `;
  }

  nav.innerHTML = html;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("name");
  localStorage.removeItem("role");
  window.location.href = "index.html";
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