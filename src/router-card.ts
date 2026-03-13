import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { loadHaComponents } from '@kipk/load-ha-components';
import './router-card-editor';
import './cards/number-card';
import './cards/bar-card';
import './cards/graph-card';
import './cards/badge-card';
import './sections/status-section';
import './sections/update-section';
import './sections/list-section';
import { RouterCardConfig, SensorData, HistoryData } from './types/config';

const ICONS = {
  ROUTER: 'mdi:router-wireless',
  ACCESS_POINT: 'mdi:access-point',
  RESTART: 'mdi:restart'
};

@customElement('router-card')
export class RouterCard extends LitElement implements LovelaceCard {
  @property() public hass!: HomeAssistant;
  @state() private config!: RouterCardConfig;
  @state() private graphData: Record<string, HistoryData[]> = {};
  @state() private componentsLoaded = false;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('router-card-editor');
  }

  public static getStubConfig(): RouterCardConfig {
    return {
      type: 'custom:router-card',
      name: 'Router',
      icon: 'mdi:router-wireless',
      controller: true,
      theme: 'default',
      update_section: {
        enabled: true,
        entity: '',
        label: 'Update Available',
        tap_action: { action: 'more-info' },
      },
      status_section: {
        enabled: true,
        left_entity: '',
        left_label: 'WAN Status',
        right_entity: '',
        right_label: 'WAN IP',
        tap_action: { action: 'more-info' },
      },
      reboot_button: {
        enabled: false,
        entity: '',           // заменяем service на entity
        confirmation: true,
        label: 'Reboot',
        icon: 'mdi:restart',
      },
      top_sensors: [],
      bottom_sensors: [],
    };
  }

  public setConfig(config: RouterCardConfig): void {
    this.config = { ...config };
    this._fetchGraphData();
    this._loadComponents();
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

  protected shouldUpdate(changedProps: any): boolean {
    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (oldHass && this.config.top_sensors) {
        const graphSensors = this.config.top_sensors.filter(s => s.display_type === 'graph');
        for (const sensor of graphSensors) {
          const oldState = oldHass.states[sensor.entity];
          const newState = this.hass.states[sensor.entity];
          if (oldState && newState && oldState.state !== newState.state) {
            this._fetchGraphData();
            break;
          }
        }
      }
    }
    return true;
  }

  private async _fetchGraphData(): Promise<void> {
    if (!this.config.top_sensors || !this.hass) return;
    const graphSensors = this.config.top_sensors.filter(s => s.display_type === 'graph');
    if (graphSensors.length === 0) return;

    const newGraphData: Record<string, HistoryData[]> = {};
    for (const sensor of graphSensors) {
      const hours = sensor.hours_to_show || 24;
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      try {
        const history = await this.hass.callApi<HistoryData[][]>(
          'GET',
          `history/period/${startTime.toISOString()}?filter_entity_id=${sensor.entity}&end_time=${endTime.toISOString()}`
        );
        if (history && history[0]) {
          newGraphData[sensor.entity] = history[0];
        }
      } catch (e) {
        console.error('Failed to fetch history for', sensor.entity, e);
      }
    }
    this.graphData = { ...this.graphData, ...newGraphData };
    this.requestUpdate();
  }

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

  private _checkUpdateAvailable(entityId: string): boolean {
    if (!entityId || !this.hass.states[entityId]) return false;
    const state = this.hass.states[entityId];
    const domain = entityId.split('.')[0];
    if (domain === 'update') return state.state === 'on' || state.state === 'available';
    if (domain === 'binary_sensor') return state.state === 'on';
    return state.state === 'on' || state.state === 'true' || state.state === '1';
  }

  private _handleReboot(): void {
    const rebootConfig = this.config.reboot_button;
    if (!rebootConfig || !rebootConfig.enabled) return;
    const confirmation = rebootConfig.confirmation !== false;
    if (confirmation && !confirm('Are you sure you want to reboot the router?')) return;
    
    const entity = rebootConfig.entity;
    if (!entity) return;
    
    // Определяем домен из entity_id
    const domain = entity.split('.')[0];
    
    // Для button entities используем сервис press
    if (domain === 'button') {
      this.hass.callService('button', 'press', {
        entity_id: entity
      });
    } 
    // Для script entities используем сервис script.turn_on или просто script.название
    else if (domain === 'script') {
      this.hass.callService('script', 'turn_on', {
        entity_id: entity
      });
    }
    // Для остальных случаев пробуем вызвать сервис напрямую
    else {
      const [serviceDomain, serviceName] = entity.split('.');
      this.hass.callService(serviceDomain, serviceName, rebootConfig.service_data || {});
    }
  }

  private _handleTap(action?: any, entityId?: string): void {
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

  private _renderSensorCard(sensor: any, data: SensorData) {
    const props = {
      sensor,
      data,
      hass: this.hass,
      graphData: this.graphData,
      onClick: this._handleTap.bind(this)
    };

    switch (sensor.display_type) {
      case 'bar':
        return html`<router-bar-card .sensor=${sensor} .data=${data} .onClick=${this._handleTap.bind(this)}></router-bar-card>`;
      case 'graph':
        return html`<router-graph-card 
          .sensor=${sensor} 
          .data=${data} 
          .graphData=${this.graphData}
          .hass=${this.hass}  // ← добавляем передачу hass
          .onClick=${this._handleTap.bind(this)}>
        </router-graph-card>`;
      case 'badge':
        return html`<router-badge-card .sensor=${sensor} .data=${data} .onClick=${this._handleTap.bind(this)}></router-badge-card>`;
      case 'number':
      default:
        return html`<router-number-card .sensor=${sensor} .data=${data} .onClick=${this._handleTap.bind(this)}></router-number-card>`;
    }
  }

  protected render() {
    if (!this.config || !this.hass) {
      return html`<ha-card><div class="loading">Loading...</div></ha-card>`;
    }
    
    const icon = this.config.icon || (this.config.controller ? ICONS.ROUTER : ICONS.ACCESS_POINT);
    const leftData = this.config.status_section?.left_entity ? this._getSensorState(this.config.status_section.left_entity) : null;
    const rightData = this.config.status_section?.right_entity ? this._getSensorState(this.config.status_section.right_entity) : null;
    const showUpdate = this.config.update_section?.enabled && 
                      this.config.update_section.entity && 
                      this._checkUpdateAvailable(this.config.update_section.entity);

    return html`
      <ha-card class="router-card ${this.config.theme || 'default'}">
        <div class="header">
          <div class="header-left">
            <ha-icon icon="${icon}"></ha-icon>
            <div class="title-container">
              <span class="title">${this.config.name || 'Router'}</span>
            </div>
            ${this.config.controller 
              ? html`<span class="badge controller">Controller</span>` 
              : html`<span class="badge repeater">Repeater</span>`}
          </div>
          <div class="header-right">
            ${this.config.reboot_button?.enabled 
              ? html`<span class="badge reboot-badge" @click=${this._handleReboot}>
                  <ha-icon icon="${this.config.reboot_button.icon || ICONS.RESTART}"></ha-icon>
                  ${this.config.reboot_button.label || 'Reboot'}
                </span>` 
              : nothing}
          </div>
        </div>

        <!-- Update Section -->
        <router-update-section
          .enabled=${this.config.update_section?.enabled || false}
          .config=${this.config.update_section || {}}
          .updateAvailable=${showUpdate}
          .tap_action=${this.config.update_section?.tap_action}
          .onClick=${this._handleTap.bind(this)}
        ></router-update-section>

        <!-- Status Section -->
        <router-status-section
          .enabled=${this.config.status_section?.enabled || false}
          .config=${this.config.status_section || {}}
          .leftData=${leftData}
          .rightData=${rightData}
          .tap_action=${this.config.status_section?.tap_action}
          .onClick=${this._handleTap.bind(this)}
        ></router-status-section>

        <!-- Top Sensors (Cards) -->
        ${this.config.top_sensors && this.config.top_sensors.length > 0 ? html`
          <div class="top-section">
            <div class="cards-grid">
              ${this.config.top_sensors.map((sensor) => {
                const data = this._getSensorState(sensor.entity);
                if (!data) {
                  return html`
                    <div class="card-item error">
                      <div class="card-header">
                        <ha-icon icon="mdi:alert"></ha-icon>
                        <span class="card-name">${sensor.name}</span>
                      </div>
                      <div class="card-value error">Entity not found</div>
                    </div>
                  `;
                }
                return this._renderSensorCard(sensor, data);
              })}
            </div>
          </div>
        ` : nothing}

        <!-- Bottom Sensors (List) - всегда с отступом сверху -->
        <div class="list-section-wrapper">
          <router-list-section
            .enabled=${(this.config.bottom_sensors?.length || 0) > 0}
            .sensors=${this.config.bottom_sensors || []}
            .hass=${this.hass}
            .onClick=${this._handleTap.bind(this)}
          ></router-list-section>
        </div>
    `;
  }

  static get styles() {
    return css`
      :host { display: block; }
      
      ha-card {
        padding: 16px;
        background: var(--card-background-color, #ffffff);
        border-radius: 12px;
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
      }
      
      .router-card.dark { background: #1a1a2e; color: #ffffff; }
      .router-card.light { background: #ffffff; color: #333333; }
      
      .loading {
        padding: 20px;
        text-align: center;
        color: var(--secondary-text-color);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0; /* Позволяет flex-элементам сжиматься */
        flex: 1;
      }
      
      .header-left ha-icon { 
        --mdc-icon-size: 28px; 
        color: var(--primary-color, #03a9f4);
        flex-shrink: 0; /* Запрещаем сжимать иконку */
      }
      
      .title-container {
        min-width: 0; /* Позволяет контейнеру сжиматься */
        flex: 0 1 auto; /* Может сжиматься, но не растягиваться */
      }
      
      .title {
        font-size: 18px;
        font-weight: 600;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      
      .badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0; /* Запрещаем сжимать бейджи */
      }
      
      .badge.controller {
        background: #27ae60;
        color: white;
      }
      
      .badge.repeater {
        background: #3498db;
        color: white;
      }
      
      .header-right {
        display: flex;
        align-items: center;
        gap: 4px; /* Минимальное расстояние между элементами */
        flex-shrink: 0;
        margin-left: 4px; /* Дополнительный отступ слева для минимального расстояния */
      }
      
      .badge.reboot-badge { 
        background: #e74c3c;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
        padding: 4px 10px;
      }
      
      .badge.reboot-badge:hover {
        background: #c0392b;
        transform: scale(1.05);
      }
      
      .badge.reboot-badge ha-icon { 
        --mdc-icon-size: 14px; 
        color: white; 
      }
      
      .top-section {
        margin-top: 16px;
      }
      
      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }
      
      .card-item.error {
        background: var(--secondary-background-color, #f5f5f5);
        border: 1px solid #e74c3c;
        opacity: 0.7;
        padding: 14px;
        border-radius: 10px;
      }
      
      .dark .card-item.error {
        background: #16213e;
      }
      
      .card-item .card-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 0 8px 0;
      }
      
      .card-item .card-header ha-icon { 
        --mdc-icon-size: 16px; 
        color: var(--secondary-text-color, #666); 
      }
      
      .dark .card-item .card-header ha-icon {
        color: #aaa;
      }
      
      .card-item .card-name { 
        font-size: 12px;
        color: var(--secondary-text-color, #666);
        font-weight: 500;
      }
      
      .dark .card-item .card-name {
        color: #aaa;
      }
      
      .card-item .card-value.error {
        color: #e74c3c;
        font-size: 12px;
      }
      
      .list-section-wrapper {
        margin-top: 16px;
      }

      /* Адаптивность для мобильных */
      @media (max-width: 600px) {
        ha-card {
          padding: 12px;
        }
        
        .cards-grid {
          grid-template-columns: 1fr;
        }
        
        .badge.reboot-badge {
          padding: 4px 8px;
          font-size: 10px;
        }
        
        .header-left {
          gap: 6px;
        }
        
        .title {
          font-size: 16px;
        }
        
        .badge {
          padding: 3px 6px;
          font-size: 10px;
        }
      }
    `;
  }

  public getCardSize(): number {
    let size = 2;
    
    if (this.config.top_sensors) {
      size += Math.ceil(this.config.top_sensors.length / 2);
    }
    
    if (this.config.bottom_sensors) {
      size += Math.ceil(this.config.bottom_sensors.length / 4);
    }
    
    if (this.config.update_section?.enabled) size += 1;
    if (this.config.status_section?.enabled) size += 1;
    
    return size;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-card': RouterCard;
  }
}