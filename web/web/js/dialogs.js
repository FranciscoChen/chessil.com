/* One accessible dialog controller, shared by creation and filter forms. */
window.ChessilDialogs = (() => {
  const triggers = new WeakMap()
  function close(id) {
    const dialog = typeof id === 'string' ? document.getElementById(id) : id
    if (dialog?.open) dialog.close()
  }
  function open(id) {
    const dialog = document.getElementById(id)
    if (!dialog || dialog.open) return
    triggers.set(dialog, document.activeElement)
    dialog.showModal()
    dialog.querySelector('.dialog-field input:not(:disabled), .dialog-field select:not(:disabled)')?.focus()
    document.body.classList.add('site-dialog-open')
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('dialog.site-dialog').forEach(dialog => {
      dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return
        const controls = [...dialog.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, summary, [tabindex="0"]')]
          .filter(element => !element.matches(':disabled') && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
        if (!controls.length) { event.preventDefault(); return }
        const index = controls.indexOf(document.activeElement)
        if (index === -1 || (event.shiftKey && index === 0) || (!event.shiftKey && index === controls.length - 1)) {
          event.preventDefault()
          controls[event.shiftKey ? controls.length - 1 : 0].focus()
        }
      })
      let outside = false
      const isOutside = event => {
        const rect = dialog.getBoundingClientRect()
        return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
      }
      dialog.addEventListener('pointerdown', event => { outside = event.target === dialog && isOutside(event) })
      dialog.addEventListener('click', event => {
        if (outside && event.target === dialog && isOutside(event)) close(dialog)
        outside = false
        if (event.target.closest('[data-dialog-close]')) close(dialog)
      })
      dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog[open]')) document.body.classList.remove('site-dialog-open')
        const trigger = triggers.get(dialog)
        if (trigger?.isConnected) trigger.focus()
      })
    })
  })
  return { open, close }
})()
