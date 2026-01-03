import axios from "axios"

import { BigjpgError } from "./error"
import { sleep } from "./utils"

export type BigjpgTaskOptions = {
    url: string
    taskId: string
    checkDelay: number
}

export class BigjpgTask {
    readonly url: string
    readonly taskId: string
    readonly checkDelay: number

    constructor({ url, taskId, checkDelay }: BigjpgTaskOptions) {
        this.url = url
        this.taskId = taskId
        this.checkDelay = checkDelay
    }

    async fetchUntilAchieveTheResult() {
        while (true) {
            const response = await axios.get(this.url)
            const dataResponse = response.data

            const data = dataResponse[this.taskId]

            const status = data.status

            if (status === "success") {
                return data 
            } else if (status === "error") {
                throw new BigjpgError("Error processing the image!")
            }

            await sleep(.5)
        }
    }
}