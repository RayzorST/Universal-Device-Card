import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LovelaceCardEditor } from 'custom-card-helpers';
import { fireEvent } from 'custom-card-helpers';
import { RouterCardConfig, SensorConfig, UpdateSectionConfig, StatusSectionConfig, RebootButtonConfig } from './types/config';
import { getLocalizedStringForHass } from './localization';

const ICONS = {
  COG: 'mdi:cog',
  WAN: 'mdi:wan',
  VIEW_GRID: 'mdi:view-grid',
  FORMAT_LIST_BULLETED: 'mdi:format-list-bulleted',
  PLUS: 'mdi:plus',
  DELETE: 'mdi:delete',
  RESTART: 'mdi:restart'
};

type NestedConfigKey = 'update_section' | 'status_section' | 'reboot_button';

@customElement('router-card-editor')
export class RouterCardEditor extends LitElement implements LovelaceCardEditor {
  @property() public hass!: any;
  
  @state() private _config!: RouterCardConfig;
  @state() private _activeTab: 'general' | 'status' | 'top' | 'bottom' = 'general';
  @state() private _expandedSensors: Set<string> = new Set();

  private _localize(key: string, params?: Record<string, string>): string {
    return getLocalizedStringForHass(this.hass, key, params);
  }

  public setConfig(config: RouterCardConfig): void {
    console.log('Setting config:', config);
    this._config = {
      type: config.type,
      name: config.name || 'Router',
      icon: config.icon || 'mdi:router-wireless',
      controller: config.controller !== false,
      theme: config.theme || 'default',
      update_section: {
        enabled: true,
        entity: '',
        tap_action: { action: 'more-info' },
        ...config.update_section,
      },
      status_section: {
        enabled: true,
        left_entity: '',
        left_label: this._localize('status.status'),
        right_entity: '',
        right_label: this._localize('status.ip'),
        tap_action: { action: 'more-info' },
        ...config.status_section,
      },
      reboot_button: {
        enabled: false,
        entity: '',
        confirmation: true,
        icon: 'mdi:restart',
        ...config.reboot_button,
      },
      top_sensors: config.top_sensors || [],
      bottom_sensors: config.bottom_sensors || [],
    };
  }

  private _toggleSensor(section: string, index: number): void {
    const key = `${section}-${index}`;
    if (this._expandedSensors.has(key)) {
      this._expandedSensors.delete(key);
    } else {
      this._expandedSensors.add(key);
    }
    this.requestUpdate();
  }

  private _isSensorExpanded(section: string, index: number): boolean {
    return this._expandedSensors.has(`${section}-${index}`);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="editor">
        <!-- Tabs -->
        <div class="tabs">
          <button 
            class="tab ${this._activeTab === 'general' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('general')}
          >
            <ha-icon icon="${ICONS.COG}"></ha-icon>
            <span>${this._localize('tabs.general')}</span>
          </button>
          <button 
            class="tab ${this._activeTab === 'status' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('status')}
          >
            <ha-icon icon="${ICONS.WAN}"></ha-icon>
            <span>${this._localize('tabs.status')}</span>
          </button>
          <button 
            class="tab ${this._activeTab === 'top' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('top')}
          >
            <ha-icon icon="${ICONS.VIEW_GRID}"></ha-icon>
            <span>${this._localize('tabs.topCards')}</span>
          </button>
          <button 
            class="tab ${this._activeTab === 'bottom' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('bottom')}
          >
            <ha-icon icon="${ICONS.FORMAT_LIST_BULLETED}"></ha-icon>
            <span>${this._localize('tabs.bottomList')}</span>
          </button>
        </div>

        <!-- Tab Content -->
        ${this._renderTabContent()}
      </div>
    `;
  }

  private _renderTabContent() {
    switch (this._activeTab) {
      case 'general':
        return this._renderGeneralTab();
      case 'status':
        return this._renderStatusTab();
      case 'top':
        return this._renderSensorsTab('top_sensors', true);
      case 'bottom':
        return this._renderSensorsTab('bottom_sensors', false);
      default:
        return nothing;
    }
  }

  private _renderGeneralTab() {
    const updateSection = this._config.update_section!;
    const rebootConfig = this._config.reboot_button!;

    return html`
      <div class="tab-content">
        <!-- Basic Settings -->
        <div class="section">
          <h3>${this._localize('basic.title')}</h3>
          
          <ha-textfield
            .value=${this._config.name || ''}
            @input=${(e: any) => this._updateConfig('name', e.target.value)}
            label=${this._localize('basic.cardName')}
          ></ha-textfield>

          <ha-icon-picker
            .value=${this._config.icon || 'mdi:router-wireless'}
            @value-changed=${(e: any) => this._updateConfig('icon', e.detail.value)}
            label=${this._localize('basic.cardIcon')}
          ></ha-icon-picker>

          <ha-formfield label=${this._localize('basic.controllerMode')}>
            <ha-switch
              .checked=${this._config.controller !== false}
              @change=${(e: any) => this._updateConfig('controller', e.target.checked)}
            ></ha-switch>
          </ha-formfield>

          <ha-select
            .value=${this._config.theme || 'default'}
            @selected=${(e: any) => this._updateConfig('theme', e.target.value)}
            label=${this._localize('basic.theme')}
          >
            <ha-list-item value="default">${this._localize('basic.themeDefault')}</ha-list-item>
            <ha-list-item value="dark">${this._localize('basic.themeDark')}</ha-list-item>
            <ha-list-item value="light">${this._localize('basic.themeLight')}</ha-list-item>
          </ha-select>
        </div>

        <!-- Update Section -->
        <div class="section">
          <div class="section-header">
            <h3>${this._localize('update.title')}</h3>
            <ha-switch
              .checked=${updateSection.enabled !== false}
              @change=${(e: any) => this._updateNested('update_section', 'enabled', e.target.checked)}
            ></ha-switch>
          </div>

          ${updateSection.enabled ? html`
            <ha-entity-picker
              .hass=${this.hass}
              .value=${updateSection.entity || ''}
              @value-changed=${(e: any) => this._updateNested('update_section', 'entity', e.detail.value)}
              allow-custom-entity
              include-domains='["update", "binary_sensor"]'
            ></ha-entity-picker>

            <hui-action-editor
              .hass=${this.hass}
              .value=${updateSection.tap_action || { action: 'more-info' }}
              @value-changed=${(e: any) => this._updateNested('update_section', 'tap_action', e.detail.value)}
              label=${this._localize('common.tapAction')}
            ></hui-action-editor>
          ` : ''}
        </div>

        <!-- Reboot Button -->
        <div class="section">
          <div class="section-header">
            <h3>${this._localize('reboot.title')}</h3>
            <ha-switch
              .checked=${rebootConfig.enabled !== false}
              @change=${(e: any) => this._updateNested('reboot_button', 'enabled', e.target.checked)}
            ></ha-switch>
          </div>

          ${rebootConfig.enabled ? html`
            <ha-entity-picker
              .hass=${this.hass}
              .value=${rebootConfig.entity || ''}
              @value-changed=${(e: any) => this._updateNested('reboot_button', 'entity', e.detail.value)}
              allow-custom-entity
              include-domains='["button", "script"]'
            ></ha-entity-picker>

            <ha-icon-picker
              .value=${rebootConfig.icon || 'mdi:restart'}
              @value-changed=${(e: any) => this._updateNested('reboot_button', 'icon', e.detail.value)}
              label=${this._localize('reboot.icon')}
            ></ha-icon-picker>

            <ha-formfield label=${this._localize('reboot.confirmation')}>
              <ha-switch
                .checked=${rebootConfig.confirmation !== false}
                @change=${(e: any) => this._updateNested('reboot_button', 'confirmation', e.target.checked)}
              ></ha-switch>
            </ha-formfield>
          ` : ''}
        </div>
      </div>
    `;
  }

  private _renderStatusTab() {
    const status = this._config.status_section!;

    return html`
      <div class="tab-content">
        <div class="section">
          <div class="section-header">
            <h3>${this._localize('status.title')}</h3>
            <ha-switch
              .checked=${status.enabled !== false}
              @change=${(e: any) => this._updateNested('status_section', 'enabled', e.target.checked)}
            ></ha-switch>
          </div>

          ${status.enabled ? html`
            <h4>${this._localize('status.leftColumn')}</h4>
            
            <ha-entity-picker
              .hass=${this.hass}
              .value=${status.left_entity || ''}
              @value-changed=${(e: any) => this._updateNested('status_section', 'left_entity', e.detail.value)}
              allow-custom-entity
            ></ha-entity-picker>

            <ha-textfield
              .value=${status.left_label || ''}
              @input=${(e: any) => this._updateNested('status_section', 'left_label', e.target.value)}
              label=${this._localize('status.label')}
            ></ha-textfield>

            <h4>${this._localize('status.rightColumn')}</h4>
            
            <ha-entity-picker
              .hass=${this.hass}
              .value=${status.right_entity || ''}
              @value-changed=${(e: any) => this._updateNested('status_section', 'right_entity', e.detail.value)}
              allow-custom-entity
            ></ha-entity-picker>

            <ha-textfield
              .value=${status.right_label || ''}
              @input=${(e: any) => this._updateNested('status_section', 'right_label', e.target.value)}
              label=${this._localize('status.label')}
            ></ha-textfield>

            <hui-action-editor
              .hass=${this.hass}
              .value=${status.tap_action || { action: 'more-info' }}
              @value-changed=${(e: any) => this._updateNested('status_section', 'tap_action', e.detail.value)}
              label=${this._localize('common.tapAction')}
            ></hui-action-editor>
          ` : ''}
        </div>
      </div>
    `;
  }

  private _renderSensorsTab(section: 'top_sensors' | 'bottom_sensors', isTop: boolean) {
    const sensors = this._config[section] || [];

    return html`
      <div class="tab-content">
        <div class="section">
          <div class="sensors-header">
            <h3>${isTop ? this._localize('tabs.topCards') : this._localize('tabs.bottomList')}</h3>
            <ha-button @click=${() => this._addSensor(section)}>
              <ha-icon icon="${ICONS.PLUS}" slot="icon"></ha-icon>
              ${this._localize('sensors.add')}
            </ha-button>
          </div>

          ${sensors.length === 0 ? html`
            <div class="empty-state">${this._localize('sensors.empty')}</div>
          ` : sensors.map((sensor, index) => this._renderSensor(section, sensor, index, isTop))}
        </div>
      </div>
    `;
  }

  private _renderSensor(section: 'top_sensors' | 'bottom_sensors', sensor: SensorConfig, index: number, isTop: boolean) {
    const isExpanded = this._isSensorExpanded(section, index);

    return html`
      <div class="sensor-item">
        <div class="sensor-header" @click=${() => this._toggleSensor(section, index)}>
          <div class="sensor-title">
            <ha-icon icon="${isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}"></ha-icon>
            <span>${sensor.name || this._localize('sensors.unnamed')}</span>
            ${sensor.icon ? html`<ha-icon icon="${sensor.icon}" class="sensor-icon"></ha-icon>` : ''}
            ${sensor.unit ? html`<span class="sensor-unit">(${sensor.unit})</span>` : ''}
          </div>
          <ha-icon-button @click=${(e: Event) => { e.stopPropagation(); this._removeSensor(section, index); }}>
            <ha-icon icon="${ICONS.DELETE}"></ha-icon>
          </ha-icon-button>
        </div>

        ${isExpanded ? html`
          <div class="sensor-content">
            <ha-entity-picker
              .hass=${this.hass}
              .value=${sensor.entity || ''}
              @value-changed=${(e: any) => this._updateSensor(section, index, 'entity', e.detail.value)}
              allow-custom-entity
            ></ha-entity-picker>

            <ha-textfield
              .value=${sensor.name || ''}
              @input=${(e: any) => this._updateSensor(section, index, 'name', e.target.value)}
              label=${this._localize('sensors.displayName')}
            ></ha-textfield>

            <ha-icon-picker
              .value=${sensor.icon || ''}
              @value-changed=${(e: any) => this._updateSensor(section, index, 'icon', e.detail.value)}
              label=${this._localize('sensors.icon')}
            ></ha-icon-picker>

            <ha-textfield
              .value=${sensor.unit || ''}
              @input=${(e: any) => this._updateSensor(section, index, 'unit', e.target.value)}
              label=${this._localize('sensors.unit')}
            ></ha-textfield>

            ${isTop ? html`
              <!-- Display Type Selection -->
              <ha-select
                .value=${sensor.display_type || 'bar'}
                @selected=${(e: any) => this._updateSensor(section, index, 'display_type', e.target.value)}
                label=${this._localize('sensors.displayType')}
              >
                <ha-list-item value="bar">${this._localize('sensors.types.bar')}</ha-list-item>
                <ha-list-item value="graph">${this._localize('sensors.types.graph')}</ha-list-item>
              </ha-select>

              ${sensor.display_type === 'graph' ? html`
                <!-- Graph Detail -->
                <ha-select
                  .value=${String(sensor.graph_detail || 2)}
                  @selected=${(e: any) => {
                    const value = parseInt(e.target.value) as 1 | 2 | 3;
                    this._updateSensor(section, index, 'graph_detail', value);
                  }}
                  label=${this._localize('sensors.graphDetail')}
                >
                  <ha-list-item value="1">${this._localize('sensors.graphDetailLow')}</ha-list-item>
                  <ha-list-item value="2">${this._localize('sensors.graphDetailMedium')}</ha-list-item>
                  <ha-list-item value="3">${this._localize('sensors.graphDetailHigh')}</ha-list-item>
                </ha-select>

                <!-- Hours to Show -->
                <ha-textfield
                  type="number"
                  .value=${String(sensor.hours_to_show || 24)}
                  @input=${(e: any) => this._updateSensor(section, index, 'hours_to_show', parseInt(e.target.value))}
                  label=${this._localize('sensors.hoursToShow')}
                  min="1"
                  max="168"
                ></ha-textfield>

                <!-- Smoothing -->
                <ha-formfield label=${this._localize('sensors.smoothing')}>
                  <ha-switch
                    .checked=${sensor.smoothing !== false}
                    @change=${(e: any) => this._updateSensor(section, index, 'smoothing', e.target.checked)}
                  ></ha-switch>
                </ha-formfield>

                <!-- Aggregation -->
                <ha-select
                  .value=${sensor.aggregate || 'avg'}
                  @selected=${(e: any) => this._updateSensor(section, index, 'aggregate', e.target.value)}
                  label=${this._localize('sensors.aggregation')}
                >
                  <ha-list-item value="avg">${this._localize('sensors.aggregate.avg')}</ha-list-item>
                  <ha-list-item value="max">${this._localize('sensors.aggregate.max')}</ha-list-item>
                  <ha-list-item value="min">${this._localize('sensors.aggregate.min')}</ha-list-item>
                  <ha-list-item value="last">${this._localize('sensors.aggregate.last')}</ha-list-item>
                  <ha-list-item value="first">${this._localize('sensors.aggregate.first')}</ha-list-item>
                  <ha-list-item value="sum">${this._localize('sensors.aggregate.sum')}</ha-list-item>
                  <ha-list-item value="delta">${this._localize('sensors.aggregate.delta')}</ha-list-item>
                  <ha-list-item value="diff">${this._localize('sensors.aggregate.diff')}</ha-list-item>
                </ha-select>
              ` : ''}

              ${sensor.display_type === 'bar' ? html`
                <!-- Min/Max for Bar -->
                <ha-textfield
                  type="number"
                  .value=${String(sensor.min ?? 0)}
                  @input=${(e: any) => this._updateSensor(section, index, 'min', parseFloat(e.target.value))}
                  label=${this._localize('sensors.minValue')}
                ></ha-textfield>

                <ha-textfield
                  type="number"
                  .value=${String(sensor.max ?? 100)}
                  @input=${(e: any) => this._updateSensor(section, index, 'max', parseFloat(e.target.value))}
                  label=${this._localize('sensors.maxValue')}
                ></ha-textfield>
              ` : ''}
            ` : ''}

            <!-- Tap Action -->
            <hui-action-editor
              .hass=${this.hass}
              .value=${sensor.tap_action || { action: 'more-info' }}
              @value-changed=${(e: any) => this._updateSensor(section, index, 'tap_action', e.detail.value)}
              label=${this._localize('common.tapAction')}
            ></hui-action-editor>
          </div>
        ` : ''}
      </div>
    `;
  }

  private _setActiveTab(tab: 'general' | 'status' | 'top' | 'bottom'): void {
    this._activeTab = tab;
  }

  private _updateConfig(key: keyof RouterCardConfig, value: any): void {
    const newConfig = { ...this._config, [key]: value };
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _updateNested<K extends NestedConfigKey>(
    section: K, 
    field: keyof NonNullable<RouterCardConfig[K]>, 
    value: any
  ): void {
    const newConfig = { ...this._config };
    const currentSection = newConfig[section] || {} as NonNullable<RouterCardConfig[K]>;
    
    // Создаем новый объект с обновленным полем
    const updatedSection = {
      ...currentSection,
      [field]: value
    };
    
    newConfig[section] = updatedSection;
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _updateSensor(
    section: 'top_sensors' | 'bottom_sensors', 
    index: number, 
    field: keyof SensorConfig, 
    value: any
  ): void {
    const newConfig = { ...this._config };
    const sensors = [...(newConfig[section] || [])];
    
    if (sensors[index]) {
      sensors[index] = {
        ...sensors[index],
        [field]: value
      };
      newConfig[section] = sensors;
      this._config = newConfig;
      console.log(`Updated sensor ${index} ${field}:`, value);
      fireEvent(this, 'config-changed', { config: newConfig });
    }
  }

  private _addSensor(section: 'top_sensors' | 'bottom_sensors'): void {
    const newSensor: SensorConfig = {
      entity: '',
      name: this._localize('sensors.newSensor'),
      unit: '',
      icon: '',
      tap_action: { action: 'more-info' },
    };

    if (section === 'top_sensors') {
      newSensor.display_type = 'bar';
      newSensor.graph_detail = 2;
      newSensor.hours_to_show = 24;
      newSensor.min = 0;
      newSensor.max = 100;
      newSensor.smoothing = true;
      newSensor.aggregate = 'avg';
    }

    const newConfig = { ...this._config };
    newConfig[section] = [...(newConfig[section] || []), newSensor];
    this._config = newConfig;
    this._expandedSensors.add(`${section}-${newConfig[section].length - 1}`);
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _removeSensor(section: 'top_sensors' | 'bottom_sensors', index: number): void {
    const newConfig = { ...this._config };
    newConfig[section] = newConfig[section].filter((_, i) => i !== index);
    this._config = newConfig;
    this._expandedSensors.delete(`${section}-${index}`);
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  static get styles() {
    return css`
      .editor {
        padding: 16px;
      }

      .tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 4px;
        color: var(--secondary-text-color);
      }

      .tab.active {
        background: var(--primary-color);
        color: white;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: var(--card-background-color);
        border-radius: 8px;
        padding: 16px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sensors-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .sensor-item {
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .sensor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: var(--secondary-background-color);
        cursor: pointer;
      }

      .sensor-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sensor-icon {
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }

      .sensor-unit {
        font-size: 12px;
        color: var(--secondary-text-color);
      }

      .sensor-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .empty-state {
        padding: 32px;
        text-align: center;
        color: var(--secondary-text-color);
        background: var(--secondary-background-color);
        border-radius: 4px;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      h4 {
        margin: 8px 0 4px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-card-editor': RouterCardEditor;
  }
}