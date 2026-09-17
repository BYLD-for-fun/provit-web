/*
 * Waitlist submission.
 *
 * The endpoint comes from config.js, which is gitignored. There is deliberately no hardcoded
 * fallback URL: committing a live Apps Script endpoint publishes a write endpoint to anyone who
 * views source, and it then cannot be rotated without a deploy.
 */
(function () {
  'use strict';

  var ENDPOINT =
    (typeof window !== 'undefined' && window.PROVIT_CONFIG && window.PROVIT_CONFIG.WAITLIST_URL) ||
    '';

  var STORED = 'provit_waitlist_email';

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  /** Both forms post to the same place, so wire whichever ones exist on the page. */
  function wire(form) {
    if (!form) return;

    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button');
    var text = form.querySelector('.btn-text');
    var loading = form.querySelector('.btn-loading');
    var scope = form.parentElement || document;
    var success = scope.querySelector('[data-success]');
    var error = scope.querySelector('[data-error]');

    function setLoading(busy) {
      button.disabled = busy;
      if (text) text.hidden = busy;
      if (loading) loading.hidden = !busy;
    }

    function showError(message) {
      if (!error) return;
      error.textContent = message;
      error.hidden = false;
    }

    function clearMessages() {
      if (error) error.hidden = true;
      if (success) success.hidden = true;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = input.value.trim();
      clearMessages();

      if (!isValidEmail(email)) {
        showError('That does not look like an email address.');
        input.classList.add('shake');
        setTimeout(function () {
          input.classList.remove('shake');
        }, 500);
        input.focus();
        return;
      }

      if (!ENDPOINT) {
        // Loud in the console, honest in the UI: pretending to succeed would lose real signups
        // silently during setup.
        console.error('WAITLIST_URL is not configured. Copy config.example.js to config.js.');
        showError('The waitlist is not accepting signups yet. Please try again shortly.');
        return;
      }

      setLoading(true);

      var params = new URLSearchParams({
        email: email,
        timestamp: new Date().toISOString(),
        source: window.location.hostname || 'local',
      });

      fetch(ENDPOINT + '?' + params.toString(), { method: 'POST', redirect: 'follow' })
        .then(function (response) {
          if (!response.ok) throw new Error('bad_status');
          return response.json();
        })
        .then(function (result) {
          if (!result || result.status !== 'success') throw new Error('rejected');
          try {
            localStorage.setItem(STORED, email);
          } catch (ignored) {
            /* private mode; the signup still landed */
          }
          form.hidden = true;
          var note = scope.querySelector('.form-note');
          if (note) note.hidden = true;
          if (success) success.hidden = false;
        })
        .catch(function () {
          showError('Something went wrong. Please try again.');
        })
        .then(function () {
          setLoading(false);
        });
    });

    // Someone who already joined should not be asked twice on a return visit.
    try {
      if (localStorage.getItem(STORED)) {
        form.hidden = true;
        var note = scope.querySelector('.form-note');
        if (note) note.hidden = true;
        if (success) success.hidden = false;
      }
    } catch (ignored) {
      /* private mode */
    }
  }

  /*
   * Presentation. Everything below is decoration and every piece of it degrades to "visible and
   * static" -- the .js-reveal class is what arms the hidden-until-scrolled styles, so a browser
   * that never gets here shows the whole page instead of a blank one.
   */
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealOnScroll() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    // No observer, or motion turned down: show everything and leave it alone.
    if (still || typeof IntersectionObserver === 'undefined') {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('in');
      return;
    }

    document.documentElement.classList.add('js-reveal');

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          // One-way: re-hiding on the way back up makes a page feel nervous.
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    for (var j = 0; j < targets.length; j++) observer.observe(targets[j]);
  }

  /** The sticky bar only draws its bottom edge once there is content behind it. */
  function navOnScroll() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var ticking = false;

    function update() {
      nav.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true },
    );

    update();
  }

  revealOnScroll();
  navOnScroll();

  wire(document.getElementById('signupForm'));
  wire(document.getElementById('signupFormFooter'));

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
