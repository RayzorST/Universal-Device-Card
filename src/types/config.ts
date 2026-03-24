import { LovelaceCardConfig } from 'custom-card-helpers';

// Типы для действий по нажатию
export interface TapActionConfig {
  action: 'more-info' | 'navigate' | 'url' | 'call-service' | 'toggle' | 'none';
  navigation_path?: string;
  url_path?: string;
  service?: string;
  service_data?: Record<string, any>;
}

// Конфигурация секции обновления
export interface UpdateSectionConfig {
  enabled: boolean;
  entity: string;
  label?: string;
  tap_action?: TapActionConfig;
}

// Конфигурация кнопки действия
export interface ActionButtonConfig {
  enabled: boolean;
  entity?: string;
  confirmation?: boolean;
  label?: string;
  icon?: string;
  tap_action?: TapActionConfig;
  service_data?: Record<string, any>;
}

// Основная конфигурация карточки
export interface UniversalDeviceCardConfig {
  type: string;
  name?: string;
  icon?: string;
  theme?: 'default' | 'dark' | 'light';
  device_id?: string; 
  update_section?: UpdateSectionConfig;
  action_button?: ActionButtonConfig;
  cards: LovelaceCardConfig[];
  controller?: boolean;
  reboot_button?: ActionButtonConfig;
}