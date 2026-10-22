import { pipeline } from "node:stream/promises"
import axios from "axios"
import fs from "node:fs"
import path from "node:path"

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
        const dir = path.dirname(filePath)
        if (dir && !fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true })
        }

        const response = await axios.get(this.url, {
            responseType: "stream"
        })

        const writer = fs.createWriteStream(filePath)
        
        try {
            await pipeline(response.data, writer)
        } catch (error) {
            await fs.promises.unlink(filePath).catch(() => {})
            throw error
        }
    }
}