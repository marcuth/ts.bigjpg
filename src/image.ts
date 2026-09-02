import { pipeline } from "node:stream/promises"
import axios from "axios"
import fs from "node:fs"

export type BigjpgImageOptions = {
    url: string
    remainingApiCalls: number
}

export class BigjpgImage {
    readonly url: string
    readonly remainingApiCalls: number

    constructor({ url, remainingApiCalls }: BigjpgImageOptions) {
        this.url = url
        this.remainingApiCalls = remainingApiCalls
    }

    async download(filePath: string) {
        const response = await axios.get(this.url, {
            responseType: "stream"
        })

        const writer = fs.createWriteStream(filePath)
        
        await pipeline(response.data, writer)
    }
}