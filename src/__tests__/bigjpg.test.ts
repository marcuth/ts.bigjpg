import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"

import { Bigjpg, BigjpgError, BigjpgImage, EnlargeValue, Noise, Style } from "../index"

dotenv.config()

const API_KEY = process.env.BIGJPG_API_KEY || ""
const TEST_IMAGE_URL = "https://dci-static-s1.socialpointgames.com/static/dragoncity/mobile/ui/dragons/ui_1000_dragon_nature_3@2x.png"

describe("Bigjpg Integration & Unit Tests", () => {
    it("should throw BigjpgError when an invalid API key is provided", async () => {
        const invalidClient = new Bigjpg({ apiKey: "invalid_key_123" })

        await expect(
            invalidClient.enlarge({
                style: Style.Art,
                noise: Noise.None,
                enlargeValue: EnlargeValue["2x"],
                imageUrl: TEST_IMAGE_URL
            })
        ).rejects.toThrow(BigjpgError)
    })

    it("should process API request with provided API key and dragon city image", async () => {
        expect(API_KEY).toBeDefined()
        expect(API_KEY).not.toBe("")

        const client = new Bigjpg({ apiKey: API_KEY })

        try {
            const image = await client.enlarge({
                style: Style.Art,
                noise: Noise.None,
                enlargeValue: EnlargeValue["2x"],
                imageUrl: TEST_IMAGE_URL
            })

            expect(image).toBeInstanceOf(BigjpgImage)
            expect(typeof image.url).toBe("string")
            expect(image.url).toMatch(/^https?:\/\//)

            const outputPath = path.join(__dirname, "temp_output_dragon.png")
            try {
                await image.download(outputPath)
                expect(fs.existsSync(outputPath)).toBe(true)
                expect(fs.statSync(outputPath).size).toBeGreaterThan(0)
            } finally {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath)
                }
            }
        } catch (error) {
            expect(error).toBeInstanceOf(BigjpgError)
            if (error instanceof BigjpgError) {
                expect(error.message).toMatch(/(VIP|Invalid|parameter|error)/i)
            }
        }
    })

    it("should download an image to a destination path using BigjpgImage.download()", async () => {
        const image = new BigjpgImage({
            url: TEST_IMAGE_URL,
            remainingApiCalls: 10
        })

        expect(image.url).toBe(TEST_IMAGE_URL)
        expect(image.remainingApiCalls).toBe(10)

        const outputPath = path.join(__dirname, "temp_test_dragon.png")

        try {
            await image.download(outputPath)
            expect(fs.existsSync(outputPath)).toBe(true)
            const stats = fs.statSync(outputPath)
            expect(stats.size).toBeGreaterThan(0)
        } finally {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath)
            }
        }
    })
})
