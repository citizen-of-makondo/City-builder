import { buildingDefs } from '../../sim/content/buildings';
import { useUiStore } from '../../app/store';
import { t } from '../../i18n';

/** Панель строительства: выбор типа здания включает режим размещения. */
export function BuildPanel() {
  const buildDefId = useUiStore((s) => s.buildDefId);
  const setBuildDefId = useUiStore((s) => s.setBuildDefId);

  return (
    <div className="build-panel">
      <span className="build-panel-title">{t('panel.build.title')}</span>
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
      {buildDefId !== null && <span className="build-hint">{t('panel.build.cancel_hint')}</span>}
    </div>
  );
}
