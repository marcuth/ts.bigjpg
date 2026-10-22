import axios from "axios"
import fs from "node:fs"
import path from "node:path"

import { EnlargeConfig } from "./interfaces/enlarge-config"
import { ApiErrorStatus, EnlargeValue, Noise, Style, TaskStatus } from "./enums"
import { BigjpgImage } from "./image"
import { BigjpgError } from "./error"
import { BigjpgTask, TaskResult } from "./task"

const baseUrl = "https://bigjpg.com/api"

export type BigjpgOptions = {
    apiKey: string
    taskCheckDelay?: number
    taskTimeout?: number
}

export type EnlargeImageOptions = {
    style: Style | `${Style}`
    noise: Noise | `${Noise}`
    enlargeValue: EnlargeValue | `${EnlargeValue}`
    imageUrl?: string
    filePath?: string
    file?: Buffer | Uint8Array
    fileName?: string
    fileType?: string
}

export type UploadImageOptions = {
    file?: Buffer | Uint8Array
    filePath?: string
    fileName?: string
    fileType?: string
}

export type UploadImageResult = {
    uploadUrl: string
    fileUrl: string
}

function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    switch (ext) {
        case ".png":
            return "image/png"
        case ".gif":
            return "image/gif"
        case ".webp":
            return "image/webp"
        case ".bmp":
            return "image/bmp"
        case ".jpg":
        case ".jpeg":
        default:
            return "image/jpeg"
    }
}

function parseResponseData(raw: any): any {
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw)
        } catch {}
    }
    return raw
}

function handleApiErrorStatus(status: string): never {
    switch (status) {
        case ApiErrorStatus.ValidApiKeyRequired:
            throw new BigjpgError(
                "Invalid API token or header missing. API access requires an active paid account. Check your API key at https://bigjpg.com/"
            )
        case ApiErrorStatus.RequiresVip:
            throw new BigjpgError(
                "VIP account required: the account is free or the subscription has expired. Bigjpg API requires an active paid plan."
            )
        case ApiErrorStatus.MonthLimit:
            throw new BigjpgError(
                "Monthly API call limit reached for this account."
            )
        case ApiErrorStatus.ParamError:
            throw new BigjpgError(
                "Invalid parameters: 'style' must be 'art' or 'photo', 'noise' between '-1' and '3', and 'x2' between '1' and '4' (1-2 for free accounts)."
            )
        case ApiErrorStatus.InputUrlError:
            throw new BigjpgError(
                "Input URL error: 'input' must be a publicly accessible http:// or https:// image URL."
            )
        default:
            throw new BigjpgError(`Bigjpg API error: ${status}`)
    }
}

export class Bigjpg {
    readonly apiKey: string
    readonly taskCheckDelay: number
    readonly taskTimeout?: number

    constructor({ apiKey, taskCheckDelay, taskTimeout }: BigjpgOptions) {
        this.apiKey = apiKey
        this.taskCheckDelay = taskCheckDelay ?? 2000
        this.taskTimeout = taskTimeout
    }

    /**
     * Upload an image to Bigjpg (R2 storage) to obtain a public URL usable as input for enlarge.
     */
    async uploadImage({
        file,
        filePath,
        fileName,
        fileType
    }: UploadImageOptions): Promise<UploadImageResult> {
        if (!file && !filePath) {
            throw new BigjpgError("Either 'file' or 'filePath' must be provided for image upload.")
        }

        const resolvedFileName = fileName ?? (filePath ? path.basename(filePath) : "image.jpg")
        const resolvedFileType = fileType ?? getMimeType(resolvedFileName)

        let bufferData: Buffer | Uint8Array
        if (file) {
            bufferData = file
        } else if (filePath) {
            bufferData = await fs.promises.readFile(filePath)
        } else {
            throw new BigjpgError("No image data provided for upload.")
        }

        const uploadEndpoint = `${baseUrl}/img_upload`
        let response: any

        try {
            response = await axios.post(
                uploadEndpoint,
                new URLSearchParams({
                    filename: resolvedFileName,
                    filetype: resolvedFileType
                }).toString(),
                {
                    headers: {
                        "X-API-KEY": this.apiKey,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            )
        } catch (error: any) {
            const apiStatus = error.response?.data?.status
            if (apiStatus) {
                handleApiErrorStatus(apiStatus)
            }
            throw new BigjpgError(`Failed to request image upload URL: ${error.message || error}`)
        }

        const responseData = parseResponseData(response.data)

        if (!responseData || typeof responseData !== "object") {
            throw new BigjpgError(`Unexpected response from Bigjpg upload API: ${String(response.data)}`)
        }

        if ("status" in responseData && responseData.status !== "ok") {
            handleApiErrorStatus(responseData.status)
        }

        const uploadUrl = responseData.url
        const fileUrl = responseData.fileurl

        if (!uploadUrl || !fileUrl) {
            throw new BigjpgError("Upload failed: missing upload URL or file URL in API response.")
        }

        try {
            await axios.put(uploadUrl, bufferData, {
                headers: {
                    "Content-Type": resolvedFileType
                }
            })
        } catch (error: any) {
            throw new BigjpgError(`Failed to upload image file to storage: ${error.message || error}`)
        }

        return {
            uploadUrl: uploadUrl,
            fileUrl: fileUrl
        }
    }

    /**
     * Enlarge an image using Bigjpg AI.
     */
    async enlarge({
        style,
        noise,
        enlargeValue,
        imageUrl,
        filePath,
        file,
        fileName,
        fileType
    }: EnlargeImageOptions): Promise<BigjpgImage> {
        let inputUrl = imageUrl

        if (!inputUrl) {
            if (filePath || file) {
                const uploadResult = await this.uploadImage({
                    filePath,
                    file,
                    fileName,
                    fileType
                })
                inputUrl = uploadResult.fileUrl
            } else {
                throw new BigjpgError("Either 'imageUrl', 'filePath', or 'file' must be provided.")
            }
        }

        const url = `${baseUrl}/task/`

        const data: EnlargeConfig = {
            style: style,
            noise: noise,
            x2: enlargeValue,
            input: inputUrl
        }

        if (fileName) {
            data.file_name = fileName
        }

        const headers = {
            "X-API-KEY": this.apiKey,
            "Content-Type": "application/json"
        }

        let response: any
        try {
            response = await axios.post(
                url,
                data,
                { headers: headers }
            )
        } catch (error: any) {
            const apiStatus = error.response?.data?.status
            if (apiStatus) {
                handleApiErrorStatus(apiStatus)
            }
            throw new BigjpgError(`Failed to create enlargement task: ${error.message || error}`)
        }

        const responseData = parseResponseData(response.data)

        if (!responseData || typeof responseData !== "object") {
            throw new BigjpgError(`Unexpected response from Bigjpg API: ${String(response.data)}`)
        }

        if ("status" in responseData && responseData.status !== "ok") {
            handleApiErrorStatus(responseData.status)
        }

        if (!responseData.tid) {
            throw new BigjpgError("Invalid API response: missing task ID (tid)")
        }

        const remainingApiCalls = responseData.remaining_api_calls
        const taskId = responseData.tid
        const taskUrl = `${baseUrl}/task/${taskId}`

        const task = new BigjpgTask({
            url: taskUrl,
            taskId: taskId,
            checkDelay: this.taskCheckDelay,
            timeout: this.taskTimeout
        })

        const taskResult = await task.fetchUntilAchieveTheResult()

        if (!taskResult?.url) {
            throw new BigjpgError("Task completed but no image URL was returned")
        }

        const enlargedImageUrl: string = taskResult.url.replace("format,jpg", "format,png")

        return new BigjpgImage({
            url: enlargedImageUrl,
            remainingApiCalls: remainingApiCalls
        })
    }

    /**
     * Query the status and result of one or more tasks (up to 100).
     */
    async queryTasks(taskIds: string | string[]): Promise<Record<string, TaskResult>> {
        const ids = Array.isArray(taskIds) ? taskIds.join(",") : taskIds
        const url = `${baseUrl}/task/${ids}`

        try {
            const response = await axios.get(url)
            const responseData = parseResponseData(response.data)

            if (!responseData || typeof responseData !== "object") {
                throw new BigjpgError(`Unexpected response querying tasks: ${String(response.data)}`)
            }

            return responseData as Record<string, TaskResult>
        } catch (error: any) {
            if (error instanceof BigjpgError) throw error
            throw new BigjpgError(`Failed to query tasks: ${error.message || error}`)
        }
    }

    /**
     * Retry one or more failed tasks.
     */
    async retryTasks(taskIds: string | string[]): Promise<any> {
        const ids = Array.isArray(taskIds) ? taskIds.join(",") : taskIds
        const url = `${baseUrl}/task/${ids}`

        try {
            const response = await axios.post(
                url,
                {},
                {
                    headers: { "X-API-KEY": this.apiKey }
                }
            )
            const responseData = parseResponseData(response.data)

            if (responseData && typeof responseData === "object" && "status" in responseData && responseData.status !== "ok") {
                handleApiErrorStatus(responseData.status)
            }

            return responseData
        } catch (error: any) {
            if (error instanceof BigjpgError) throw error
            const apiStatus = error.response?.data?.status
            if (apiStatus) {
                handleApiErrorStatus(apiStatus)
            }
            throw new BigjpgError(`Failed to retry tasks: ${error.message || error}`)
        }
    }
}