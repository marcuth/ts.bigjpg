import imageDownloader from "image-downloader"

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
        return await imageDownloader.image({
            url: this.url,
            dest: filePath,
            timeout: 0
        })
    }
}