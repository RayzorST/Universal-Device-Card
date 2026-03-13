// src/utils/graph.ts

const ONE_HOUR = 3600000; // 1 hour in milliseconds

export default class Graph {
  private _history: any[] = [];
  private _width: number;
  private _height: number;
  private _margin: any;
  private _points: number;
  private _hours: number;
  private _aggregateFuncName: string;
  private _calcPoint: Function;
  private _smoothing: boolean;
  private _logarithmic: boolean;
  private _groupBy: string;
  private _endTime: number = 0;
  private _max: number = 0;
  private _min: number = 0;
  
  public coords: Array<[number, number, number]> = [];

  constructor(
    width: number, 
    height: number, 
    margin: any, 
    hours: number = 24, 
    points: number = 1, 
    aggregateFuncName: string = 'avg', 
    groupBy: string = 'interval', 
    smoothing: boolean = true, 
    logarithmic: boolean = false
  ) {
    const aggregateFuncMap: { [key: string]: Function } = {
      avg: this._average,
      median: this._median,
      max: this._maximum,
      min: this._minimum,
      first: this._first,
      last: this._last,
      sum: this._sum,
      delta: this._delta,
      diff: this._diff,
    };

    this._history = [];
    this.coords = [];
    this._width = width - margin.x * 2;
    this._height = height - margin.y * 4;
    this._margin = margin;
    this._max = 0;
    this._min = 0;
    this._points = points;
    this._hours = hours;
    this._aggregateFuncName = aggregateFuncName;
    this._calcPoint = aggregateFuncMap[aggregateFuncName] || this._average;
    this._smoothing = smoothing;
    this._logarithmic = logarithmic;
    this._groupBy = groupBy;
    this._endTime = 0;
  }

  get max() { return this._max; }
  set max(max: number) { this._max = max; }

  get min() { return this._min; }
  set min(min: number) { this._min = min; }

  set history(data: any[]) { this._history = data; }

  update(history: any[] | undefined = undefined) {
    if (history) {
      this._history = history;
    }
    if (!this._history || !this._history.length) return;
    this._updateEndTime();

    const histGroups = this._history.reduce((res: any[][], item) => this._reducer(res, item), []);

    // extend length to fill missing history
    const requiredNumOfPoints = Math.ceil(this._hours * this._points);
    histGroups.length = requiredNumOfPoints;

    this.coords = this._calcPoints(histGroups);
    const values = this.coords.map(item => Number(item[2]));
    this._min = Math.min(...values);
    this._max = Math.max(...values);
  }

  private _reducer(res: any[][], item: any): any[][] {
    const age = this._endTime - new Date(item.last_changed).getTime();
    const interval = (age / ONE_HOUR * this._points) - this._hours * this._points;
    if (interval < 0) {
      const key = Math.floor(Math.abs(interval));
      if (!res[key]) res[key] = [];
      res[key].push(item);
    } else {
      res[0] = [item];
    }
    return res;
  }

  private _calcPoints(history: any[][]): Array<[number, number, number]> {
    let xRatio = this._width / (this._hours * this._points - 1);
    xRatio = Number.isFinite(xRatio) ? xRatio : this._width;

    const coords: Array<[number, number, number]> = [];
    let last = history.filter(Boolean)[0];
    let x: number;
    for (let i = 0; i < history.length; i += 1) {
      x = xRatio * i + this._margin.x;
      if (history[i]) {
        last = history[i];
        coords.push([x, 0, this._calcPoint(last)]);
      } else {
        coords.push([x, 0, this._lastValue(last)]);
      }
    }
    return coords;
  }

  private _calcY(coords: Array<[number, number, number]>): Array<[number, number, number]> {
    // account for logarithmic graph
    const max = this._logarithmic ? Math.log10(Math.max(1, this._max)) : this._max;
    const min = this._logarithmic ? Math.log10(Math.max(1, this._min)) : this._min;

    const yRatio = ((max - min) / this._height) || 1;
    const coords2 = coords.map((coord) => {
      const val = this._logarithmic ? Math.log10(Math.max(1, coord[2])) : coord[2];
      const coordY = this._height - ((val - min) / yRatio) + this._margin.y * 2;
      return [coord[0], coordY, coord[2]] as [number, number, number];
    });

    return coords2;
  }

  getPoints(): Array<[number, number, number, number]> {
    let coords = [...this.coords];
    if (coords.length === 1) {
      coords[1] = [this._width + this._margin.x, 0, coords[0][2]];
    }
    coords = this._calcY(coords);
    if (this._smoothing) {
      let last = coords[0];
      coords.shift();
      return coords.map((point, i) => {
        const Z = this._midPoint(last[0], last[1], point[0], point[1]);
        const sum = (last[2] + point[2]) / 2;
        last = point;
        return [Z[0], Z[1], sum, i + 1];
      });
    } else {
      return coords.map((point, i) => [point[0], point[1], point[2], i]);
    }
  }

  getPath(): string {
    let coords = [...this.coords];
    if (coords.length === 1) {
      coords[1] = [this._width + this._margin.x, 0, coords[0][2]];
    }
    coords = this._calcY(coords);
    
    if (coords.length === 0) return '';
    
    let next: [number, number, number] | undefined;
    let Z: [number, number] | [number, number, number];
    let path = '';
    let last = coords[0];
    path += `M${last[0]},${last[1]}`;

    for (let i = 1; i < coords.length; i++) {
      next = coords[i];
      Z = this._smoothing ? this._midPoint(last[0], last[1], next[0], next[1]) : next;
      path += ` ${Z[0]},${Z[1]}`;
      path += ` Q ${next[0]},${next[1]}`;
      last = next;
    }
    
    if (next) {
      path += ` ${next[0]},${next[1]}`;
    }
    
    return path;
  }

  private _midPoint(Ax: number, Ay: number, Bx: number, By: number): [number, number] {
    const Zx = (Ax - Bx) / 2 + Bx;
    const Zy = (Ay - By) / 2 + By;
    return [Zx, Zy];
  }

  private _average(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, entry) => (sum + parseFloat(entry.state)), 0) / items.length;
  }

  private _median(items: any[]): number {
    if (!items || items.length === 0) return 0;
    const itemsDup = [...items].sort((a, b) => parseFloat(a.state) - parseFloat(b.state));
    const mid = Math.floor((itemsDup.length - 1) / 2);
    if (itemsDup.length % 2 === 1)
      return parseFloat(itemsDup[mid].state);
    return (parseFloat(itemsDup[mid].state) + parseFloat(itemsDup[mid + 1].state)) / 2;
  }

  private _maximum(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return Math.max(...items.map(item => parseFloat(item.state)));
  }

  private _minimum(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return Math.min(...items.map(item => parseFloat(item.state)));
  }

  private _first(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return parseFloat(items[0].state);
  }

  private _last(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return parseFloat(items[items.length - 1].state);
  }

  private _sum(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, entry) => sum + parseFloat(entry.state), 0);
  }

  private _delta(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return this._maximum(items) - this._minimum(items);
  }

  private _diff(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return this._last(items) - this._first(items);
  }

  private _lastValue(items: any[]): number {
    if (!items || items.length === 0) return 0;
    if (['delta', 'diff'].includes(this._aggregateFuncName)) {
      return 0;
    } else {
      return parseFloat(items[items.length - 1].state) || 0;
    }
  }

  private _updateEndTime() {
    this._endTime = new Date().getTime();
    switch (this._groupBy) {
      case 'month':
        this._endTime = new Date().setMonth(new Date().getMonth() + 1);
        break;
      case 'date':
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
        this._endTime = date.getTime();
        break;
      case 'hour':
        const hour = new Date();
        hour.setHours(hour.getHours() + 1);
        hour.setMinutes(0, 0, 0);
        this._endTime = hour.getTime();
        break;
      default:
        break;
    }
  }
}