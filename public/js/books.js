(function () {
  let currentPage = 1
  let currentSearch = ''
  let currentCategory = ''
  let totalPages = 1
  const perPage = 12

  async function loadBooks(page = 1) {
    const container = document.getElementById('booksContainer')
    if (!container) return
    container.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>'

    try {
      const params = new URLSearchParams()
      if (page > 1) params.set('page', page)
      if (perPage !== 20) params.set('limit', perPage)
      if (currentSearch) params.set('search', currentSearch)
      if (currentCategory) params.set('category', currentCategory)

      const qs = params.toString()
      const res = await apiFetch(`/books${qs ? '?' + qs : ''}`)
      const { data: books, total, pages } = res
      totalPages = pages
      currentPage = res.page || 1

      populateCategories(books)
      renderBooks(books, total)
      renderPagination()
    } catch (err) {
      container.innerHTML = `<p style="color:var(--danger);text-align:center;">Failed to load books: ${err.message}</p>`
    }
  }

  let categoriesLoaded = false

  function populateCategories(books) {
    const filter = document.getElementById('categoryFilter')
    if (!filter || categoriesLoaded) return
    const categories = [...new Set(books.map((b) => b.category).filter(Boolean))]
    categories.forEach((cat) => {
      const opt = document.createElement('option')
      opt.value = cat
      opt.textContent = cat
      filter.appendChild(opt)
    })
    categoriesLoaded = true
  }

  function renderBooks(books, total) {
    const container = document.getElementById('booksContainer')
    if (!container) return
    if (books.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:2rem;">No books found.</p>'
      return
    }
    container.innerHTML = `
      <p style="grid-column:1/-1;color:var(--gray);font-size:0.9rem;margin:0 0 0.5rem 0;">
        ${total} book${total !== 1 ? 's' : ''} found
      </p>
      ${books.map(book => `
        <div class="book-card">
          <img src="${bookCover(book.title, book.author)}" alt="${book.title}">
          <div class="card-body">
            <h3>${book.title}</h3>
            <p>${book.author}</p>
            <a href="book-details.html?id=${book.id || book._id}" class="btn">View Details</a>
          </div>
        </div>
      `).join('')}`
  }

  function renderPagination() {
    const container = document.getElementById('booksContainer')
    if (!container || totalPages <= 1) return

    const nav = document.createElement('div')
    nav.className = 'pagination'
    nav.style.cssText = 'grid-column:1/-1;display:flex;justify-content:center;gap:0.5rem;margin-top:1.5rem;'

    const prev = document.createElement('button')
    prev.className = 'btn btn-secondary'
    prev.textContent = '‹ Prev'
    prev.disabled = currentPage <= 1
    prev.addEventListener('click', () => { if (currentPage > 1) loadBooks(currentPage - 1); window.scrollTo(0, 0) })
    nav.appendChild(prev)

    const pageInfo = document.createElement('span')
    pageInfo.style.cssText = 'display:flex;align-items:center;padding:0 0.8rem;font-size:0.9rem;color:var(--gray);'
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`
    nav.appendChild(pageInfo)

    const next = document.createElement('button')
    next.className = 'btn btn-secondary'
    next.textContent = 'Next ›'
    next.disabled = currentPage >= totalPages
    next.addEventListener('click', () => { if (currentPage < totalPages) loadBooks(currentPage + 1); window.scrollTo(0, 0) })
    nav.appendChild(next)

    container.appendChild(nav)
  }

  function filterBooks() {
    currentSearch = (document.getElementById('searchInput')?.value || '').trim()
    currentCategory = document.getElementById('categoryFilter')?.value || ''
    categoriesLoaded = false
    const filter = document.getElementById('categoryFilter')
    if (filter) filter.innerHTML = '<option value="">All Categories</option>'
    currentPage = 1
    loadBooks(1)
  }

  const searchInput = document.getElementById('searchInput')
  const categoryFilter = document.getElementById('categoryFilter')
  if (searchInput) {
    searchInput.addEventListener('input', debounce(filterBooks, 300))
  }
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterBooks)
  }

  if (document.getElementById('booksContainer')) {
    loadBooks(1)
  }

  if (document.getElementById('bookDetail')) {
    loadBookDetails()
  }

  // ─── Book Detail ──────────────────────────────────────────────────────

  function loadBookDetails() {
    const container = document.getElementById('bookDetail')
    if (!container) return

    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')

    if (!id) {
      container.innerHTML = '<p style="color:var(--danger);">No book ID provided.</p>'
      return
    }

    ;(async () => {
      try {
        const book = await apiFetch(`/books/${id}`)
        const token = localStorage.getItem('token')
        const role = localStorage.getItem('role')

        let isBorrowed = false
        if (token) {
          try {
            const statusRes = await apiFetch(`/books/${id}/borrow-status`)
            isBorrowed = statusRes.borrowed
          } catch (_) {}
        }

        function renderDetail(currentBook, borrowed) {
          const copies = currentBook.copies || 0
          const isAvailable = copies > 0

          let borrowSection = ''
          if (token && role !== 'admin') {
            if (borrowed) {
              borrowSection = `
                <button id="borrowBtn" class="btn btn-danger" style="margin-top:1.2rem;">
                  &#8617; Return Book
                </button>
              `
            } else if (isAvailable) {
              borrowSection = `
                <button id="borrowBtn" class="btn btn-primary" style="margin-top:1.2rem;">
                  &#128218; Borrow Book
                </button>
              `
            } else {
              borrowSection = `
                <button class="btn" style="margin-top:1.2rem;opacity:0.5;cursor:not-allowed;" disabled>
                  No Copies Available
                </button>
              `
            }
          } else if (!token) {
            borrowSection = `
              <p style="margin-top:1.2rem;color:var(--gray);">
                <a href="login.html" style="color:var(--gold);font-weight:500;">Login</a> to borrow this book.
              </p>
            `
          }

          container.innerHTML = `
            <div class="book-detail">
              <div class="book-cover">
                <img src="${bookCover(currentBook.title, currentBook.author)}" alt="${currentBook.title}">
              </div>
              <div class="book-info">
                <h1>${currentBook.title}</h1>
                <p class="author">by ${currentBook.author || 'Unknown'}</p>
                <div class="meta">
                  <span><strong>Category:</strong> ${currentBook.category || 'N/A'}</span>
                  <span><strong>ISBN:</strong> ${currentBook.isbn || 'N/A'}</span>
                  <span id="copiesDisplay"><strong>Copies:</strong> ${copies}</span>
                </div>
                <div class="availability ${isAvailable ? 'available' : 'unavailable'}" id="availabilityDisplay">
                  ${isAvailable ? '&#10003; Available (' + copies + ' copies)' : '&#10007; Currently Unavailable'}
                </div>
                <p class="description">${currentBook.description || 'No description available.'}</p>
                <div id="borrowMessage" class="message" style="margin-top:1rem;display:none;"></div>
                ${borrowSection}
              </div>
            </div>
          `

          const borrowBtn = document.getElementById('borrowBtn')
          if (!borrowBtn) return

          borrowBtn.addEventListener('click', async () => {
            const msgEl = document.getElementById('borrowMessage')
            borrowBtn.disabled = true
            const action = borrowed ? 'return' : 'borrow'
            borrowBtn.textContent = action === 'borrow' ? 'Borrowing...' : 'Returning...'

            try {
              const result = await apiFetch(`/books/${id}/${action}`, { method: 'POST' })
              isBorrowed = !borrowed
              msgEl.textContent = result.message
              msgEl.className = 'message success'
              msgEl.style.display = 'block'
              renderDetail(result.book, isBorrowed)
            } catch (err) {
              borrowBtn.disabled = false
              borrowBtn.textContent = borrowed ? '&#8617; Return Book' : '&#128218; Borrow Book'
              msgEl.textContent = err.message
              msgEl.className = 'message error'
              msgEl.style.display = 'block'
            }
          })
        }

        renderDetail(book, isBorrowed)
      } catch (err) {
        container.innerHTML = `<p style="color:var(--danger);">Failed to load book: ${err.message}</p>`
      }
    })()
  }

  function debounce(fn, ms) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => fn(...args), ms)
    }
  }
})()
