import axios from "axios"
import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"

import {
    Bigjpg,
    BigjpgError,
    BigjpgImage,
    BigjpgTask,
    EnlargeValue,
    Noise,
    Style,
    TaskStatus
} from "../index"

jest.mock("axios")
const mockedAxios = axios as jest.Mocked<typeof axios>

describe("Bigjpg Unit Tests (Mocked)", () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    describe("Bigjpg.enlarge()", () => {
        it("should successfully create a task, poll until finished and return BigjpgImage", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    tid: "task_12345",
                    remaining_api_calls: 42
                }
            })

            mockedAxios.get
                .mockResolvedValueOnce({
                    data: {
                        task_12345: {
                            status: TaskStatus.Process
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        task_12345: {
                            status: TaskStatus.Success,
                            url: "https://cdn.bigjpg.com/download/result.jpg?format,jpg",
                            size: "1.2M"
                        }
                    }
                })

            const client = new Bigjpg({
                apiKey: "my-valid-api-key",
                taskCheckDelay: 10
            })

            const result = await client.enlarge({
                style: Style.Art,
                noise: Noise.None,
                enlargeValue: EnlargeValue["2x"],
                imageUrl: "https://example.com/test.jpg",
                fileName: "custom_name.jpg"
            })

            expect(result).toBeInstanceOf(BigjpgImage)
            expect(result.url).toBe("https://cdn.bigjpg.com/download/result.jpg?format,png")
            expect(result.remainingApiCalls).toBe(42)

            expect(mockedAxios.post).toHaveBeenCalledWith(
                "https://bigjpg.com/api/task/",
                {
                    style: "art",
                    noise: "-1",
                    x2: "1",
                    input: "https://example.com/test.jpg",
                    file_name: "custom_name.jpg"
                },
                {
                    headers: {
                        "X-API-KEY": "my-valid-api-key",
                        "Content-Type": "application/json"
                    }
                }
            )
        })

        it("should upload local file buffer when imageUrl is not passed", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    url: "https://storage.r2.cloudflarestorage.com/upload-target",
                    fileurl: "https://public.bigjpg.com/uploaded.png"
                }
            })

            mockedAxios.put.mockResolvedValueOnce({ status: 200 })

            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    tid: "task_upload_1",
                    remaining_api_calls: 10
                }
            })

            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    task_upload_1: {
                        status: TaskStatus.Success,
                        url: "https://cdn.bigjpg.com/result.jpg"
                    }
                }
            })

            const client = new Bigjpg({ apiKey: "key" })
            const buffer = Buffer.from("fake-image-bytes")

            const image = await client.enlarge({
                style: Style.Art,
                noise: Noise.None,
                enlargeValue: EnlargeValue["2x"],
                file: buffer,
                fileName: "test.png",
                fileType: "image/png"
            })

            expect(image).toBeInstanceOf(BigjpgImage)
            expect(mockedAxios.put).toHaveBeenCalledWith(
                "https://storage.r2.cloudflarestorage.com/upload-target",
                buffer,
                { headers: { "Content-Type": "image/png" } }
            )
        })

        it("should throw BigjpgError when neither imageUrl, filePath nor file is provided", async () => {
            const client = new Bigjpg({ apiKey: "key" })

            await expect(
                client.enlarge({
                    style: Style.Art,
                    noise: Noise.None,
                    enlargeValue: EnlargeValue["2x"]
                })
            ).rejects.toThrow("Either 'imageUrl', 'filePath', or 'file' must be provided")
        })

        it("should throw BigjpgError when API returns input_url_error", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { status: "input_url_error" }
            })

            const client = new Bigjpg({ apiKey: "key" })

            await expect(
                client.enlarge({
                    style: Style.Photo,
                    noise: Noise.Medium,
                    enlargeValue: EnlargeValue["4x"],
                    imageUrl: "invalid-url"
                })
            ).rejects.toThrow("Input URL error")
        })

        it("should throw BigjpgError when API returns valid_api_key_required", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { status: "valid_api_key_required" }
            })

            const client = new Bigjpg({ apiKey: "bad_key" })

            await expect(
                client.enlarge({
                    style: Style.Photo,
                    noise: Noise.Medium,
                    enlargeValue: EnlargeValue["4x"],
                    imageUrl: "https://example.com/photo.jpg"
                })
            ).rejects.toThrow("Invalid API token")
        })

        it("should throw BigjpgError when API returns param_error", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { status: "param_error" }
            })

            const client = new Bigjpg({ apiKey: "valid_key" })

            await expect(
                client.enlarge({
                    style: Style.Photo,
                    noise: Noise.Low,
                    enlargeValue: EnlargeValue["2x"],
                    imageUrl: "https://example.com/photo.jpg"
                })
            ).rejects.toThrow("Invalid parameters")
        })

        it("should throw BigjpgError when API returns requires_vip", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { status: "requires_vip" }
            })

            const client = new Bigjpg({ apiKey: "free_account_key" })

            await expect(
                client.enlarge({
                    style: Style.Art,
                    noise: Noise.None,
                    enlargeValue: EnlargeValue["2x"],
                    imageUrl: "https://example.com/art.jpg"
                })
            ).rejects.toThrow("VIP account required")
        })

        it("should throw BigjpgError when API returns month_limit", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { status: "month_limit" }
            })

            const client = new Bigjpg({ apiKey: "valid_key" })

            await expect(
                client.enlarge({
                    style: Style.Art,
                    noise: Noise.None,
                    enlargeValue: EnlargeValue["2x"],
                    imageUrl: "https://example.com/art.jpg"
                })
            ).rejects.toThrow("Monthly API call limit reached")
        })

        it("should throw BigjpgError on missing task ID (tid)", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { remaining_api_calls: 10 }
            })

            const client = new Bigjpg({ apiKey: "valid_key" })

            await expect(
                client.enlarge({
                    style: Style.Art,
                    noise: Noise.None,
                    enlargeValue: EnlargeValue["2x"],
                    imageUrl: "https://example.com/art.jpg"
                })
            ).rejects.toThrow("Invalid API response: missing task ID (tid)")
        })

        it("should handle error thrown by axios with status response", async () => {
            const axiosError = {
                message: "Request failed with status code 400",
                response: {
                    data: { status: "param_error" }
                }
            }
            mockedAxios.post.mockRejectedValueOnce(axiosError)

            const client = new Bigjpg({ apiKey: "valid_key" })

            await expect(
                client.enlarge({
                    style: Style.Art,
                    noise: Noise.None,
                    enlargeValue: EnlargeValue["2x"],
                    imageUrl: "https://example.com/art.jpg"
                })
            ).rejects.toThrow("Invalid parameters")
        })
    })

    describe("Bigjpg.uploadImage()", () => {
        it("should upload file buffer and return URLs", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    url: "https://storage.example.com/r2/upload",
                    fileurl: "https://cdn.bigjpg.com/files/uploaded.jpg"
                }
            })
            mockedAxios.put.mockResolvedValueOnce({ status: 200 })

            const client = new Bigjpg({ apiKey: "key" })
            const result = await client.uploadImage({
                file: Buffer.from("data"),
                fileName: "photo.jpg"
            })

            expect(result.uploadUrl).toBe("https://storage.example.com/r2/upload")
            expect(result.fileUrl).toBe("https://cdn.bigjpg.com/files/uploaded.jpg")
            expect(mockedAxios.put).toHaveBeenCalledWith(
                "https://storage.example.com/r2/upload",
                Buffer.from("data"),
                { headers: { "Content-Type": "image/jpeg" } }
            )
        })
    })

    describe("Bigjpg.queryTasks() and retryTasks()", () => {
        it("should query multiple tasks by comma-separated IDs", async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    t1: { status: "success", url: "https://cdn.com/1.png", size: "1M" },
                    t2: { status: "process", url: "", size: "" }
                }
            })

            const client = new Bigjpg({ apiKey: "key" })
            const results = await client.queryTasks(["t1", "t2"])

            expect(mockedAxios.get).toHaveBeenCalledWith("https://bigjpg.com/api/task/t1,t2")
            expect(results.t1.status).toBe("success")
            expect(results.t2.status).toBe("process")
        })

        it("should retry failed tasks", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { status: "ok" }
            })

            const client = new Bigjpg({ apiKey: "key" })
            const result = await client.retryTasks(["t1", "t2"])

            expect(mockedAxios.post).toHaveBeenCalledWith(
                "https://bigjpg.com/api/task/t1,t2",
                {},
                { headers: { "X-API-KEY": "key" } }
            )
            expect(result.status).toBe("ok")
        })
    })

    describe("BigjpgTask", () => {
        it("should throw BigjpgError when task status is error", async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    task_err: {
                        status: "error",
                        msg: "Processing failed due to corrupted input"
                    }
                }
            })

            const task = new BigjpgTask({
                url: "https://bigjpg.com/api/task/task_err",
                taskId: "task_err",
                checkDelay: 10
            })

            await expect(task.fetchUntilAchieveTheResult()).rejects.toThrow(
                "Processing failed due to corrupted input"
            )
        })

        it("should throw BigjpgError when task times out", async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    task_timeout: {
                        status: "process"
                    }
                }
            })

            const task = new BigjpgTask({
                url: "https://bigjpg.com/api/task/task_timeout",
                taskId: "task_timeout",
                checkDelay: 10,
                timeout: 50
            })

            await expect(task.fetchUntilAchieveTheResult()).rejects.toThrow(/timed out/)
        })

        it("should retry on temporary network failure during polling and succeed", async () => {
            mockedAxios.get
                .mockRejectedValueOnce(new Error("Network glitch"))
                .mockResolvedValueOnce({
                    data: {
                        task_glitch: {
                            status: "success",
                            url: "https://cdn.bigjpg.com/done.png"
                        }
                    }
                })

            const task = new BigjpgTask({
                url: "https://bigjpg.com/api/task/task_glitch",
                taskId: "task_glitch",
                checkDelay: 10
            })

            const result = await task.fetchUntilAchieveTheResult()
            expect(result.status).toBe("success")
            expect(result.url).toBe("https://cdn.bigjpg.com/done.png")
        })
    })

    describe("BigjpgImage", () => {
        it("should create directory if not exists and download image", async () => {
            const readable = Readable.from(["image-stream-content"])
            mockedAxios.get.mockResolvedValueOnce({
                data: readable
            })

            const tempDir = path.join(__dirname, "nested_temp_dir")
            const filePath = path.join(tempDir, "image.png")

            const image = new BigjpgImage({
                url: "https://example.com/image.png",
                remainingApiCalls: 10
            })

            try {
                await image.download(filePath)
                expect(fs.existsSync(filePath)).toBe(true)
                const content = fs.readFileSync(filePath, "utf-8")
                expect(content).toBe("image-stream-content")
            } finally {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
                if (fs.existsSync(tempDir)) {
                    fs.rmdirSync(tempDir)
                }
            }
        })
    })
})
