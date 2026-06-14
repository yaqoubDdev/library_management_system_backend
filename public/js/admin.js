(function () {
  const adminBody = document.getElementById("adminBooksBody");
  const addForm = document.getElementById("addBookForm");
  const editForm = document.getElementById("editBookForm");

  async function loadAdminBooks() {
    if (!adminBody) return;
    try {
      const books = await apiFetch("/books");
      if (books.length === 0) {
        adminBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No books found.</td></tr>';
        return;
      }
      adminBody.innerHTML = books
        .map(
          (book) => `
        <tr>
          <td>${book.title}</td>
          <td>${book.author || ""}</td>
          <td>${book.category || "N/A"}</td>
          <td>${book.copies || 0}</td>
          <td>
            <div class="actions">
              <a href="edit-book.html?id=${book.id || book._id}" class="btn btn-secondary">Edit</a>
              <button class="btn btn-danger" onclick="deleteBook('${book.id || book._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");
    } catch (err) {
      adminBody.innerHTML =
        `<tr><td colspan="5" style="text-align:center;color:var(--danger);">Failed to load books: ${err.message}</td></tr>`;
    }
  }

  window.deleteBook = async function (id) {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      await apiFetch(`/books/${id}`, { method: "DELETE" });
      const msg = document.getElementById("adminMessage");
      if (msg) {
        msg.textContent = "Book deleted successfully!";
        msg.className = "message success";
        msg.style.display = "block";
      }
      loadAdminBooks();
    } catch (err) {
      const msg = document.getElementById("adminMessage");
      if (msg) {
        msg.textContent = err.message;
        msg.className = "message error";
        msg.style.display = "block";
      }
    }
  };

  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const messageEl = document.getElementById("addBookMessage");
      messageEl.style.display = "none";

      const title = document.getElementById("title").value.trim();
      const author = document.getElementById("author").value.trim();

      let valid = true;
      document.querySelectorAll(".field-error").forEach((el) => (el.style.display = "none"));
      if (!title) {
        document.getElementById("titleError").style.display = "block";
        valid = false;
      }
      if (!author) {
        document.getElementById("authorError").style.display = "block";
        valid = false;
      }
      if (!valid) return;

      const btn = document.getElementById("addBookBtn");
      btn.disabled = true;
      btn.textContent = "Adding...";

      try {
        await apiFetch("/books", {
          method: "POST",
          body: JSON.stringify({
            title,
            author,
            category: document.getElementById("category").value.trim(),
            isbn: document.getElementById("isbn").value.trim(),
            copies: parseInt(document.getElementById("copies").value) || 1,
            description: document.getElementById("description").value.trim(),
          }),
        });
        messageEl.textContent = "Book added successfully!";
        messageEl.className = "message success";
        messageEl.style.display = "block";
        addForm.reset();
      } catch (err) {
        messageEl.textContent = err.message;
        messageEl.className = "message error";
        messageEl.style.display = "block";
      } finally {
        btn.disabled = false;
        btn.textContent = "Add Book";
      }
    });
  }

  if (editForm) {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");

    if (!bookId) {
      document.getElementById("editBookMessage").textContent = "No book ID provided.";
      document.getElementById("editBookMessage").className = "message error";
      document.getElementById("editBookMessage").style.display = "block";
    } else {
      (async () => {
        try {
          const book = await apiFetch(`/books/${bookId}`);
          document.getElementById("title").value = book.title || "";
          document.getElementById("author").value = book.author || "";
          document.getElementById("category").value = book.category || "";
          document.getElementById("isbn").value = book.isbn || "";
          document.getElementById("copies").value = book.copies || 1;
          document.getElementById("description").value = book.description || "";
        } catch (err) {
          document.getElementById("editBookMessage").textContent =
            "Failed to load book: " + err.message;
          document.getElementById("editBookMessage").className = "message error";
          document.getElementById("editBookMessage").style.display = "block";
        }
      })();

      editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const messageEl = document.getElementById("editBookMessage");
        messageEl.style.display = "none";

        const title = document.getElementById("title").value.trim();
        const author = document.getElementById("author").value.trim();

        let valid = true;
        document.querySelectorAll(".field-error").forEach((el) => (el.style.display = "none"));
        if (!title) {
          document.getElementById("titleError").style.display = "block";
          valid = false;
        }
        if (!author) {
          document.getElementById("authorError").style.display = "block";
          valid = false;
        }
        if (!valid) return;

        const btn = document.getElementById("editBookBtn");
        btn.disabled = true;
        btn.textContent = "Updating...";

        try {
          await apiFetch(`/books/${bookId}`, {
            method: "PUT",
            body: JSON.stringify({
              title,
              author,
              category: document.getElementById("category").value.trim(),
              isbn: document.getElementById("isbn").value.trim(),
              copies: parseInt(document.getElementById("copies").value) || 1,
              description: document.getElementById("description").value.trim(),
            }),
          });
          messageEl.textContent = "Book updated successfully!";
          messageEl.className = "message success";
          messageEl.style.display = "block";
        } catch (err) {
          messageEl.textContent = err.message;
          messageEl.className = "message error";
          messageEl.style.display = "block";
        } finally {
          btn.disabled = false;
          btn.textContent = "Update Book";
        }
      });
    }
  }

  if (adminBody) {
    loadAdminBooks();
  }
})();