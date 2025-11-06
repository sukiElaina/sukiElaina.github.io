/*
  News page behavior extracted from _layouts/news.html
  ES5-compatible (no optional chaining, arrow functions, or Array.from requirement)
*/
(function () {
  var root = document.getElementById('news');
  if (root) root.classList.add('js-enabled');

  // NodeList to Array polyfill
  function toArray(list) {
    try {
      return Array.prototype.slice.call(list);
    } catch (e) {
      var arr = [];
      for (var i = 0; i < list.length; i++) arr.push(list[i]);
      return arr;
    }
  }

  var posts = toArray(document.querySelectorAll('.news-post'));
  if (!posts.length) return;

  // Collect unique dates in the order rendered (items sorted desc)
  var dates = [];
  posts.forEach =
    posts.forEach ||
    function (cb) {
      for (var i = 0; i < posts.length; i++) cb(posts[i], i);
    };
  posts.forEach(function (p) {
    var d = p.getAttribute('data-date');
    if (dates.indexOf(d) === -1) dates.push(d);
  });

  function postsFor(date) {
    var out = [];
    posts.forEach(function (p) {
      if (p.getAttribute('data-date') === date) out.push(p);
    });
    return out;
  }

  function buildDateOptions(granularity, selectedDate) {
    var sel = document.getElementById('news-date-select');
    if (!sel) return null;
    sel.innerHTML = '';
    var seen = {};
    dates.forEach(function (d) {
      var key = d;
      if (granularity === 'year') key = d.slice(0, 4);
      else if (granularity === 'month') key = d.slice(0, 7);
      if (!seen[key]) {
        seen[key] = true;
        var opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        sel.appendChild(opt);
      }
    });
    if (selectedDate) sel.value = selectedDate.slice(0, sel.value.length);
    return sel;
  }

  function buildCats(ps) {
    var wrap = document.getElementById('news-cats');
    if (!wrap) return null;
    wrap.innerHTML = '';

    var all = {};
    for (var i = 0; i < ps.length; i++) {
      var raw = ps[i].getAttribute('data-cats') || '';
      var parts = raw.split(',');
      var any = false;
      for (var j = 0; j < parts.length; j++) {
        var s = (parts[j] || '').trim();
        if (s) {
          all[s] = true;
          any = true;
        }
      }
      if (!any) all['uncategorized'] = true;
    }

    var keys = Object.keys(all);
    if (!keys.length) return null;
    if (keys.length === 1 && keys[0] === 'uncategorized') {
      wrap.innerHTML = '';
      return null;
    }

    function makeBtn(text, value, active) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className =
        'btn btn-sm ' + (active ? 'btn-secondary' : 'btn-outline-secondary');
      b.textContent = text;
      b.setAttribute('data-value', value);
      return b;
    }

    function label(key) {
      return key === 'uncategorized' ? '未分类' : key;
    }

    wrap.appendChild(makeBtn('全部', 'all', true));
    keys.forEach(function (c) {
      wrap.appendChild(makeBtn(label(c), c, false));
    });

    return wrap;
  }

  function renderTitles(ps) {
    var list = document.getElementById('news-titles');
    if (!list) return;
    list.innerHTML = '';
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var id = p.id;
      var heading = p.querySelector('h1, h2, h3, h4, h5, h6');
      var title =
        p.getAttribute('data-title') ||
        (heading ? heading.textContent : 'Untitled');
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'btn btn-sm btn-outline-primary me-3 title-btn';
      a.textContent = title;
      a.setAttribute('data-target', id);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = this.getAttribute('data-target');
        showPost(target);
        setActiveTitle(target);
      });
      list.appendChild(a);
    }
    if (ps[0]) {
      showPost(ps[0].id);
      setActiveTitle(ps[0].id);
    }
  }

  function showTitles(date) {
    var ps = postsFor(date);
    var catsWrap = buildCats(ps);
    var currentCat = 'all';

    function filterByCat() {
      if (currentCat === 'all') return ps;
      var filtered = [];
      for (var i = 0; i < ps.length; i++) {
        var raw = ps[i].getAttribute('data-cats') || '';
        var parts = raw.split(',');
        var matched = false;
        for (var j = 0; j < parts.length; j++) {
          var s = (parts[j] || '').trim();
          if (s === currentCat) {
            matched = true;
            break;
          }
        }
        if (!parts.length && currentCat === 'uncategorized') matched = true;
        if (matched) filtered.push(ps[i]);
      }
      return filtered;
    }

    if (catsWrap) {
      catsWrap.addEventListener('click', function (e) {
        var btn =
          e.target && e.target.closest ? e.target.closest('button') : e.target;
        if (!btn || btn.tagName !== 'BUTTON') return;
        currentCat = btn.getAttribute('data-value');
        toArray(catsWrap.querySelectorAll('button')).forEach(function (b) {
          b.classList.remove('btn-secondary');
          b.classList.add('btn-outline-secondary');
        });
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-outline-secondary');
        renderTitles(filterByCat());
      });
    }

    renderTitles(filterByCat());
  }

  function showPost(id) {
    posts.forEach(function (p) {
      p.classList.toggle('active', p.id === id);
    });
    var el = document.getElementById(id);
    if (el && window.scrollTo) {
      try {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 80,
          behavior: 'smooth',
        });
      } catch (e) {
        window.scrollTo(
          0,
          el.getBoundingClientRect().top + window.scrollY - 80
        );
      }
    }
  }

  function setActiveTitle(id) {
    toArray(document.querySelectorAll('.title-btn')).forEach(function (b) {
      if (b.getAttribute('data-target') === id) {
        b.classList.remove('btn-outline-primary');
        b.classList.add('btn-primary');
      } else {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline-primary');
      }
    });
  }

  var gButtons = toArray(document.querySelectorAll('[data-granularity]'));
  var currentGran = 'day';
  gButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      gButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      currentGran = btn.getAttribute('data-granularity');
      buildDateOptions(currentGran);
    });
  });

  var dateSelect = document.getElementById('news-date-select');
  if (dateSelect) {
    dateSelect.addEventListener('change', function () {
      var v = this.value;
      if (currentGran === 'year' || currentGran === 'month') {
        var target = null;
        for (var i = 0; i < dates.length; i++) {
          if (dates[i].indexOf(v) === 0) {
            target = dates[i];
            break;
          }
        }
        if (target) showTitles(target);
      } else {
        showTitles(v);
      }
    });
  }

  // Fallback keyboard shortcut: press "o" to open current visible post.
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    if (e.key === 'o') {
      for (var i = 0; i < posts.length; i++) {
        if (posts[i].style.display !== 'none') {
          var url = posts[i].getAttribute('data-url');
          if (url) {
            window.location.href = url;
          }
          break;
        }
      }
    }
  });

  var latest = dates[0];
  buildDateOptions('day');
  if (dateSelect) dateSelect.value = latest;
  showTitles(latest);
})();
