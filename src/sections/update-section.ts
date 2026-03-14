import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseSection } from './base-section';
import { getLocalizedStringForHass } from '../localization';

@customElement('router-update-section')
export class UpdateSection extends BaseSection {
  @property({ type: Object }) config: any;
  @property({ type: Boolean }) updateAvailable: boolean = false;
  @property({ type: Object }) hass?: any;

  private _localize(key: string, params?: Record<string, string>): string {
    return getLocalizedStringForHass(this.hass, key, params);
  }

  renderContent(): TemplateResult {
    if (!this.updateAvailable) return html``;

    const label = this.config.label || this._localize('update.available');

    return html`
      <div class="update-section" @click=${(e: Event) => this._handleClick(e, this.config.entity)}>
        <ha-icon icon="mdi:arrow-up-circle"></ha-icon>
        <span>${label}</span>
      </div>
    `;
  }

  static get styles() {
    return [
      this.baseStyles,
      css`
        .update-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          margin-bottom: 16px;
          background: rgba(243, 156, 28, 0.2);
          border: 1px solid rgba(243, 156, 28, 0.5);
          border-radius: 8px;
          color: #f39c12;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .update-section:hover {
          background: rgba(243, 156, 28, 0.3);
          transform: scale(1.02);
        }

        .dark .update-section {
          background: rgba(243, 156, 28, 0.15);
        }

        ha-icon {
          --mdc-icon-size: 18px;
          color: #f39c12;
        }
      `
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-update-section': UpdateSection;
  }
}