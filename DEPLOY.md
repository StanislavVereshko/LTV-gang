# LTV Gang — деплой на Vercel

Сайт це один файл `index.html` + опціональний `vercel.json` з безпечними заголовками. Жодного білда не треба.

---

## Варіант 1 — Drag & drop (найшвидше, без терміналу)

1. Заходиш на https://vercel.com (логінься через GitHub або email).
2. Натискаєш **Add New → Project → Import** (або просто перетягуєш папку на дашборд Vercel).
3. Перетягуєш папку `ltv-gang` цілком.
4. Vercel сам розуміє що це статика. Натискаєш **Deploy**.
5. Через ~10 секунд отримуєш URL виду `ltv-gang-xxx.vercel.app`.

Готово.

---

## Варіант 2 — CLI (якщо хочеш одну команду)

В терміналі:

```bash
npm i -g vercel        # один раз, якщо ще не встановлений
cd ~/Downloads/ltv-gang   # або куди ти зберіг папку
vercel                 # перший запуск спитає логін і налаштує проект
vercel --prod          # коли готовий — деплой у продакшн
```

При першому запуску `vercel` задасть кілька питань — на всі тисни Enter (дефолти ок).

---

## Варіант 3 — GitHub → Vercel (автодеплой при кожному пуші)

1. Створюєш репозиторій на GitHub, заливаєш папку `ltv-gang`.
2. На vercel.com → **Add New → Project → Import Git Repository** → обираєш репо.
3. Натискаєш **Deploy**.

Тепер кожен `git push` автоматично оновлює сайт.

---

## Власний домен

В Vercel → Project → **Settings → Domains** → додаєш свій (наприклад `ltvgang.com`). Vercel дасть DNS-записи які треба прописати у реєстратора (Namecheap, GoDaddy, Cloudflare). Через 5–30 хвилин домен підхоплюється + автоматичний HTTPS.

---

## Що всередині

- `index.html` — увесь сайт в одному файлі (HTML + CSS + JS)
- `vercel.json` — security headers (опціонально, можна видалити)

Бібліотеки підвантажуються з CDN, нічого локально не зберігається:
- GSAP + ScrollTrigger — анімації
- SplitType — char/word анімації заголовків
- Lenis — плавний скрол
- Google Fonts: Instrument Serif + DM Mono

---

## Що в ньому покращено vs початкова версія

- Кастомний курсор (точка + кільце з лагом, mix-blend difference)
- Прелоадер з лічильником `000 → 100`
- Lenis smooth scroll (інерційний)
- Char-by-char reveal заголовка `LTV Gang` (SplitType + GSAP)
- Word-by-word reveal заголовків секцій при скролі
- Counter-анімація `$0M → $2M` на hero
- Параллакс на великій цифрі при скролі
- Mouse-following spotlight на hero
- Background grid з radial mask
- Анімований шум (steps animation)
- Nav, що ховається при скролі вниз
- Якоря-навігація (Ідея / Команда / Стратегія / Бюджет / Умови)
- Magnetic hover на CTA в футері
- 3D tilt на блоках умов
- Hover-стани на всьому інтерактивному (model steps, role list, ticker)
- Годинник Варшави в футері
- Stagger-reveal таблиці бюджету і всіх грідів
- Pulse-індикатор "конфіденційно" в наві
- Favicon в стилі бренду
- OG-теги для шерінгу

Mobile: курсор автоматично вимикається на тач-пристроях, анімації працюють.
