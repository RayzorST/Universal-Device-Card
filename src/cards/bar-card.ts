import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BaseCard } from './base-card';

@customElement('router-bar-card')
export class BarCard extends BaseCard {
  private _calculateBarValue(): number {
    const value = parseFloat(this.data.state);
    if (isNaN(value)) return 0;
    
    const min = this.sensor.min ?? 0;
    const max = this.sensor.max ?? 100;
    
    return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  }

  renderContent(): TemplateResult {
    const barValue = this._calculateBarValue();
    const formatted = this.formatValue(this.data.state, this.sensor.unit || this.data.unit);
    
    return html`
      <div class="card-value">${formatted}</div>
      <div class="card-bar-container">
        <div class="card-bar">
          <div class="card-bar-fill" style="width: ${barValue}%"></div>
        </div>
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

        .card-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--primary-text-color);
          padding: 0 12px 4px 12px; /* Убрал верхний padding, уменьшил нижний */
          text-align: left;
          line-height: 1.2;
          word-break: break-word;
        }

        .card-bar-container {
          padding: 0 12px 12px 12px;
          width: 100%;
          box-sizing: border-box;
          flex: 1; /* Даем бару больше места */
          display: flex;
          align-items: flex-end; /* Выравниваем бар по нижнему краю */
        }

        .card-bar {
          height: 20px; /* Увеличил высоту с 8px до 12px */
          background: rgba(224, 224, 224, 0.5);
          border-radius: 6px; /* Увеличил радиус для пропорциональности */
          overflow: hidden;
          width: 100%;
        }

        .dark .card-bar {
          background: rgba(42, 42, 74, 0.7);
        }

        .card-bar-fill {
          height: 100%;
          border-radius: 6px; /* Увеличил радиус для пропорциональности */
          transition: width 0.3s ease;
          background: var(--primary-color, #03a9f4);
        }

        /* Адаптивность для мобильных */
        @media (max-width: 600px) {
          .card-value {
            font-size: 20px;
            padding: 0 12px 2px 12px; /* Еще меньше отступ на мобильных */
          }
          
          .card-bar {
            height: 10px; /* Уменьшил, но все еще больше оригинала */
          }
          
          .card-bar-container {
            padding: 0 12px 10px 12px;
          }
        }

        @media (max-width: 350px) {
          .card-value {
            font-size: 18px;
          }
          
          .card-bar {
            height: 8px;
          }
        }
      `
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-bar-card': BarCard;
  }
}