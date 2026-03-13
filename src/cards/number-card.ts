import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BaseCard } from './base-card';

@customElement('router-number-card')
export class NumberCard extends BaseCard {
  renderContent(): TemplateResult {
    const formatted = this.formatValue(this.data.state, this.sensor.unit || this.data.unit);
    const numValue = parseFloat(this.data.state);
    const valueColor = !isNaN(numValue) ? this.getValueColor(numValue, this.sensor.min, this.sensor.max) : undefined;
    
    return html`
      <div class="card-content">
        <div class="card-value" style="color: ${valueColor}">${formatted}</div>
        ${this.sensor.unit ? html`<div class="card-unit">${this.sensor.unit}</div>` : ''}
      </div>
    `;
  }

  static get styles() {
    return [
      this.baseStyles,
      css`
        .card {
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
          padding: 0;
          transition: all 0.2s ease;
        }

        .dark .card {
          background: #16213e;
        }

        .card-content {
          width: 100%;
          padding: 0;
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: center;
          align-items: center;
          min-height: calc(100% - 40px); /* Учитываем высоту заголовка */
        }

        .card-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--primary-text-color);
          padding: 4px 12px 0 12px;
          text-align: center;
          line-height: 1.2;
          word-break: break-word;
        }

        .card-unit {
          font-size: 11px;
          color: var(--secondary-text-color);
          padding: 2px 12px 8px 12px;
          text-align: center;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Стили для разных размеров графика, чтобы сохранить одинаковую высоту */
        .card[data-detail="1"] .card-content {
          min-height: 36px;
        }

        .card[data-detail="2"] .card-content {
          min-height: 45px;
        }

        .card[data-detail="3"] .card-content {
          min-height: 60px;
        }

        /* Адаптивность для мобильных */
        @media (max-width: 600px) {
          .card-value {
            font-size: 20px;
          }
        }

        @media (max-width: 350px) {
          .card-value {
            font-size: 18px;
          }
        }
      `
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-number-card': NumberCard;
  }
}