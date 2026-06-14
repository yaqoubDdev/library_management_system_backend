const { test, describe} = require('node:test')
const assert = require('node:assert')
const listHelper = require('../utils/list_helper')

test('dummy returns one', () => {
  const books = []
  const result = listHelper.dummy(books)
  assert.strictEqual(result, 1)
})
