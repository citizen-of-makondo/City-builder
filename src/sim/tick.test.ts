import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { tick, tickMany } from './tick';

describe('tick', () => {
  it('не падает на пустом состоянии и инкрементирует время', () => {
    const initial = createInitialState(42);
    expect(initial.tick).toBe(0);

    const { state, events } = tick(initial);

    expect(state.tick).toBe(1);
    expect(Array.isArray(events)).toBe(true);
    // исходное состояние не мутируется
    expect(initial.tick).toBe(0);
  });

  it('tickMany прокручивает N тиков', () => {
    const initial = createInitialState(42);
    const { state } = tickMany(initial, 100);
    expect(state.tick).toBe(100);
  });

  it('детерминирован: одинаковый seed даёт одинаковое состояние', () => {
    const a = tickMany(createInitialState(7), 50).state;
    const b = tickMany(createInitialState(7), 50).state;
    expect(a).toEqual(b);
  });
});
