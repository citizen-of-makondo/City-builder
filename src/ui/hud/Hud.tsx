import { t } from '../../i18n';
import { useGameStore } from '../../app/store';

/**
 * Пустой HUD фазы 0: верхняя панель ресурсов поверх canvas.
 * Информация не кодируется только цветом: каждый ресурс = иконка + текст.
 */
export function Hud() {
  const resources = useGameStore((s) => s.state.resources);
  const eraId = useGameStore((s) => s.state.eraId);
  const tickNow = useGameStore((s) => s.state.tick);

  return (
    <div className="hud">
      <div className="hud-bar">
        <span className="hud-item" title={t('hud.gold')}>
          <span aria-hidden="true">🪙</span> {t('hud.gold')}: {resources.gold}
        </span>
        <span className="hud-item" title={t('hud.supplies')}>
          <span aria-hidden="true">📦</span> {t('hud.supplies')}: {resources.supplies}
        </span>
        <span className="hud-item" title={t('hud.population')}>
          <span aria-hidden="true">👥</span> {t('hud.population')}: {resources.population}
        </span>
        <span className="hud-item">
          {t('hud.era')}: {t(`era.${eraId}`)}
        </span>
        <span className="hud-item hud-tick">t={tickNow}</span>
      </div>
    </div>
  );
}
