const html = document.documentElement;
const toggle = document.getElementById('themeToggle');
const label = document.getElementById('themeLabel');

// Load saved preference
const saved = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', saved);
label.textContent = saved === 'dark' ? '🌙' : '☀️';

toggle.addEventListener('click', () => {
  const isDark = html.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  label.textContent = next === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('theme', next);
});
