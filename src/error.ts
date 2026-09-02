export class BigjpgError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = "BigjpgError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}