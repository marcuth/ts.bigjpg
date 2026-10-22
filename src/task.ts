import axios from "axios"

import { BigjpgError } from "./error"
import { sleep } from "./utils"

export type BigjpgTaskOptions = {
    url: string
    taskId: string
    checkDelay: number
    timeout?: number
}

export interface TaskResult {
    status: string
    url?: string
    size?: string
    [key: string]: any
}

export class BigjpgTask {
    readonly url: string
    readonly taskId: string
    readonly checkDelay: number
    readonly timeout?: number

    constructor({ url, taskId, checkDelay, timeout }: BigjpgTaskOptions) {
        this.url = url
        this.taskId = taskId
        this.checkDelay = checkDelay
        this.timeout = timeout
    }

    async fetchUntilAchieveTheResult(): Promise<TaskResult> {
        const startTime = Date.now()
        let consecutiveErrors = 0
        const maxConsecutiveErrors = 5

        while (true) {
            if (this.timeout && Date.now() - startTime > this.timeout) {
                throw new BigjpgError(`Task timed out after ${this.timeout}ms while waiting for image processing`)
            }

            let responseData: any

            try {
                const response = await axios.get(this.url)
                responseData = response.data
                consecutiveErrors = 0
            } catch (err: any) {
                consecutiveErrors++
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    throw new BigjpgError(`Failed to fetch task status after ${maxConsecutiveErrors} attempts: ${err?.message || err}`)
                }
                await sleep(this.checkDelay)
                continue
            }

            if (typeof responseData === "string") {
                try {
                    responseData = JSON.parse(responseData)
                } catch {}
            }

            const data = responseData?.[this.taskId]

            if (!data) {
                await sleep(this.checkDelay)
                continue
            }

            const status = data.status

            if (status === "success") {
                return data 
            } else if (status === "error") {
                const message = data.msg || data.error || "Error processing the image!"
                throw new BigjpgError(message)
            }

            await sleep(this.checkDelay)
        }
    }
}