// ===== Состояние =====

const STORAGE_KEY = 'todo-items-v1'

/** @typedef {{ id: string, text: string, time: string, done: boolean }} TodoItem */

/** @type {TodoItem[]} */
let items = loadItems()
let currentFilter = 'all' // 'all' | 'active' | 'done'

// ===== Элементы =====

const form = document.querySelector('#todo-form')
const inputAction = document.querySelector('#todo-action')
const inputTime = document.querySelector('#todo-time')
const list = document.querySelector('#todo-list')
const template = document.querySelector('#item-template')
const emptyState = document.querySelector('#empty-state')
const todoCount = document.querySelector('#todo-count')
const doneCount = document.querySelector('#done-count')
const panelFooter = document.querySelector('#panel-footer')
const clearDoneBtn = document.querySelector('#clear-done')
const filterButtons = document.querySelectorAll('.filters__btn')
const todayDate = document.querySelector('#today-date')

// ===== Инициализация =====

setTodayDate()
render()

form.addEventListener('submit', (e) => {
  e.preventDefault()
  addItem()
})

clearDoneBtn.addEventListener('click', clearDone)

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter
    filterButtons.forEach((b) => {
      const active = b === btn
      b.classList.toggle('is-active', active)
      b.setAttribute('aria-selected', String(active))
    })
    render()
  })
})

// ===== Функции =====

function setTodayDate () {
  const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
  todayDate.textContent = formatter.format(new Date())
}

function loadItems () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveItems () {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Хранилище недоступно (приватный режим и т.п.) — молча игнорируем
  }
}

function addItem () {
  const text = inputAction.value.trim()
  if (!text) {
    inputAction.focus()
    return
  }

  const newItem = {
    id: crypto.randomUUID(),
    text,
    time: inputTime.value,
    done: false
  }

  items.push(newItem)
  saveItems()
  clearInputs()
  render({ animateNewId: newItem.id })
}

function clearInputs () {
  inputAction.value = ''
  inputTime.value = ''
  inputAction.focus()
}

function removeItem (id) {
  const node = list.querySelector(`[data-id="${id}"]`)
  if (!node) {
    items = items.filter((item) => item.id !== id)
    saveItems()
    render()
    return
  }

  node.classList.add('is-removing')
  node.addEventListener('animationend', () => {
    items = items.filter((item) => item.id !== id)
    saveItems()
    render()
  }, { once: true })
}

function toggleDone (id) {
  const item = items.find((i) => i.id === id)
  if (!item) return
  item.done = !item.done
  saveItems()
  render()
}

function clearDone () {
  items = items.filter((item) => !item.done)
  saveItems()
  render()
}

function startEdit (id) {
  const item = items.find((i) => i.id === id)
  const node = list.querySelector(`[data-id="${id}"]`)
  if (!item || !node) return

  const textEl = node.querySelector('.item__text')
  const timeEl = node.querySelector('.item__time')

  const textInput = document.createElement('input')
  textInput.className = 'todo__input'
  textInput.style.width = '100%'
  textInput.style.marginBottom = '6px'
  textInput.value = item.text

  const timeInput = document.createElement('input')
  timeInput.type = 'time'
  timeInput.className = 'todo__input'
  timeInput.style.width = '130px'
  timeInput.value = item.time || ''

  textEl.replaceWith(textInput)
  timeEl.replaceWith(timeInput)
  textInput.focus()
  textInput.select()

  const commit = () => {
    const newText = textInput.value.trim()
    item.text = newText || item.text
    item.time = timeInput.value
    saveItems()
    render()
  }

  const onKeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      render()
    }
  }

  textInput.addEventListener('keydown', onKeydown)
  timeInput.addEventListener('keydown', onKeydown)
  textInput.addEventListener('blur', () => {
    // Небольшая задержка, чтобы клик по timeInput не отменял редактирование раньше времени
    setTimeout(() => {
      if (document.activeElement !== timeInput) commit()
    }, 0)
  })
  timeInput.addEventListener('blur', commit)
}

function getFiltered () {
  switch (currentFilter) {
    case 'active':
      return items.filter((item) => !item.done)
    case 'done':
      return items.filter((item) => item.done)
    default:
      return items
  }
}

function render ({ animateNewId } = {}) {
  list.innerHTML = ''

  const filtered = getFiltered()

  filtered
    .slice()
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
    .forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true)
      node.dataset.id = item.id
      node.classList.toggle('is-done', item.done)

      node.querySelector('.item__text').textContent = item.text
      node.querySelector('.item__time').textContent = item.time || 'Без времени'

      node.querySelector('.item__status').addEventListener('click', () => toggleDone(item.id))
      node.querySelector('.item__edit').addEventListener('click', () => startEdit(item.id))
      node.querySelector('.item__remove').addEventListener('click', () => removeItem(item.id))

      if (item.id === animateNewId) {
        node.style.animation = 'none'
        requestAnimationFrame(() => { node.style.animation = '' })
      }

      list.append(node)
    })

  const total = items.length
  const doneTotal = items.filter((i) => i.done).length

  emptyState.classList.toggle('is-visible', filtered.length === 0)
  panelFooter.classList.toggle('is-visible', total > 0)

  todoCount.textContent = pluralizeTasks(total)
  doneCount.textContent = `${doneTotal} выполнено`
}

function pluralizeTasks (n) {
  const mod10 = n % 10
  const mod100 = n % 100
  let word = 'дел'
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = 'дело'
    else if (mod10 >= 2 && mod10 <= 4) word = 'дела'
  }
  return `${n} ${word}`
}
