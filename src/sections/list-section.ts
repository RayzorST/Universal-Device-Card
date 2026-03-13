import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseSection } from './base-section';
import { SensorConfig, SensorData } from '../types/config';

@customElement('router-list-section')
export class ListSection extends BaseSection {
  @property({ type: Array }) sensors: SensorConfig[] = [];
  @property({ type: Object }) hass?: any;

  private _getSensorState(entityId: string): SensorData | null {
    if (!entityId || !this.hass || !this.hass.states) return null;
    const state = this.hass.states[entityId];
    if (!state) return null;
    
    return {
      state: state.state,
      attributes: state.attributes,
      unit: state.attributes?.unit_of_measurement,
    };
  }

  private _formatValue(value: string, unit?: string): string {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return `${value}${unit || ''}`;
    
    if (unit === 'GB' || unit === 'TB') {
      return `${numValue.toFixed(2)} ${unit}`;
    }
    if (unit === '%' || unit === '°C') {
      return `${numValue.toFixed(1)}${unit}`;
    }
    if (numValue > 86400 && !unit) {
      const days = Math.floor(numValue / 86400);
      const hours = Math.floor((numValue % 86400) / 3600);
      const minutes = Math.floor((numValue % 3600) / 60);
      const parts: string[] = [];
      if (days > 0) parts.push(`${days}д`);
      if (hours > 0) parts.push(`${hours}ч`);
      if (minutes > 0 || parts.length === 0) parts.push(`${minutes}м`);
      return parts.join(' ');
    }
    
    // Для очень больших чисел используем сокращение
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M${unit || ''}`;
    }
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K${unit || ''}`;
    }
    
    return `${numValue}${unit || ''}`;
  }

  renderContent(): TemplateResult {
    if (!this.sensors.length) return html``;

    return html`
      <div class="list-section">
        <div class="list-grid">
          ${this.sensors.map((sensor) => {
            const data = this._getSensorState(sensor.entity);
            
            if (!data) {
              return html`
                <div class="list-item error">
                  <div class="list-left">
                    <ha-icon icon="mdi:alert"></ha-icon>
                    <span class="list-name">${sensor.name}</span>
                  </div>
                  <span class="list-value error">N/A</span>
                </div>
              `;
            }
            
            const displayValue = this._formatValue(data.state, sensor.unit || data.unit);
            const isClickable = sensor.tap_action && sensor.tap_action.action !== 'none';

            return html`
              <div class="list-item ${isClickable ? 'clickable' : ''}" 
                  @click=${(e: Event) => this._handleClick(e, sensor.entity)}>
                <div class="list-left">
                  ${sensor.icon ? html`<ha-icon icon="${sensor.icon}"></ha-icon>` : nothing}
                  <span class="list-name">${sensor.name}</span>
                </div>
                <span class="list-value" title="${displayValue}">${displayValue}</span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  static get styles() {
    return [
      this.baseStyles,
      css`
        .list-section {
          width: 100%;
          margin-top: 16px;
          overflow: hidden; /* Предотвращает вылезание контента */
        }

        .list-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          width: 100%;
        }

        /* Планшеты и маленькие экраны */
        @media (max-width: 800px) {
          .list-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Мобильные устройства */
        @media (max-width: 600px) {
          .list-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Очень узкие карточки */
        @media (max-width: 350px) {
          .list-grid {
            grid-template-columns: 1fr;
          }
        }

        .list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 8px;
          transition: all 0.2s ease;
          min-width: 0; /* Важно для правильного сжатия */
          width: 100%;
          box-sizing: border-box;
        }

        .list-item.error {
          border: 1px solid #e74c3c;
          opacity: 0.7;
        }

        .list-item.clickable {
          cursor: pointer;
        }

        .list-item.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .dark .list-item {
          background: #16213e;
        }

        .list-left {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          flex: 1;
          min-width: 0; /* Позволяет сжиматься */
        }

        .list-left ha-icon { 
          --mdc-icon-size: 16px; 
          color: var(--secondary-text-color, #666); 
          flex-shrink: 0;
        }

        .dark .list-left ha-icon {
          color: #aaa;
        }

        .list-name {
          font-size: 13px;
          color: var(--primary-text-color, #333);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 30px; /* Минимальная ширина для имени */
        }

        .dark .list-name {
          color: #fff;
        }

        .list-value {
          font-size: 14px;
          font-weight: 400;
          color: var(--primary-text-color, #333);
          white-space: nowrap;
          margin-left: 8px;
          flex-shrink: 0;
          max-width: 120px; /* Ограничиваем максимальную ширину значения */
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
        }

        /* Для очень маленьких экранов уменьшаем размер значения */
        @media (max-width: 400px) {
          .list-value {
            max-width: 80px;
            font-size: 12px;
          }
          
          .list-name {
            font-size: 12px;
          }
        }

        .list-value.error {
          color: #e74c3c;
          font-weight: 400;
        }

        /* Если карточка становится слишком узкой, меняем структуру */
        @media (max-width: 250px) {
          .list-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          
          .list-left {
            width: 100%;
          }
          
          .list-value {
            margin-left: 24px; /* Выравниваем с учетом иконки */
            width: calc(100% - 24px);
            max-width: none;
            text-align: left;
          }
        }
      `
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-list-section': ListSection;
  }
}