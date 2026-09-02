import axios from "axios"

import { EnlargeConfig } from "./interfaces/enlarge-config"
import { EnlargeValue, Noise, Style } from "./enums"
import { ApiErrorStatus } from "./enums"
import { BigjpgImage } from "./image"
import { BigjpgError } from "./error"
import { BigjpgTask } from "./task"

const baseUrl = "https://bigjpg.com/api"

export type BigjpgOptions = {
    apiKey: string
    taskCheckDelay?: number
}

export type EnlargeImageOptions = {
    style: Style | `${Style}`,
    noise: Noise | `${Noise}`,
    enlargeValue: EnlargeValue | `${EnlargeValue}`,
    imageUrl: string
}

export class Bigjpg {
    readonly apiKey: string
    readonly taskCheckDelay: number

    constructor({ apiKey, taskCheckDelay }: BigjpgOptions) {
        this.apiKey = apiKey
        this.taskCheckDelay = taskCheckDelay ?? 500
    }

    async enlarge({
        style,
        noise,
        enlargeValue,
        imageUrl
    }: EnlargeImageOptions): Promise<BigjpgImage> {
        const url = `${baseUrl}/task/`

        const data: EnlargeConfig = {
            style: style,
            noise: noise,
            x2: enlargeValue,
            input: imageUrl
        }

        const headers = { "X-API-KEY": this.apiKey }

        const response = await axios.post(
            url,
            data,
            { headers: headers }
        )

        const responseData = response.data

        if ("status" in responseData) {
            const status = responseData.status

            if (status === ApiErrorStatus.ValidApiKeyRequired) {
                throw new BigjpgError("Invalid API token, get your API token on the website by registering 'https://bigjpg.com/' and going to the 'API' section and copying your token that is present in the example code")
            } else if (status === ApiErrorStatus.ParamError) {
                throw new BigjpgError("Some invalid parameter, check parameters and features available in your account and try again")
            }
        }

        const remainingApiCalls = responseData.remaining_api_calls

        const taskId = responseData.tid
        const taskUrl = `${baseUrl}/task/${taskId}`

        const task = new BigjpgTask({
            url: taskUrl,
            taskId: taskId,
            checkDelay: this.taskCheckDelay
        })

        const taskResult = await task.fetchUntilAchieveTheResult()

        const enlargedImageUrl: string = taskResult.url.replace("format,jpg", "format,png")
        
        return new BigjpgImage({
            url: enlargedImageUrl,
            remainingApiCalls: remainingApiCalls
        })
    }
}