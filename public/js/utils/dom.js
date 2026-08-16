export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export function createElement(tagName, className, attributes = {}) {
    const el = document.createElement(tagName);
    if (className) el.className = className;
    Object.entries(attributes).forEach(([key, val]) => el.setAttribute(key, val));
    return el;
}

export function addClass(el, className) {
    if (el) el.classList.add(className);
}

export function removeClass(el, className) {
    if (el) el.classList.remove(className);
}