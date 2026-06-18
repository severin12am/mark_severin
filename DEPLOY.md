# Показ портфолио инвестору

## Netlify (рекомендуется)

1. [app.netlify.com/drop](https://app.netlify.com/drop) → перетащите папку **Portfolio** целиком.
2. Дождитесь деплоя → скопируйте ссылку `https://….netlify.app`.
3. **Проверка перед встречей** (обязательно):
   - Откройте ссылку с телефона или в режиме инкognito.
   - Нажмите **Bug Eaters** → должен появиться экран «i'm a man / Klaus / bug».
   - Если ошибка про `.data.br` — `netlify.toml` не попал в деплой; залейте папку заново.

Конфиг `netlify.toml` и `_headers` уже в проекте — Unity `.br` файлы отдаются с `Content-Encoding: br`.

## Что видит инвестор

- Каталог → клик → игра в полноэкранном окне на **вашем домене**.
- Bug Eaters: первый запуск ~10–20 с (скачивается ~13 МБ), повторный — быстрее (кэш).
- На странице каталога сборка Unity **подгружается заранее** (prefetch), чтобы после клика старт был быстрее.

## Локально (репетиция)

`start.bat` → http://localhost:3456 — тот же порядок, что на Netlify.

## Не подходит для Bug Eaters

- Открытие `index.html` двойным кликом (`file://`)
- GitHub Pages без настройки заголовков для `.br`

## Если Unity на хостинге всё равно не стартует

Пересоберите WebGL **без Brotli** (Unity → Publishing Settings → Compression Format → Disabled), замените `games/BugEaters/Build/` и пути в `index.html` (без `.br`).
