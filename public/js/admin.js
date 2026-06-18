(function () {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (!token || role !== 'admin') {
    window.location.href = 'login.html'
    return
  }

  const adminBody = document.getElementById('adminBooksBody')
  const addForm = document.getElementById('addBookForm')
  const editForm = document.getElementById('editBookForm')

  let currentPage = 1
  let currentSearch = ''
  let totalPages = 1
  const perPage = 10

  async function loadAdminBooks(page = 1) {
    if (!adminBody) return
    adminBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;"><div class="spinner-container"><div class="spinner"></div></div></td></tr>'

    try {
      const params = new URLSearchParams()
      if (page > 1) params.set('page', page)
      if (perPage !== 20) params.set('limit', perPage)
      if (currentSearch) params.set('search', currentSearch)

      const qs = params.toString()
      const res = await apiFetch(`/books${qs ? '?' + qs : ''}`)
      const { data: books, total, pages } = res
      currentPage = res.page || 1
      totalPages = pages

      if (books.length === 0) {
        adminBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No books found.</td></tr>'
        return
      }

      adminBody.innerHTML = books.map(book => `
        <tr>
          <td>${book.title}</td>
          <td>${book.author || ''}</td>
          <td>${book.category || 'N/A'}</td>
          <td>${book.copies || 0}</td>
          <td>
            <div class="actions">
              <a href="edit-book.html?id=${book.id || book._id}" class="btn btn-secondary">Edit</a>
              <button class="btn btn-danger" onclick="deleteBook('${book.id || book._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('')

      renderPagination(total)
    } catch (err) {
      adminBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);">Failed to load books: ${err.message}</td></tr>`
    }
  }

  function renderPagination(total) {
    const wrapper = document.querySelector('.admin-table-wrapper')
    if (!wrapper) return

    const existing = document.getElementById('adminPagination')
    if (existing) existing.remove()

    if (totalPages <= 1) return

    const nav = document.createElement('div')
    nav.id = 'adminPagination'
    nav.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:0.5rem;margin-top:1rem;'

    const prev = document.createElement('button')
    prev.className = 'btn btn-secondary'
    prev.textContent = '‹ Prev'
    prev.disabled = currentPage <= 1
    prev.addEventListener('click', () => { if (currentPage > 1) loadAdminBooks(currentPage - 1) })
    nav.appendChild(prev)

    const info = document.createElement('span')
    info.style.cssText = 'font-size:0.9rem;color:var(--gray);padding:0 0.8rem;'
    info.textContent = `Page ${currentPage} of ${totalPages} (${total} total)`
    nav.appendChild(info)

    const next = document.createElement('button')
    next.className = 'btn btn-secondary'
    next.textContent = 'Next ›'
    next.disabled = currentPage >= totalPages
    next.addEventListener('click', () => { if (currentPage < totalPages) loadAdminBooks(currentPage + 1) })
    nav.appendChild(next)

    wrapper.parentNode.insertBefore(nav, wrapper.nextSibling)
  }

  // Add search bar to admin page
  const adminPage = document.querySelector('.admin-books-page')
  if (adminPage && !document.getElementById('adminSearch')) {
    const searchBar = document.createElement('div')
    searchBar.style.cssText = 'display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;'
    searchBar.innerHTML = `
      <input type="text" id="adminSearch" placeholder="Search by title or author..." style="flex:1;min-width:220px;padding:0.6rem 1rem;border:1.5px solid #ddd;border-radius:8px;font-family:inherit;font-size:0.95rem;outline:none;">
    `
    const h1 = adminPage.querySelector('h1')
    if (h1) h1.after(searchBar)

    document.getElementById('adminSearch').addEventListener('input', debounce(() => {
      currentSearch = document.getElementById('adminSearch').value.trim()
      currentPage = 1
      loadAdminBooks(1)
    }, 300))
  }

  function debounce(fn, ms) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => fn(...args), ms)
    }
  }

  window.deleteBook = async function (id) {
    if (!confirm('Are you sure you want to delete this book?')) return
    try {
      await apiFetch(`/books/${id}`, { method: 'DELETE' })
      const msg = document.getElementById('adminMessage')
      if (msg) {
        msg.textContent = 'Book deleted successfully!'
        msg.className = 'message success'
        msg.style.display = 'block'
      }
      loadAdminBooks(currentPage)
    } catch (err) {
      const msg = document.getElementById('adminMessage')
      if (msg) {
        msg.textContent = err.message
        msg.className = 'message error'
        msg.style.display = 'block'
      }
    }
  }

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const messageEl = document.getElementById('addBookMessage')
      messageEl.style.display = 'none'

      const title = document.getElementById('title').value.trim()
      const author = document.getElementById('author').value.trim()

      let valid = true
      document.querySelectorAll('.field-error').forEach((el) => (el.style.display = 'none'))
      if (!title) {
        document.getElementById('titleError').style.display = 'block'
        valid = false
      }
      if (!author) {
        document.getElementById('authorError').style.display = 'block'
        valid = false
      }
      if (!valid) return

      const btn = document.getElementById('addBookBtn')
      btn.disabled = true
      btn.textContent = 'Adding...'

      try {
        await apiFetch('/books', {
          method: 'POST',
          body: JSON.stringify({
            title,
            author,
            category: document.getElementById('category').value.trim(),
            isbn: document.getElementById('isbn').value.trim(),
            copies: parseInt(document.getElementById('copies').value) || 1,
            description: document.getElementById('description').value.trim(),
          }),
        })
        messageEl.textContent = 'Book added successfully!'
        messageEl.className = 'message success'
        messageEl.style.display = 'block'
        addForm.reset()
      } catch (err) {
        messageEl.textContent = err.message
        messageEl.className = 'message error'
        messageEl.style.display = 'block'
      } finally {
        btn.disabled = false
        btn.textContent = 'Add Book'
      }
    })
  }

  if (editForm) {
    const params = new URLSearchParams(window.location.search)
    const bookId = params.get('id')

    if (!bookId) {
      document.getElementById('editBookMessage').textContent = 'No book ID provided.'
      document.getElementById('editBookMessage').className = 'message error'
      document.getElementById('editBookMessage').style.display = 'block'
    } else {
      ;(async () => {
        try {
          const book = await apiFetch(`/books/${bookId}`)
          document.getElementById('title').value = book.title || ''
          document.getElementById('author').value = book.author || ''
          document.getElementById('category').value = book.category || ''
          document.getElementById('isbn').value = book.isbn || ''
          document.getElementById('copies').value = book.copies || 1
          document.getElementById('description').value = book.description || ''
        } catch (err) {
          document.getElementById('editBookMessage').textContent = 'Failed to load book: ' + err.message
          document.getElementById('editBookMessage').className = 'message error'
          document.getElementById('editBookMessage').style.display = 'block'
        }
      })()

      editForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const messageEl = document.getElementById('editBookMessage')
        messageEl.style.display = 'none'

        const title = document.getElementById('title').value.trim()
        const author = document.getElementById('author').value.trim()

        let valid = true
        document.querySelectorAll('.field-error').forEach((el) => (el.style.display = 'none'))
        if (!title) {
          document.getElementById('titleError').style.display = 'block'
          valid = false
        }
        if (!author) {
          document.getElementById('authorError').style.display = 'block'
          valid = false
        }
        if (!valid) return

        const btn = document.getElementById('editBookBtn')
        btn.disabled = true
        btn.textContent = 'Updating...'

        try {
          await apiFetch(`/books/${bookId}`, {
            method: 'PUT',
            body: JSON.stringify({
              title,
              author,
              category: document.getElementById('category').value.trim(),
              isbn: document.getElementById('isbn').value.trim(),
              copies: parseInt(document.getElementById('copies').value) || 1,
              description: document.getElementById('description').value.trim(),
            }),
          })
          messageEl.textContent = 'Book updated successfully!'
          messageEl.className = 'message success'
          messageEl.style.display = 'block'
        } catch (err) {
          messageEl.textContent = err.message
          messageEl.className = 'message error'
          messageEl.style.display = 'block'
        } finally {
          btn.disabled = false
          btn.textContent = 'Update Book'
        }
      })
    }
  }

  if (adminBody) {
    loadAdminBooks(1)
  }
})()
