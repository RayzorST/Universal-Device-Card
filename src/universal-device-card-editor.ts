// universal-device-card-editor.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LovelaceCardEditor, fireEvent } from 'custom-card-helpers';
import { UniversalDeviceCardConfig } from './types/config';
import { getLocalizedStringForHass } from './localization';
import { loadHaComponents } from '@kipk/load-ha-components';

const ICONS = {
  DEVICE: 'mdi:devices',
  RESTART: 'mdi:restart',
  UPDATE: 'mdi:update',
};

type NestedConfigKey = 'update_section' | 'action_button';

@customElement('universal-device-card-editor')
export class UniversalDeviceCardEditor extends LitElement implements LovelaceCardEditor {
  @property() public hass!: any;
  
  @state() private _config!: UniversalDeviceCardConfig;
  @state() private _componentsLoaded = false;

  private _localize(key: string, params?: Record<string, string>): string {
    return getLocalizedStringForHass(this.hass, key, params);
  }

  public async connectedCallback() {
    super.connectedCallback();
    if (!this._componentsLoaded) {
      await loadHaComponents();
      this._componentsLoaded = true;
      this.requestUpdate();
    }
  }

  public setConfig(config: UniversalDeviceCardConfig): void {
    const migratedConfig = { ...config };
    delete migratedConfig.controller;
    
    if ((config as any).reboot_button && !config.action_button) {
      migratedConfig.action_button = (config as any).reboot_button;
      delete (migratedConfig as any).reboot_button;
    }
    
    this._config = {
      type: migratedConfig.type,
      name: migratedConfig.name || '',
      icon: migratedConfig.icon || 'mdi:devices',
      device_id: migratedConfig.device_id || '',
      update_section: {
        enabled: true,
        entity: '',
        label: 'Update',
        tap_action: { action: 'more-info' },
        ...migratedConfig.update_section,
      },
      action_button: {
        enabled: false,
        entity: '',
        confirmation: true,
        icon: 'mdi:restart',
        label: 'Reboot',
        tap_action: { action: 'call-service' },
        ...migratedConfig.action_button,
      },
      cards: migratedConfig.cards || [],
    };
  }

  private _updateConfig(key: keyof UniversalDeviceCardConfig, value: any): void {
    const newConfig = { ...this._config, [key]: value };
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _updateNested<K extends NestedConfigKey>(
    section: K, 
    field: string, 
    value: any
  ): void {
    const newConfig = { ...this._config };
    const currentSection = newConfig[section] || {};
    
    const updatedSection = {
      ...currentSection,
      [field]: value
    };
    
    (newConfig[section] as any) = updatedSection;
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  protected render() {
    if (!this.hass || !this._config || !this._componentsLoaded) {
      return html`<div class="loading">Loading editor...</div>`;
    }

    const updateSection = this._config.update_section!;
    const actionButton = this._config.action_button!;

    return html`
      <div class="editor">
        <!-- Device Selection -->
        <div class="section">
          <div class="section-header">
            <ha-icon icon="${ICONS.DEVICE}"></ha-icon>
            <h3>Device</h3>
          </div>
          <ha-device-picker
            .hass=${this.hass}
            .value=${this._config.device_id || ''}
            @value-changed=${(e: any) => this._updateConfig('device_id', e.detail.value)}
            label="Select device"
          ></ha-device-picker>
          <div class="field-hint">
            Select a device - its model will be shown as title (or name if no model)
          </div>
        </div>

        <!-- Display Settings -->
        <div class="section">
          <div class="section-header">
            <ha-icon icon="${ICONS.DEVICE}"></ha-icon>
            <h3>Display</h3>
          </div>
          
          <ha-textfield
            .value=${this._config.name || ''}
            @input=${(e: any) => this._updateConfig('name', e.target.value)}
            label="Custom title (optional)"
            placeholder="Leave empty to use device model/name"
          ></ha-textfield>

          <ha-icon-picker
            .value=${this._config.icon || 'mdi:devices'}
            @value-changed=${(e: any) => this._updateConfig('icon', e.detail.value)}
            label="Icon"
          ></ha-icon-picker>
        </div>

        <!-- Update Badge -->
        <div class="section">
          <div class="section-header">
            <ha-icon icon="${ICONS.UPDATE}"></ha-icon>
            <h3>Update Badge</h3>
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
              label="Update entity"
            ></ha-entity-picker>

            <ha-textfield
              .value=${updateSection.label || ''}
              @input=${(e: any) => this._updateNested('update_section', 'label', e.target.value)}
              label="Custom label (optional)"
              placeholder="Update"
            ></ha-textfield>

            <ha-selector
              .hass=${this.hass}
              .value=${updateSection.tap_action || { action: 'more-info' }}
              @value-changed=${(e: any) => this._updateNested('update_section', 'tap_action', e.detail.value)}
              .selector=${{
                ui_action: {}
              }}
              label="Tap action"
            ></ha-selector>
          ` : ''}
        </div>

        <!-- Reboot Badge -->
        <div class="section">
          <div class="section-header">
            <ha-icon icon="${ICONS.RESTART}"></ha-icon>
            <h3>Reboot Badge</h3>
            <ha-switch
              .checked=${actionButton.enabled !== false}
              @change=${(e: any) => this._updateNested('action_button', 'enabled', e.target.checked)}
            ></ha-switch>
          </div>

          ${actionButton.enabled ? html`
            <ha-entity-picker
              .hass=${this.hass}
              .value=${actionButton.entity || ''}
              @value-changed=${(e: any) => this._updateNested('action_button', 'entity', e.detail.value)}
              allow-custom-entity
              include-domains='["button", "script"]'
              label="Button entity"
            ></ha-entity-picker>

            <ha-icon-picker
              .value=${actionButton.icon || 'mdi:restart'}
              @value-changed=${(e: any) => this._updateNested('action_button', 'icon', e.detail.value)}
              label="Button icon"
            ></ha-icon-picker>

            <ha-textfield
              .value=${actionButton.label || ''}
              @input=${(e: any) => this._updateNested('action_button', 'label', e.target.value)}
              label="Button label"
              placeholder="Reboot"
            ></ha-textfield>

            <ha-formfield label="Ask for confirmation">
              <ha-switch
                .checked=${actionButton.confirmation !== false}
                @change=${(e: any) => this._updateNested('action_button', 'confirmation', e.target.checked)}
              ></ha-switch>
            </ha-formfield>

            <ha-selector
              .hass=${this.hass}
              .value=${actionButton.tap_action || { action: 'call-service' }}
              @value-changed=${(e: any) => this._updateNested('action_button', 'tap_action', e.detail.value)}
              .selector=${{
                ui_action: {}
              }}
              label="Button action"
            ></ha-selector>
          ` : ''}
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .editor {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: var(--card-background-color);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--divider-color);
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .section-header ha-icon {
        --mdc-icon-size: 20px;
        color: var(--primary-color);
      }

      .section-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        flex: 1;
      }

      .field-hint {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: -4px;
      }

      ha-textfield,
      ha-icon-picker,
      ha-select,
      ha-entity-picker,
      ha-selector {
        width: 100%;
      }

      .loading {
        padding: 20px;
        text-align: center;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'universal-device-card-editor': UniversalDeviceCardEditor;
  }
}