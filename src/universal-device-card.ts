// universal-device-card.ts
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { loadHaComponents } from '@kipk/load-ha-components';
import { getLocalizedStringForHass } from './localization';
import './universal-device-card-editor';
import './sections/update-section';
import { UniversalDeviceCardConfig } from './types/config';

const DEFAULT_ICON = 'mdi:devices';

@customElement('universal-device-card')
export class UniversalDeviceCard extends LitElement implements LovelaceCard {
  @property() public hass?: HomeAssistant;
  @state() private config!: UniversalDeviceCardConfig;
  @state() private componentsLoaded = false;
  @state() private childCards: any[] = [];
  @state() private deviceName?: string;
  @state() private deviceModel?: string;

  private _t(key: string): string {
    return getLocalizedStringForHass(this.hass, key);
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('universal-device-card-editor');
  }

  public static getStubConfig(): UniversalDeviceCardConfig {
    return {
      type: 'custom:universal-device-card',
      name: '',
      icon: DEFAULT_ICON,
      device_id: '',
      update_section: {
        enabled: true,
        entity: '',
        tap_action: { action: 'more-info' },
      },
      action_button: {
        enabled: false,
        entity: '',
        confirmation: true,
        icon: 'mdi:restart',
        label: 'Reboot',
        tap_action: { action: 'call-service' },
      },
      cards: [],
    };
  }

  public setConfig(config: UniversalDeviceCardConfig): void {
    const migratedConfig = { ...config };
    
    delete migratedConfig.controller;
    
    if ((config as any).reboot_button && !config.action_button) {
      migratedConfig.action_button = (config as any).reboot_button;
      delete (migratedConfig as any).reboot_button;
    }
    
    this.config = migratedConfig;
    
    this._updateDeviceInfo();
    
    this._loadComponents();
    this._createChildCards();
  }

  private _updateDeviceInfo(): void {
    if (!this.hass || !this.config.device_id) {
      this.deviceName = undefined;
      this.deviceModel = undefined;
      return;
    }
    
    const device = this.hass.devices[this.config.device_id];
    if (device) {
      this.deviceName = device.name_by_user || device.name;
      const modelParts = [device.manufacturer, device.model, device.model_id].filter(Boolean);
      this.deviceModel = modelParts.join(' ') || undefined;
    } else {
      this.deviceName = undefined;
      this.deviceModel = undefined;
    }
  }

  private async _loadComponents() {
    try {
      await loadHaComponents();
      this.componentsLoaded = true;
      this.requestUpdate();
    } catch (e) {
      console.warn('Failed to load HA components:', e);
    }
  }

  private async _createChildCards() {
    if (!this.config.cards || !this.config.cards.length) {
      this.childCards = [];
      return;
    }
    
    const helpers = await (window as any).loadCardHelpers();
    const cards: any[] = [];
    
    for (const cardConfig of this.config.cards) {
      try {
        const element = helpers.createCardElement(cardConfig);
        if (this.hass) {
          element.hass = this.hass;
        }
        element.addEventListener('ll-rebuild', () => {
          this._createChildCards();
        });
        cards.push(element);
      } catch (e) {
        console.error('Failed to create card:', cardConfig, e);
      }
    }
    this.childCards = cards;
    
    await this.updateComplete;
    setTimeout(() => {
      this._styleCards();
    }, 100);
    
    this.requestUpdate();
  }

  private _styleCards() {
    this.childCards.forEach((card) => {
      this._styleCard(card, 0);
    });
  }

  private _styleCard(element: any, depth: number = 0) {
    if (!element) return;

    const cardType = element.localName || element.tagName?.toLowerCase();
    
    const stackTypes = [
      'hui-horizontal-stack-card',
      'hui-vertical-stack-card', 
      'vertical-stack',
      'horizontal-stack',
      'hui-stack-card'
    ];
    
    const isStack = stackTypes.includes(cardType);
    
    if (isStack) {
      if (element.shadowRoot) {
        const possibleContainers = [
          '.card-content', '.content', '.vertical-stack', '.horizontal-stack', 
          '#root', '#card', '.container', '.cards'
        ];
        
        for (const selector of possibleContainers) {
          const container = element.shadowRoot.querySelector(selector);
          if (container && container.children) {
            for (let i = 0; i < container.children.length; i++) {
              this._styleCard(container.children[i], depth + 1);
            }
            break;
          }
        }
        
        const allChildren = element.shadowRoot.children;
        for (let i = 0; i < allChildren.length; i++) {
          this._styleCard(allChildren[i], depth + 1);
        }
      }
      
      if (element.children) {
        for (let i = 0; i < element.children.length; i++) {
          this._styleCard(element.children[i], depth + 1);
        }
      }
      return;
    }
    
    const bgColor = 'var(--secondary-background-color, #f5f5f5)';
    
    if (element.style) {
      element.style.background = bgColor;
      element.style.borderRadius = '8px';
      element.style.margin = '0';
      element.style.boxShadow = 'none';
      element.style.border = 'none';
    }
    
    if (element.shadowRoot) {
      const haCard = element.shadowRoot.querySelector('ha-card');
      if (haCard) {
        haCard.style.background = bgColor;
        haCard.style.borderRadius = '8px';
        haCard.style.boxShadow = 'none';
        haCard.style.border = 'none';
      }
      
      const allElements = element.shadowRoot.querySelectorAll('*');
      allElements.forEach((el: any) => {
        if (el.style && (el.tagName === 'HA-CARD' || el.classList?.contains('card'))) {
          el.style.background = bgColor;
          el.style.borderRadius = '8px';
          el.style.boxShadow = 'none';
          el.style.border = 'none';
        }
      });
    }
    
    if (element.children) {
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        if (child && child !== element) {
          this._styleCard(child, depth + 1);
        }
      }
    }
  }

  private _updateChildCardsHass() {
    if (this.childCards && this.hass) {
      this.childCards.forEach(card => {
        card.hass = this.hass;
      });
      setTimeout(() => {
        this._styleCards();
      }, 100);
    }
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._updateDeviceInfo();
    this._updateChildCardsHass();
    this.requestUpdate();
  }

  public get hass(): HomeAssistant {
    return this._hass as HomeAssistant;
  }

  private _hass?: HomeAssistant;

  private _handleAction(): void {
    const button = this.config.action_button;
    if (!button || !button.enabled) return;
    
    const confirmation = button.confirmation !== false;
    if (confirmation && !confirm(button.label || 'Confirm action?')) return;
    
    if (button.tap_action && button.tap_action.action !== 'none') {
      this._handleTap(button.tap_action, button.entity);
      return;
    }
    
    const entity = button.entity;
    if (!entity || !this.hass) return;
    
    const domain = entity.split('.')[0];
    
    if (domain === 'button') {
      this.hass.callService('button', 'press', { entity_id: entity });
    } else if (domain === 'script') {
      this.hass.callService('script', 'turn_on', { entity_id: entity });
    } else {
      const [serviceDomain, serviceName] = entity.split('.');
      this.hass.callService(serviceDomain, serviceName, button.service_data || {});
    }
  }

  private _handleUpdate(): void {
    const updateSection = this.config.update_section;
    if (!updateSection || !updateSection.enabled) return;
    
    if (updateSection.tap_action && updateSection.tap_action.action !== 'none') {
      this._handleTap(updateSection.tap_action, updateSection.entity);
    } else if (updateSection.entity) {
      this.dispatchEvent(new CustomEvent('hass-more-info', {
        bubbles: true, composed: true, detail: { entityId: updateSection.entity },
      }));
    }
  }

  private _handleTap(action?: any, entityId?: string): void {
    if (!this.hass) return;
    
    if (!action || action.action === 'none') {
      if (entityId) {
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true, composed: true, detail: { entityId },
        }));
      }
      return;
    }
    
    switch (action.action) {
      case 'more-info':
        if (entityId) {
          this.dispatchEvent(new CustomEvent('hass-more-info', {
            bubbles: true, composed: true, detail: { entityId },
          }));
        }
        break;
      case 'navigate':
        if (action.navigation_path) {
          history.pushState(null, '', action.navigation_path);
          this.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
        }
        break;
      case 'url':
        if (action.url_path) window.open(action.url_path, '_blank');
        break;
      case 'call-service':
        if (action.service) {
          const [domain, service] = action.service.split('.');
          this.hass.callService(domain, service, action.service_data || {});
        }
        break;
      case 'toggle':
        if (entityId) this.hass.callService('homeassistant', 'toggle', { entity_id: entityId });
        break;
    }
  }

  private _checkUpdateAvailable(entityId: string): boolean {
    if (!this.hass || !entityId || !this.hass.states[entityId]) return false;
    const state = this.hass.states[entityId];
    const domain = entityId.split('.')[0];
    if (domain === 'update') return state.state === 'on' || state.state === 'available';
    if (domain === 'binary_sensor') return state.state === 'on';
    return state.state === 'on' || state.state === 'true' || state.state === '1';
  }

  private _getDisplayName(): string {
    if (this.config.name && this.config.name.trim()) {
      return this.config.name;
    }
    
    if (this.config.device_id && this.hass?.devices[this.config.device_id]) {
      const device = this.hass.devices[this.config.device_id];
      const modelParts = [device.manufacturer, device.model, device.model_id].filter(Boolean);
      const model = modelParts.join(' ');
      if (model) {
        return model;
      }
      return device.name_by_user || device.name || 'Device';
    }
    
    return 'Device';
  }

  private _getManufacturer(): string {
    if (this.config.device_id && this.hass?.devices[this.config.device_id]) {
      const device = this.hass.devices[this.config.device_id];
      return device.manufacturer || '';
    }
    return '';
  }

  protected render() {
    if (!this.config || !this.hass || !this.componentsLoaded) {
      return html`<ha-card><div class="loading">Loading...</div></ha-card>`;
    }
    
    const icon = this.config.icon || DEFAULT_ICON;
    const showUpdate = this.config.update_section?.enabled && 
                      this.config.update_section.entity && 
                      this._checkUpdateAvailable(this.config.update_section.entity);
    
    const displayName = this._getDisplayName();
    const manufacturer = this._getManufacturer();
    const updateLabel = this.config.update_section?.label || 'Update';

    return html`
      <ha-card class="device-card">
        <div class="header">
          <div class="header-content">
            <div class="header-left">
              <ha-icon icon="${icon}"></ha-icon>
              <div class="title-container">
                <div class="title">${displayName}</div>
                ${manufacturer ? html`<div class="manufacturer">${manufacturer}</div>` : nothing}
              </div>
            </div>
            <div class="header-right">
              ${showUpdate ? html`
                <div class="badge update-badge" @click=${this._handleUpdate}>
                  <ha-icon icon="mdi:update"></ha-icon>
                  <span>${updateLabel}</span>
                </div>
              ` : nothing}
              ${this.config.action_button?.enabled 
                ? html`<div class="badge action-badge" @click=${this._handleAction}>
                    <ha-icon icon="${this.config.action_button.icon || 'mdi:restart'}"></ha-icon>
                    <span>${this.config.action_button.label || 'Reboot'}</span>
                  </div>` 
                : nothing}
            </div>
          </div>
        </div>

        <!-- Cards Container -->
        <div class="cards-container">
          ${this.childCards.map(card => html`${card}`)}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host { display: block; }
      
      ha-card {
        background: var(--card-background-color, #ffffff);
        border-radius: 12px;
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
        overflow: hidden;
      }
      
      .loading {
        padding: 20px;
        text-align: center;
        color: var(--secondary-text-color);
      }

      .header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }
      
      .header-left ha-icon { 
        --mdc-icon-size: 24px; 
        color: var(--state-icon-color, #03a9f4);
        flex-shrink: 0;
      }
      
      .title-container {
        min-width: 0;
        flex: 1;
      }
      
      .title {
        font-size: 16px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .manufacturer {
        font-size: 11px;
        color: var(--secondary-text-color, #666);
        line-height: 1.3;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .header-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      
      .badge {
        cursor: pointer;
        transition: all 0.2s;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      
      .badge:hover {
        filter: brightness(0.9);
      }
      
      .badge ha-icon { 
        --mdc-icon-size: 14px; 
      }
      
      .badge span {
        line-height: 1;
      }
      
      .action-badge { 
        background: var(--primary-color, #03a9f4);
        color: white;
      }
      
      .action-badge ha-icon {
        color: white;
      }
      
      .update-badge {
        background: var(--warning-color, #ff9800);
        color: white;
      }
      
      .update-badge ha-icon {
        color: white;
      }

      .cards-container {
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      @media (max-width: 600px) {
        .header {
          padding: 10px 12px;
        }
        
        .header-left {
          gap: 10px;
        }
        
        .header-left ha-icon {
          --mdc-icon-size: 20px;
        }
        
        .title {
          font-size: 14px;
        }
        
        .manufacturer {
          font-size: 10px;
        }
        
        .cards-container {
          padding: 8px 12px;
          gap: 8px;
        }
        
        .badge {
          padding: 3px 6px;
          font-size: 10px;
        }
        
        .badge ha-icon {
          --mdc-icon-size: 12px;
        }
      }
    `;
  }

  public getCardSize(): number {
    let size = 1;
    
    if (this.childCards) {
      for (const card of this.childCards) {
        if (typeof card.getCardSize === 'function') {
          size += card.getCardSize();
        } else {
          size += 1;
        }
      }
    }
    
    return size;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'universal-device-card': UniversalDeviceCard;
  }
}