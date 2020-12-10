export class HandledError extends Error {  

  private _canRetry = false;

  constructor (message: string, canRetry? : boolean) {
    super(message)

    Object.setPrototypeOf(this, HandledError.prototype);

    this.name = this.constructor.name
    if(canRetry) {
      this._canRetry = true;
    }
  }

  get canRetry() : boolean {
    return this._canRetry;
  }

}