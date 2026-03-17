import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseCard } from './base-card';
import { HistoryData } from '../types/config';
import Graph from '../utils/graph';

@customElement('router-graph-card')
export class GraphCard extends BaseCard {
  @property({ type: Object }) graphData?: Record<string, HistoryData[]>;
  @property({ type: Object }) hass?: any;

  @state() private _loading = true;
  @state() private _graphPoints: Array<[number, number, number, number]> = [];
  @state() private _error = false;
  @state() private _debugInfo: string = '';

  private _graph: Graph | null = null;
  private _hasPartialData = false;

  connectedCallback() {
    super.connectedCallback();
    console.log('🟢 GraphCard connected', {
      sensor: this.sensor,
      data: this.data,
      hass: !!this.hass,
      graphData: this.graphData
    });
    this._initGraph();
  }

  updated(changedProps: Map<string, any>) {
    if (changedProps.has('sensor') || changedProps.has('graphData')) {
      console.log('🔄 GraphCard updated', {
        sensor: this.sensor,
        graphData: this.graphData
      });
      this._initGraph();
    }
  }

  private _initGraph() {
    console.log('📊 Initializing graph for', this.sensor?.entity);
    
    const width = 200;
    const height = this._getGraphHeight();
    const margin = { x: 0, y: 0 };
    const hours = this.sensor.hours_to_show || 24;
    const points = 4;
    const aggregateFunc = this.sensor.aggregate || 'avg';
    const smoothing = this.sensor.smoothing !== false;

    console.log('⚙️ Graph config:', { width, height, hours, points, aggregateFunc });

    this._graph = new Graph(
      width, 
      height, 
      margin, 
      hours, 
      points, 
      aggregateFunc,
      'interval',
      smoothing,
      false
    );

    // Если данные уже есть в graphData
    if (this.graphData && this.graphData[this.sensor.entity]) {
      console.log('📁 Using provided graphData');
      this._processData(this.graphData[this.sensor.entity]);
    } 
    // Если есть hass, загружаем данные
    else if (this.hass) {
      console.log('🌐 Loading history from hass');
      this._loadHistory();
    } else {
      console.warn('⚠️ No data source available');
    }
  }

  private async _loadHistory() {
    if (!this.hass || !this.sensor?.entity || !this._graph) {
      console.warn('❌ Cannot load history: missing dependencies', {
        hass: !!this.hass,
        entity: this.sensor?.entity,
        graph: !!this._graph
      });
      return;
    }

    this._loading = true;
    this._error = false;
    this._hasPartialData = false;

    const hours = this.sensor.hours_to_show || 24;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    console.log('📅 Time range:', {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      hours
    });

    try {
      console.log('🔍 Fetching history for', this.sensor.entity);
      const history = await this.hass.callApi(
        'GET',
        `history/period/${startTime.toISOString()}?filter_entity_id=${this.sensor.entity}&minimal_response`
      );

      if (!this.isConnected) {
        console.log('🔌 Component disconnected');
        return;
      }

      console.log('📥 API response:', history);

      const entityHistory = history?.[0] || [];
      console.log('📊 Entity history:', {
        length: entityHistory.length,
        first: entityHistory[0],
        last: entityHistory[entityHistory.length - 1]
      });
      
      if (entityHistory.length === 0) {
        console.warn('⚠️ No history data for', this.sensor.entity);
        this._hasPartialData = true;
        this._graphPoints = [];
        this._debugInfo = 'No history data';
      } else {
        this._processData(entityHistory);
      }
    } catch (e) {
      // Исправление: проверяем тип ошибки
      console.error('❌ Failed to load history for', this.sensor.entity, e);
      this._error = true;
      
      // Безопасное получение сообщения об ошибке
      if (e instanceof Error) {
        this._debugInfo = `Error: ${e.message}`;
      } else if (typeof e === 'string') {
        this._debugInfo = `Error: ${e}`;
      } else {
        this._debugInfo = 'Unknown error';
      }
    } finally {
      this._loading = false;
    }
  }

  private _processData(history: HistoryData[]) {
    console.log('🔧 Processing history data:', {
      length: history.length,
      first: history[0],
      last: history[history.length - 1]
    });

    if (!this._graph) {
      console.warn('❌ Graph not initialized');
      return;
    }

    if (!history || history.length === 0) {
      console.warn('⚠️ Empty history');
      this._graphPoints = [];
      this._hasPartialData = true;
      this._debugInfo = 'Empty history';
      this.requestUpdate();
      return;
    }

    if (history.length < 2) {
      console.warn('⚠️ Insufficient history points:', history.length);
      this._hasPartialData = true;
      this._graphPoints = [];
      this._debugInfo = `Only ${history.length} point(s)`;
      this.requestUpdate();
      return;
    }

    console.log('📈 Setting graph history');
    this._graph.history = history;
    this._graph.update();

    const points = this._graph.getPoints();
    console.log('📉 Graph points:', {
      count: points?.length,
      first: points?.[0],
      last: points?.[points.length - 1]
    });
    
    if (!points || points.length < 2) {
      console.warn('⚠️ Not enough graph points generated');
      this._hasPartialData = true;
      this._graphPoints = [];
      this._debugInfo = 'Graph generation failed';
    } else {
      console.log('✅ Graph generated successfully');
      this._hasPartialData = false;
      this._graphPoints = points;
      this._debugInfo = `OK: ${points.length} points`;
    }
    
    this.requestUpdate();
  }

  private _getGraphHeight(): number {
    const detail = this.sensor.graph_detail || 2;
    if (detail === 1) return 36;
    if (detail === 3) return 60;
    return 45;
  }

  private _generatePath(points: Array<[number, number, number, number]>): string {
    if (points.length < 2) {
      console.warn('Cannot generate path: insufficient points', points.length);
      return '';
    }

    let path = `M${points[0][0]},${points[0][1]}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i][0]},${points[i][1]}`;
    }

    console.log('📐 Generated path length:', path.length);
    return path;
  }

  private _generateArea(points: Array<[number, number, number, number]>, height: number): string {
    if (points.length < 2) return '';

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    let area = `M${firstPoint[0]},${firstPoint[1]}`;
    
    for (let i = 1; i < points.length; i++) {
      area += ` L${points[i][0]},${points[i][1]}`;
    }
    
    area += ` L${lastPoint[0]},${height}`;
    area += ` L${firstPoint[0]},${height}`;
    area += ' Z';

    return area;
  }

  private _getMessageText(): string {
    if (this._error) return 'Error loading data';
    if (this._hasPartialData) return `Insufficient data: ${this._debugInfo}`;
    if (this._graphPoints.length < 2) return 'No data';
    return '';
  }

  renderContent(): TemplateResult {
    const currentValue = parseFloat(this.data.state) || 0;
    const unit = this.sensor.unit || this.data.unit || '';
    const height = this._getGraphHeight();
    const width = 200;

    console.log('🎨 Rendering graph card:', {
      loading: this._loading,
      error: this._error,
      hasPartialData: this._hasPartialData,
      pointsCount: this._graphPoints.length,
      debugInfo: this._debugInfo
    });

    if (this._loading) {
      return html`
        <div class="graph-wrapper">
          <div class="graph-current">${currentValue.toFixed(1)}${unit}</div>
          <div class="graph-container" style="height: ${height}px">
            <div class="graph-placeholder">
              <ha-icon icon="mdi:loading" class="spinning"></ha-icon>
              <span>Loading...</span>
            </div>
          </div>
        </div>
      `;
    }

    if (this._error || this._hasPartialData || this._graphPoints.length < 2) {
      return html`
        <div class="graph-wrapper">
          <div class="graph-current">${currentValue.toFixed(1)}${unit}</div>
          <div class="graph-container" style="height: ${height}px">
            <div class="graph-placeholder">
              <ha-icon icon="mdi:chart-line"></ha-icon>
              <span>${this._getMessageText()}</span>
            </div>
          </div>
        </div>
      `;
    }

    const path = this._generatePath(this._graphPoints);
    const area = this._generateArea(this._graphPoints, height);
    const entityId = this.sensor.entity.replace(/[^a-zA-Z0-9]/g, '-');

    console.log('✅ Rendering actual graph with path length:', path.length);

    return html`
      <div class="graph-wrapper">
        <div class="graph-current">${currentValue.toFixed(1)}${unit}</div>
        <div class="graph-container" style="height: ${height}px">
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="graph-svg">
            <defs>
              <linearGradient id="grad-${entityId}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="var(--accent-color, var(--primary-color, #03a9f4))" stop-opacity="0.3"/>
                <stop offset="80%" stop-color="var(--accent-color, var(--primary-color, #03a9f4))" stop-opacity="0.05"/>
                <stop offset="100%" stop-color="var(--accent-color, var(--primary-color, #03a9f4))" stop-opacity="0"/>
              </linearGradient>
            </defs>
            
            <path
              d="${area}"
              fill="url(#grad-${entityId})"
              class="graph-area"
            />
            
            <path
              d="${path}"
              fill="none"
              stroke="var(--accent-color, var(--primary-color, #03a9f4))"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="graph-line"
            />
            
            ${this.sensor.graph_detail === 3 ? this._graphPoints.map(point => html`
              <circle
                cx="${point[0]}"
                cy="${point[1]}"
                r="2"
                fill="var(--accent-color, var(--primary-color, #03a9f4))"
                stroke="var(--card-background-color, white)"
                stroke-width="1.5"
                class="graph-point"
              />
            `) : ''}
          </svg>
        </div>
        <div class="graph-time">
          <span>${this.sensor.hours_to_show || 24}h ago</span>
          <span>now</span>
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
        }

        .dark .card {
          background: #16213e;
        }

        .graph-wrapper {
          width: 100%;
          padding: 0;
          display: flex;
          flex-direction: column;
        }

        .graph-current {
          font-size: 18px;
          font-weight: 600;
          color: var(--primary-text-color);
          padding: 8px 12px 4px 12px;
        }

        .graph-container {
          width: 100%;
          margin: 0;
          padding: 0;
        }

        .graph-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .graph-line {
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
          vector-effect: non-scaling-stroke;
        }

        .graph-point {
          transition: r 0.2s ease;
        }

        .graph-point:hover {
          r: 4;
        }

        .graph-time {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: var(--secondary-text-color);
          padding: 2px 12px 8px 12px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .graph-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 100%;
          min-height: 36px;
          font-size: 12px;
          color: var(--secondary-text-color);
          font-style: italic;
          background: var(--secondary-background-color);
          border-radius: 4px;
          margin: 0 12px 8px 12px;
        }

        .graph-placeholder ha-icon {
          --mdc-icon-size: 16px;
          color: var(--secondary-text-color);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }
      `
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'router-graph-card': GraphCard;
  }
}