import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LovelaceCardEditor } from 'custom-card-helpers';
import { fireEvent } from 'custom-card-helpers';
import { RouterCardConfig, SensorConfig, TapActionConfig, UpdateSectionConfig, StatusSectionConfig, RebootButtonConfig } from './types/config';

const ICONS = {
  COG: 'mdi:cog',
  WAN: 'mdi:wan',
  VIEW_GRID: 'mdi:view-grid',
  FORMAT_LIST_BULLETED: 'mdi:format-list-bulleted',
  PLUS: 'mdi:plus',
  DELETE: 'mdi:delete',
  INFORMATION: 'mdi:information',
  RESTART: 'mdi:restart'
};

// Определяем допустимые ключи конфигурации
type ConfigKey = keyof RouterCardConfig;
type NestedConfigKey = 'update_section' | 'status_section' | 'reboot_button';
type SensorSectionKey = 'top_sensors' | 'bottom_sensors';

@customElement('router-card-editor')
export class RouterCardEditor extends LitElement implements LovelaceCardEditor {
  @property() public hass!: any;
  @state() private _config!: RouterCardConfig;
  @state() private _activeTab: 'general' | 'status' | 'top' | 'bottom' = 'general';
  @state() private _expandedSensors: Set<string> = new Set();

  public setConfig(config: RouterCardConfig): void {
    this._config = {
      type: config.type,
      name: config.name || 'Router',
      icon: config.icon || 'mdi:router-wireless',
      controller: config.controller !== false,
      theme: config.theme || 'default',
      update_section: {
        enabled: true,
        entity: '',
        label: 'Update Available',
        tap_action: { action: 'more-info' },
        ...config.update_section,
      },
      status_section: {
        enabled: true,
        left_entity: '',
        left_label: 'Status',
        right_entity: '',
        right_label: 'IP',
        tap_action: { action: 'more-info' },
        ...config.status_section,
      },
      reboot_button: {
        enabled: false,
        entity: '',
        confirmation: true,
        label: 'Reboot',
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
            title="General Settings"
          >
            <ha-icon icon="${ICONS.COG}"></ha-icon>
            <span>General</span>
          </button>
          <button 
            class="tab ${this._activeTab === 'status' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('status')}
            title="Status Section"
          >
            <ha-icon icon="${ICONS.WAN}"></ha-icon>
            <span>Status</span>
          </button>
          <button 
            class="tab ${this._activeTab === 'top' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('top')}
            title="Top Sensors - Card View"
          >
            <ha-icon icon="${ICONS.VIEW_GRID}"></ha-icon>
            <span>Top Cards</span>
          </button>
          <button 
            class="tab ${this._activeTab === 'bottom' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('bottom')}
            title="Bottom Sensors - List View"
          >
            <ha-icon icon="${ICONS.FORMAT_LIST_BULLETED}"></ha-icon>
            <span>Bottom List</span>
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
        return this._renderSensorsTab('top_sensors', 'Card View - Top Section', true);
      case 'bottom':
        return this._renderSensorsTab('bottom_sensors', 'List View - Bottom Section', false);
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
          <h3 class="section-title">Basic Settings</h3>
          <div class="grid-2">
            <ha-textfield
              .value=${this._config.name || ''}
              @input=${(e: any) => this._handleBasicChange('name', e.target.value)}
              label="Card Name"
              placeholder="Router"
            ></ha-textfield>

            <ha-icon-picker
              .value=${this._config.icon || 'mdi:router-wireless'}
              @value-changed=${(e: any) => this._handleBasicChange('icon', e.detail.value)}
              label="Card Icon"
            ></ha-icon-picker>
          </div>

          <div class="grid-2">
            <ha-formfield label="Controller Mode">
              <ha-switch
                .checked=${this._config.controller !== false}
                @change=${(e: any) => this._handleBasicChange('controller', e.target.checked)}
              ></ha-switch>
            </ha-formfield>

            <ha-select
              .value=${this._config.theme || 'default'}
              @selected=${(e: any) => this._handleBasicChange('theme', e.target.value)}
              label="Theme"
              fixedMenuPosition
              naturalMenuWidth
            >
              <ha-list-item value="default">Default</ha-list-item>
              <ha-list-item value="dark">Dark</ha-list-item>
              <ha-list-item value="light">Light</ha-list-item>
            </ha-select>
          </div>
        </div>

        <!-- Update Section -->
        <div class="section">
          <div class="section-header">
            <h3 class="section-title">Update Section</h3>
            <ha-formfield label="Enable">
              <ha-switch
                .checked=${updateSection.enabled !== false}
                @change=${(e: any) => this._handleNestedChange('update_section', 'enabled', e.target.checked)}
              ></ha-switch>
            </ha-formfield>
          </div>

          ${updateSection.enabled ? html`
            <div class="grid-2">
              <ha-entity-picker
                .hass=${this.hass}
                .value=${updateSection.entity || ''}
                @value-changed=${(e: any) => this._handleNestedChange('update_section', 'entity', e.detail.value)}
                allow-custom-entity
                include-domains='["update", "binary_sensor"]'
              ></ha-entity-picker>

              <ha-textfield
                .value=${updateSection.label || 'Update Available'}
                @input=${(e: any) => this._handleNestedChange('update_section', 'label', e.target.value)}
                label="Label"
                placeholder="Update Available"
              ></ha-textfield>
            </div>

            <hui-action-editor
              .hass=${this.hass}
              .value=${updateSection.tap_action || { action: 'more-info' }}
              @value-changed=${(e: any) => this._handleNestedChange('update_section', 'tap_action', e.detail.value)}
              label="Tap Action"
            ></hui-action-editor>
          ` : nothing}
        </div>

        <!-- Reboot Button -->
        <div class="section">
          <div class="section-header">
            <h3 class="section-title">Reboot Button</h3>
            <ha-formfield label="Enable">
              <ha-switch
                .checked=${rebootConfig.enabled !== false}
                @change=${(e: any) => this._handleNestedChange('reboot_button', 'enabled', e.target.checked)}
              ></ha-switch>
            </ha-formfield>
          </div>

          ${rebootConfig.enabled ? html`
            <div class="grid-2">
              <ha-entity-picker
                .hass=${this.hass}
                .value=${rebootConfig.entity || ''}
                @value-changed=${(e: any) => this._handleNestedChange('reboot_button', 'entity', e.detail.value)}
                allow-custom-entity
                include-domains='["button", "script"]'
              ></ha-entity-picker>

              <ha-textfield
                .value=${rebootConfig.label || 'Reboot'}
                @input=${(e: any) => this._handleNestedChange('reboot_button', 'label', e.target.value)}
                label="Button Label"
                placeholder="Reboot"
              ></ha-textfield>
            </div>

            <div class="grid-2">
              <ha-icon-picker
                .value=${rebootConfig.icon || 'mdi:restart'}
                @value-changed=${(e: any) => this._handleNestedChange('reboot_button', 'icon', e.detail.value)}
                label="Button Icon"
              ></ha-icon-picker>

              <ha-formfield label="Show Confirmation">
                <ha-switch
                  .checked=${rebootConfig.confirmation !== false}
                  @change=${(e: any) => this._handleNestedChange('reboot_button', 'confirmation', e.target.checked)}
                ></ha-switch>
              </ha-formfield>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderStatusTab() {
    const statusSection = this._config.status_section!;

    return html`
      <div class="tab-content">
        <div class="section">
          <div class="section-header">
            <h3 class="section-title">Status Section</h3>
            <ha-formfield label="Enable">
              <ha-switch
                .checked=${statusSection.enabled !== false}
                @change=${(e: any) => this._handleNestedChange('status_section', 'enabled', e.target.checked)}
              ></ha-switch>
            </ha-formfield>
          </div>

          ${statusSection.enabled ? html`
            <h4>Left Column</h4>
            <div class="grid-2">
              <ha-entity-picker
                .hass=${this.hass}
                .value=${statusSection.left_entity || ''}
                @value-changed=${(e: any) => this._handleNestedChange('status_section', 'left_entity', e.detail.value)}
                allow-custom-entity
              ></ha-entity-picker>

              <ha-textfield
                .value=${statusSection.left_label || 'Status'}
                @input=${(e: any) => this._handleNestedChange('status_section', 'left_label', e.target.value)}
                label="Left Label"
                placeholder="Status"
              ></ha-textfield>
            </div>

            <h4>Right Column</h4>
            <div class="grid-2">
              <ha-entity-picker
                .hass=${this.hass}
                .value=${statusSection.right_entity || ''}
                @value-changed=${(e: any) => this._handleNestedChange('status_section', 'right_entity', e.detail.value)}
                allow-custom-entity
              ></ha-entity-picker>

              <ha-textfield
                .value=${statusSection.right_label || 'IP'}
                @input=${(e: any) => this._handleNestedChange('status_section', 'right_label', e.target.value)}
                label="Right Label"
                placeholder="IP"
              ></ha-textfield>
            </div>

            <hui-action-editor
              .hass=${this.hass}
              .value=${statusSection.tap_action || { action: 'more-info' }}
              @value-changed=${(e: any) => this._handleNestedChange('status_section', 'tap_action', e.detail.value)}
              label="Section Tap Action"
            ></hui-action-editor>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderSensorsTab(section: 'top_sensors' | 'bottom_sensors', title: string, isTop: boolean) {
    const sensors = this._config[section] || [];

    return html`
      <div class="tab-content">
        <div class="section">
          <div class="sensors-header">
            <h3 class="section-title">${title}</h3>
            <ha-button @click=${() => this._addSensor(section)}>
              <ha-icon icon="${ICONS.PLUS}" slot="icon"></ha-icon>
              Add Sensor
            </ha-button>
          </div>

          ${sensors.length === 0 ? html`
            <div class="empty-state">
              No sensors configured. Click "Add Sensor" to start.
            </div>
          ` : html`
            <div class="sensors-list">
              ${sensors.map((sensor: SensorConfig, index: number) => this._renderSensorRow(section, sensor, index, isTop))}
            </div>
          `}
        </div>
      </div>
    `;
  }

  private _renderSensorRow(section: 'top_sensors' | 'bottom_sensors', sensor: SensorConfig, index: number, isTop: boolean) {
    const isExpanded = this._isSensorExpanded(section, index);
    const hasIcon = !!sensor.icon;
    const hasUnit = !!sensor.unit;
    const hasTapAction = sensor.tap_action && sensor.tap_action.action !== 'more-info';

    return html`
      <div class="sensor-row">
        <div class="sensor-header" @click=${() => this._toggleSensor(section, index)}>
          <div class="sensor-title">
            <ha-icon icon="${isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}"></ha-icon>
            <span class="sensor-name">${sensor.name || 'Unnamed Sensor'}</span>
            ${hasIcon ? html`<ha-icon icon="${sensor.icon}" class="sensor-icon-preview"></ha-icon>` : ''}
            ${hasUnit ? html`<span class="sensor-unit-preview">(${sensor.unit})</span>` : ''}
            ${hasTapAction ? html`<span class="sensor-badge">tap</span>` : ''}
            ${isTop && sensor.display_type ? html`<span class="sensor-type-badge">${sensor.display_type}</span>` : ''}
          </div>
          <ha-icon-button
            .label=${'Remove sensor'}
            @click=${(e: Event) => { e.stopPropagation(); this._removeSensor(section, index); }}
          >
            <ha-icon icon="${ICONS.DELETE}"></ha-icon>
          </ha-icon-button>
        </div>

        ${isExpanded ? html`
          <div class="sensor-content">
            <!-- Entity -->
            <div class="grid-2">
              <ha-entity-picker
                .hass=${this.hass}
                .value=${sensor.entity || ''}
                @value-changed=${(e: any) => this._handleSensorChange(section, index, 'entity', e.detail.value)}
                allow-custom-entity
                required
              ></ha-entity-picker>

              <ha-textfield
                .value=${sensor.name || ''}
                @input=${(e: any) => this._handleSensorChange(section, index, 'name', e.target.value)}
                label="Display Name"
                placeholder="Sensor Name"
                required
              ></ha-textfield>
            </div>

            <!-- Icon and Unit -->
            <div class="grid-2">
              <ha-icon-picker
                .value=${sensor.icon || ''}
                @value-changed=${(e: any) => this._handleSensorChange(section, index, 'icon', e.detail.value)}
                label="Icon (optional)"
              ></ha-icon-picker>

              <ha-textfield
                .value=${sensor.unit || ''}
                @input=${(e: any) => this._handleSensorChange(section, index, 'unit', e.target.value)}
                label="Unit"
                placeholder="% or °C or GB"
              ></ha-textfield>
            </div>

            <!-- Display Type (only for top sensors) -->
            ${isTop ? html`
              <div class="grid-2">
                <ha-select
                  .value=${sensor.display_type || 'bar'}
                  @selected=${(e: any) => this._handleSensorChange(section, index, 'display_type', e.target.value)}
                  label="Display Type"
                  fixedMenuPosition
                  naturalMenuWidth
                >
                  <ha-list-item value="bar">Progress Bar</ha-list-item>
                  <ha-list-item value="graph">Graph</ha-list-item>
                </ha-select>

                ${sensor.display_type === 'graph' ? html`
                  <ha-select
                    .value=${String(sensor.graph_detail || 2)}
                    @selected=${(e: any) => this._handleSensorChange(section, index, 'graph_detail', Number(e.target.value))}
                    label="Graph Detail"
                    fixedMenuPosition
                    naturalMenuWidth
                  >
                    <ha-list-item value="1">Low (compact)</ha-list-item>
                    <ha-list-item value="2">Medium</ha-list-item>
                    <ha-list-item value="3">High (detailed)</ha-list-item>
                  </ha-select>
                ` : ''}
              </div>

              ${sensor.display_type === 'graph' ? html`
                <ha-textfield
                  type="number"
                  .value=${String(sensor.hours_to_show || 24)}
                  @input=${(e: any) => this._handleSensorChange(section, index, 'hours_to_show', Number(e.target.value))}
                  label="Hours to Show"
                  min="1"
                  max="168"
                  suffix="hours"
                ></ha-textfield>

                <div class="grid-2">
                  <ha-formfield label="Smoothing">
                    <ha-switch
                      .checked=${sensor.smoothing !== false}
                      @change=${(e: any) => this._handleSensorChange(section, index, 'smoothing', e.target.checked)}
                    ></ha-switch>
                  </ha-formfield>

                  <ha-select
                    .value=${sensor.aggregate || 'avg'}
                    @selected=${(e: any) => this._handleSensorChange(section, index, 'aggregate', e.target.value)}
                    label="Aggregation"
                    fixedMenuPosition
                    naturalMenuWidth
                  >
                    <ha-list-item value="avg">Average</ha-list-item>
                    <ha-list-item value="max">Maximum</ha-list-item>
                    <ha-list-item value="min">Minimum</ha-list-item>
                    <ha-list-item value="last">Last</ha-list-item>
                    <ha-list-item value="first">First</ha-list-item>
                    <ha-list-item value="sum">Sum</ha-list-item>
                    <ha-list-item value="delta">Delta</ha-list-item>
                    <ha-list-item value="diff">Difference</ha-list-item>
                  </ha-select>
                </div>
              ` : ''}

              ${sensor.display_type === 'bar' ? html`
                <div class="grid-2">
                  <ha-textfield
                    type="number"
                    .value=${String(sensor.min ?? 0)}
                    @input=${(e: any) => this._handleSensorChange(section, index, 'min', Number(e.target.value))}
                    label="Min Value"
                  ></ha-textfield>

                  <ha-textfield
                    type="number"
                    .value=${String(sensor.max ?? 100)}
                    @input=${(e: any) => this._handleSensorChange(section, index, 'max', Number(e.target.value))}
                    label="Max Value"
                  ></ha-textfield>
                </div>
              ` : ''}
            ` : ''}

            <!-- Tap Action (для всех сенсоров) -->
            <hui-action-editor
              .hass=${this.hass}
              .value=${sensor.tap_action || { action: 'more-info' }}
              @value-changed=${(e: any) => this._handleSensorChange(section, index, 'tap_action', e.detail.value)}
              label="Tap Action"
            ></hui-action-editor>
          </div>
        ` : ''}
      </div>
    `;
  }

  private _setActiveTab(tab: 'general' | 'status' | 'top' | 'bottom'): void {
    this._activeTab = tab;
  }

  private _handleBasicChange(key: keyof RouterCardConfig, value: any): void {
    if (!this._config) return;

    const newConfig = { ...this._config };
    
    if (value === '' || value === undefined || value === null) {
      delete newConfig[key];
    } else {
      (newConfig as any)[key] = value;
    }

    this._config = newConfig as RouterCardConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _handleNestedChange<T extends NestedConfigKey>(
    section: T, 
    field: keyof NonNullable<RouterCardConfig[T]>, 
    value: any
  ): void {
    if (!this._config) return;

    const newConfig = { ...this._config };
    const nestedObject = { ...(newConfig[section] || {}) } as any;

    if (value === '' || value === undefined || value === null) {
      delete nestedObject[field];
    } else {
      nestedObject[field] = value;
    }

    newConfig[section] = nestedObject;
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _handleSensorChange(
    section: 'top_sensors' | 'bottom_sensors', 
    index: number, 
    field: keyof SensorConfig, 
    value: any
  ): void {
    if (!this._config) return;

    const newConfig = { ...this._config };
    const sensorsArray = [...(newConfig[section] || [])];
    
    if (!sensorsArray[index]) {
      sensorsArray[index] = {} as SensorConfig;
    }

    // Создаем копию сенсора с новым значением
    const updatedSensor = { ...sensorsArray[index] };
    
    if (value === '' || value === undefined || value === null) {
      delete (updatedSensor as any)[field];
    } else {
      (updatedSensor as any)[field] = value;
    }

    sensorsArray[index] = updatedSensor;
    newConfig[section] = sensorsArray;
    this._config = newConfig;
    
    // Принудительно обновляем UI
    this.requestUpdate();
    
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _addSensor(section: 'top_sensors' | 'bottom_sensors'): void {
    if (!this._config) return;

    const newConfig = { ...this._config };
    const sensorsArray = [...(newConfig[section] || [])];
    
    const newSensor: SensorConfig = {
      entity: '',
      name: 'New Sensor',
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

    sensorsArray.push(newSensor);
    newConfig[section] = sensorsArray;
    this._config = newConfig;
    
    // Автоматически раскрываем новый сенсор
    this._expandedSensors.add(`${section}-${sensorsArray.length - 1}`);
    
    // Принудительно обновляем UI
    this.requestUpdate();
    
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _removeSensor(section: 'top_sensors' | 'bottom_sensors', index: number): void {
    if (!this._config) return;

    const newConfig = { ...this._config };
    const sensorsArray = [...(newConfig[section] || [])];
    sensorsArray.splice(index, 1);
    newConfig[section] = sensorsArray;
    this._config = newConfig;
    
    // Удаляем из expanded
    this._expandedSensors.delete(`${section}-${index}`);
    
    // Принудительно обновляем UI
    this.requestUpdate();
    
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  static get styles() {
    return css`
      .editor {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 8px 0;
      }

      .tabs {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        padding-bottom: 8px;
        margin-bottom: 8px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color, #333);
        transition: all 0.2s;
        min-width: 80px;
        justify-content: center;
      }

      .tab:hover {
        background: var(--primary-color, #03a9f4);
        color: white;
      }

      .tab.active {
        background: var(--primary-color, #03a9f4);
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .tab ha-icon {
        --mdc-icon-size: 18px;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: var(--card-background-color, #ffffff);
        border-radius: 12px;
        padding: 16px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .section-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--primary-text-color, #333);
      }

      h4 {
        margin: 8px 0 4px 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--secondary-text-color, #666);
      }

      .grid-2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }

      .info-box {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px;
        font-size: 13px;
        color: var(--secondary-text-color, #666);
        border-left: 3px solid var(--primary-color, #03a9f4);
      }

      .info-box ha-icon {
        --mdc-icon-size: 20px;
        color: var(--primary-color, #03a9f4);
      }

      .sensors-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .sensors-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .sensor-row {
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
        overflow: hidden;
      }

      .sensor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: var(--secondary-background-color, #f5f5f5);
        cursor: pointer;
        transition: background 0.2s;
      }

      .sensor-header:hover {
        background: var(--primary-color, #03a9f4);
        color: white;
      }

      .sensor-header:hover .sensor-name,
      .sensor-header:hover .sensor-unit-preview,
      .sensor-header:hover ha-icon {
        color: white;
      }

      .sensor-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        flex-wrap: wrap;
      }

      .sensor-name {
        font-weight: 600;
        font-size: 14px;
        color: var(--primary-text-color, #333);
      }

      .sensor-icon-preview {
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }

      .sensor-unit-preview {
        font-size: 12px;
        color: var(--secondary-text-color);
      }

      .sensor-badge {
        background: var(--primary-color, #03a9f4);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        text-transform: uppercase;
      }

      .sensor-type-badge {
        background: var(--accent-color, #ff9800);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        text-transform: uppercase;
      }

      .sensor-content {
        padding: 16px;
        border-top: 1px solid var(--divider-color, #e0e0e0);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .empty-state {
        padding: 32px;
        text-align: center;
        color: var(--secondary-text-color, #666);
        font-style: italic;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 12px;
        border: 1px dashed var(--divider-color, #e0e0e0);
      }

      ha-textfield,
      ha-select,
      ha-entity-picker,
      ha-icon-picker {
        width: 100%;
      }

      ha-formfield {
        padding: 4px 0;
      }

      @media (max-width: 600px) {
        .tab {
          flex: 1;
          min-width: auto;
          padding: 8px 4px;
          font-size: 12px;
        }
        
        .tab span {
          display: none;
        }
        
        .tab ha-icon {
          margin: 0;
        }
        
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-card-editor': RouterCardEditor;
  }
}