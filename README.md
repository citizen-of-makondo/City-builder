# City Builder

Изометрический градостроительный симулятор для Steam. План и дизайн систем — в [PLAN.md](PLAN.md), правила архитектуры — в [CLAUDE.md](CLAUDE.md).

Стек: TypeScript (strict) + Vite + React 18 + PixiJS v8 + Zustand + Vitest, десктоп-обёртка — Tauri 2.

## Команды

```bash
npm install        # установка зависимостей
npm run dev        # dev-сервер в браузере (http://localhost:5173)
npm run tauri dev  # то же в нативном окне Tauri (нужен Rust)
npm test           # юнит-тесты симуляции (Vitest)
npm run lint       # ESLint + Prettier check
npm run build      # типы + прод-сборка фронтенда
```

## Структура

```
src/
  sim/        # симуляция: чистый TS, без зависимостей (см. CLAUDE.md)
  render/     # PixiJS: сцена, изометрия, камера, ввод
  ui/         # React: HUD, панели, окна
  app/        # склейка: store, игровой цикл, сейв-менеджер
  platform/   # интерфейс Platform: localStorage (dev) / Tauri fs (релиз)
  i18n/       # строки UI (en/ru)
src-tauri/    # Tauri 2: окно 1280×800, fs-плагин для сейвов
tools/        # build-atlas.ts (фаза 7)
```
