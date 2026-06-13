import { buildingDefs } from '../../sim/content/buildings';
import { useUiStore } from '../../app/store';
import { t } from '../../i18n';

export function BuildPanel() {
  const buildDefId = useUiStore((s) => s.buildDefId);
  const setBuildDefId = useUiStore((s) => s.setBuildDefId);
  const roadMode = useUiStore((s) => s.roadMode);
  const setRoadMode = useUiStore((s) => s.setRoadMode);

  return (
    <div className="build-panel">
      <span className="build-panel-title">{t('panel.build.title')}</span>

      {/* Здания */}
      {Object.values(buildingDefs).map((def) => (
        <button
          key={def.id}
          type="button"
          className={`build-button${buildDefId === def.id ? ' build-button-active' : ''}`}
          onClick={() => setBuildDefId(buildDefId === def.id ? null : def.id)}
        >
          {t(def.nameKey)}
          <span className="build-size">
            {def.size.w}×{def.size.h}
          </span>
        </button>
      ))}

      {/* Разделитель */}
      <span className="build-sep" aria-hidden="true" />

      {/* Инструменты дорог */}
      <button
        type="button"
        className={`build-button road-button${roadMode === 'place' ? ' build-button-active' : ''}`}
        onClick={() => setRoadMode(roadMode === 'place' ? null : 'place')}
        title={t('panel.road.place')}
      >
        <span aria-hidden="true">⛏</span>
        <span className="build-size">{t('panel.road.place_short')}</span>
      </button>
      <button
        type="button"
        className={`build-button road-button${roadMode === 'erase' ? ' build-button-active' : ''}`}
        onClick={() => setRoadMode(roadMode === 'erase' ? null : 'erase')}
        title={t('panel.road.erase')}
      >
        <span aria-hidden="true">✕</span>
        <span className="build-size">{t('panel.road.erase_short')}</span>
      </button>

      {(buildDefId !== null || roadMode !== null) && (
        <span className="build-hint">{t('panel.build.cancel_hint')}</span>
      )}
    </div>
  );
}
