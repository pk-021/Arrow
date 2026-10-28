"use strict";

class ArrowNotificationOverlay {
  constructor() {
    this.notifications = new Map();
    this.nextId = 0;
    this.container = this.createContainer();
    chrome.runtime.onMessage.addListener((message, _sender, respond) => {
      if (message?.type !== 'showOverlayNotification') return false;
      respond({ success: true, notificationId: this.show(message.message, message.notificationType) });
      return false;
    });
  }

  createContainer() {
    document.querySelector('[data-arrow-overlay]')?.remove();
    const container = document.createElement('div');
    container.className = 'arrow-notification-overlay';
    container.dataset.arrowOverlay = 'true';
    document.body.append(container);
    return container;
  }

  show(message, type = 'info', duration = 5000) {
    const id = ++this.nextId;
    const notification = document.createElement('div');
    notification.className = `arrow-notification arrow-notification--${type}`;
    notification.dataset.notificationId = String(id);

    const header = document.createElement('div');
    header.className = 'arrow-notification-header';
    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('assets/logo_v2.png');
    logo.alt = 'Arrow';
    logo.className = 'arrow-notification-logo';
    const title = document.createElement('span');
    title.className = 'arrow-notification-title';
    title.textContent = 'Arrow';
    const close = document.createElement('button');
    close.className = 'arrow-notification-close';
    close.type = 'button';
    close.ariaLabel = 'Close notification';
    close.textContent = '×';
    header.append(logo, title, close);

    const body = document.createElement('div');
    body.className = 'arrow-notification-body';
    const text = document.createElement('p');
    text.className = 'arrow-notification-message';
    text.textContent = String(message || '');
    body.append(text);

    const actions = document.createElement('div');
    actions.className = 'arrow-notification-actions';
    const okay = document.createElement('button');
    okay.className = 'arrow-notification-btn';
    okay.type = 'button';
    okay.textContent = 'OK';
    actions.append(okay);

    const progress = document.createElement('div');
    progress.className = 'arrow-notification-progress';
    notification.append(header, body, actions, progress);
    const dismiss = () => this.remove(id);
    close.addEventListener('click', dismiss);
    okay.addEventListener('click', dismiss);

    this.container.append(notification);
    const timer = setTimeout(dismiss, duration);
    this.notifications.set(id, { notification, timer });
    requestAnimationFrame(() => {
      notification.classList.add('show');
      progress.classList.add('animate');
    });
    return id;
  }

  remove(id) {
    const entry = this.notifications.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.notification.classList.remove('show');
    entry.notification.addEventListener('transitionend', () => entry.notification.remove(), { once: true });
    setTimeout(() => entry.notification.remove(), 300);
    this.notifications.delete(id);
  }
}

window.arrowOverlay ||= new ArrowNotificationOverlay();
