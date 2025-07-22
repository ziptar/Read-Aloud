export class Logger {
  private _enabled: boolean;

  constructor(enabled?: boolean) {
    this._enabled = enabled || false;
  }
  public get enabled(): boolean {
    return this._enabled;
  }

  public set enabled(value: boolean) {
    this._enabled = value;
  }

  public log(...args: any[]) {
    if (this._enabled) {
      console.log(...args);
    }
  }
}
