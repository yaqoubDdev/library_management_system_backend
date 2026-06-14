const borrowsRouter = require('express').Router()
const BorrowRecord = require('../models/borrowRecord')
const middleware = require('../utils/middleware')

// ─── ADMIN: Get all borrow records with optional search ───────────────────────
borrowsRouter.get('/', middleware.userExtractor, async (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  try {
    const { search, status, page, limit } = req.query
    const pageNum = Math.max(parseInt(page) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
    const skip = (pageNum - 1) * limitNum

    let match = {}
    if (status && ['borrowed', 'returned'].includes(status)) {
      match.status = status
    }

    let pipeline = [
      { $match: match },
      { $sort: { borrowedAt: -1 } },
      { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'book' } },
      { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.username': { $regex: search, $options: 'i' } },
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'book.title': { $regex: search, $options: 'i' } },
            { 'book.isbn': { $regex: search, $options: 'i' } }
          ]
        }
      })
    }

    const countPipeline = [...pipeline, { $count: 'total' }]
    const countResult = await BorrowRecord.aggregate(countPipeline)
    const total = countResult[0]?.total || 0

    pipeline.push({ $skip: skip }, { $limit: limitNum })

    const records = await BorrowRecord.aggregate(pipeline)

    const data = records.map(r => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
      __v: undefined,
      book: r.book ? { ...r.book, _id: undefined, __v: undefined } : null,
      user: r.user ? { ...r.user, _id: undefined, __v: undefined, passwordHash: undefined } : null
    }))

    res.json({ data, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    next(error)
  }
})

// ─── USER: Get own borrow records ─────────────────────────────────────────────
borrowsRouter.get('/my', middleware.userExtractor, async (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })

  try {
    const { status, page, limit } = req.query
    const pageNum = Math.max(parseInt(page) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
    const skip = (pageNum - 1) * limitNum

    const query = { user: user._id }
    if (status && ['borrowed', 'returned'].includes(status)) {
      query.status = status
    }

    const [records, total] = await Promise.all([
      BorrowRecord.find(query)
        .populate('book', 'title author isbn category copies')
        .sort({ borrowedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      BorrowRecord.countDocuments(query)
    ])

    res.json({ data: records, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    next(error)
  }
})

// ─── USER: Request extension on a borrow record ───────────────────────────────
borrowsRouter.post('/:id/request-extension', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })

  BorrowRecord.findById(req.params.id)
    .then((record) => {
      if (!record) return res.status(404).json({ error: 'borrow record not found' })
      if (record.user.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'not your borrow record' })
      }
      if (record.status === 'returned') {
        return res.status(400).json({ error: 'book already returned' })
      }
      if (record.extensionRequested) {
        return res.status(400).json({ error: 'extension already requested' })
      }

      // Must request before due date
      const now = new Date()
      if (now > record.dueDate) {
        return res.status(400).json({ error: 'due date has passed, extension cannot be requested' })
      }

      record.extensionRequested = true
      record.save()
        .then((saved) => res.json({ message: 'extension request submitted', record: saved }))
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Approve extension request ─────────────────────────────────────────
borrowsRouter.post('/:id/approve-extension', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  const { days } = req.body
  const extensionDays = parseInt(days) || 7

  BorrowRecord.findById(req.params.id)
    .then((record) => {
      if (!record) return res.status(404).json({ error: 'borrow record not found' })
      if (!record.extensionRequested) {
        return res.status(400).json({ error: 'no extension was requested' })
      }
      if (record.extensionApproved) {
        return res.status(400).json({ error: 'extension already approved' })
      }
      if (record.status === 'returned') {
        return res.status(400).json({ error: 'book already returned' })
      }

      // Extend the due date
      const newDueDate = new Date(record.dueDate)
      newDueDate.setDate(newDueDate.getDate() + extensionDays)

      record.dueDate = newDueDate
      record.extensionApproved = true
      record.extensionDays = extensionDays

      record.save()
        .then((saved) =>
          res.json({
            message: `Due date extended by ${extensionDays} days`,
            record: saved
          })
        )
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Deny extension request ────────────────────────────────────────────
borrowsRouter.post('/:id/deny-extension', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  BorrowRecord.findById(req.params.id)
    .then((record) => {
      if (!record) return res.status(404).json({ error: 'borrow record not found' })
      record.extensionRequested = false
      record.save()
        .then((saved) => res.json({ message: 'extension request denied', record: saved }))
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Get borrow records for a specific user ────────────────────────────
borrowsRouter.get('/user/:userId', middleware.userExtractor, async (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  try {
    const { page, limit } = req.query
    const pageNum = Math.max(parseInt(page) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
    const skip = (pageNum - 1) * limitNum

    const query = { user: req.params.userId }

    const [records, total] = await Promise.all([
      BorrowRecord.find(query)
        .populate('book', 'title author isbn category copies')
        .populate('user', 'username name')
        .sort({ borrowedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      BorrowRecord.countDocuments(query)
    ])

    res.json({ data: records, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    next(error)
  }
})

module.exports = borrowsRouter
