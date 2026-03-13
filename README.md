# Router Card
[![hacs\_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs) [![version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/)

A highly customizable Home Assistant Lovelace card for monitoring routers, access points, and mesh network devices.

![Preview](photo_2026-03-13_23-04-43.jpg)

## 🌟 Features

🎯 Universal Compatibility - Works with any router integration that provides sensors

🔄 Controller & Repeater Support - Different badges and icons for main routers and repeaters

📊 Flexible Layout - Two display sections: card view (top) and list view (bottom)

🎨 Customizable - Choose which sensors to display, custom icons, themes

📡 Status - Dedicated section for connection status and IP

⬇️ Updates - Allows you to track the availability of updates for the router

🌙 Theme Support - Default, dark, and light themes

## 📦 Installation
### Via HACS (Recommended)
1. HACS > Integrations > ⋮ > Custom repositories
2. URL: `https://github.com/YOUR_USERNAME/keenetic_router_pro`
3. Category: Integration
4. Search for "Keenetic Router Pro" and install
5. Restart Home Assistant
### Manual Installation
1. Download `router-card.js` from the latest release
2. Place the file in `/config/www/community/router-card/`
3. Add the resource to your Lovelace dashboard:
    - Go to Settings → Dashboards → Resources
    - Click "+ Add Resource"
    - URL: `/hacsfiles/router-card/router-card.js`
    - Type: JavaScript Module

## Configuration

### Basic Configuration

~~~yaml
type: custom:router-card
name: Keenetic Voyager Pro
icon: mdi:router-wireless
controller: true
theme: default
wan_status_entity: sensor.keenetic_wan_status
wan_ip_entity: sensor.keenetic_wan_ip
top_sensors:
  - entity: sensor.keenetic_cpu_load
    name: CPU Load
    unit: '%'
    show_bar: true
  - entity: sensor.keenetic_memory_usage
    name: Memory
    unit: '%'
    show_bar: true
  - entity: sensor.keenetic_uptime
    name: Uptime
  - entity: sensor.keenetic_connected_clients
    name: Clients
    icon: mdi:devices
bottom_sensors:
  - entity: sensor.keenetic_wifi_2g_temperature
    name: WiFi 2.4GHz Temp
    unit: °C
  - entity: sensor.keenetic_wifi_5g_temperature
    name: WiFi 5GHz Temp
    unit: °C
  - entity: sensor.keenetic_wan_rx
    name: WAN RX
    unit: GB
  - entity: sensor.keenetic_wan_tx
    name: WAN TX
    unit: GB
~~~

### Controller Configuration Example

[Image: Controller Card Example]

~~~yaml
type: custom:router-card
name: Keenetic Voyager Pro
icon: mdi:router-wireless
controller: true
theme: default
wan_status_entity: sensor.keenetic_voyager_wan_status
wan_ip_entity: sensor.keenetic_voyager_wan_ip
top_sensors:
  - entity: sensor.keenetic_voyager_cpu_load
    name: CPU Load
    unit: '%'
    show_bar: true
  - entity: sensor.keenetic_voyager_memory_usage
    name: Memory
    unit: '%'
    show_bar: true
  - entity: sensor.keenetic_voyager_uptime
    name: Uptime
  - entity: sensor.keenetic_voyager_connected_clients
    name: Connected Clients
    icon: mdi:devices
  - entity: sensor.keenetic_voyager_extender_count
    name: Extenders
    icon: mdi:hubspot
bottom_sensors:
  - entity: sensor.keenetic_voyager_wifi_2g_temperature
    name: WiFi 2.4GHz Temperature
    unit: °C
  - entity: sensor.keenetic_voyager_wifi_5g_temperature
    name: WiFi 5GHz Temperature
    unit: °C
  - entity: sensor.keenetic_voyager_wan_rx
    name: WAN Download
    unit: GB
  - entity: sensor.keenetic_voyager_wan_tx
    name: WAN Upload
    unit: GB
  - entity: sensor.keenetic_voyager_lan_rx
    name: LAN RX
    unit: GB
  - entity: sensor.keenetic_voyager_lan_tx
    name: LAN TX
    unit: GB
  - entity: sensor.keenetic_voyager_wifi_2g_rx
    name: WiFi 2.4G RX
    unit: GB
  - entity: sensor.keenetic_voyager_wifi_2g_tx
    name: WiFi 2.4G TX
    unit: GB
  - entity: sensor.keenetic_voyager_wifi_5g_rx
    name: WiFi 5G RX
    unit: GB
  - entity: sensor.keenetic_voyager_wifi_5g_tx
    name: WiFi 5G TX
    unit: GB
~~~
