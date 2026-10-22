# bigjpg

> Modern, fully typed TypeScript / JavaScript API client for [bigjpg.com](https://bigjpg.com) — AI Super-Resolution image upscaling.

[![npm version](https://img.shields.io/npm/v/bigjpg.svg)](https://www.npmjs.com/package/bigjpg)
[![license](https://img.shields.io/npm/l/bigjpg.svg)](https://github.com/marcuth/ts.bigjpg/blob/master/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

---

## Features

- ⚡ **Full Official API Coverage**: Image upload (`/api/img_upload`), task creation (`/api/task/`), result query (`/api/task/{ids}`), and task retry.
- 🖼️ **Flexible Input**: Upscale images via public URLs, local file paths, or in-memory Buffers.
- 🔄 **Smart Polling**: Automatic status polling with configurable delay, timeout safeguards, and temporary network error resilience.
- 🛡️ **Robust Error Handling**: Typed `BigjpgError` with friendly, detailed messages mapped to official API status codes (`requires_vip`, `month_limit`, `param_error`, `input_url_error`, etc.).
- 💾 **Built-in Image Downloader**: Stream directly to disk with automatic directory creation and error cleanup.
- 📦 **TypeScript First**: Full type safety with complete Enums and interfaces exported out-of-the-box.

---

## Installation

```bash
# npm
npm install bigjpg

# yarn
yarn add bigjpg

# pnpm
pnpm add bigjpg

# bun
bun add bigjpg
```

---

## Quick Start

```typescript
import { Bigjpg, Style, Noise, EnlargeValue } from "bigjpg"

const client = new Bigjpg({
  apiKey: "YOUR_API_KEY_HERE"
})

async function run() {
  const image = await client.enlarge({
    style: Style.Art,
    noise: Noise.None,
    enlargeValue: EnlargeValue["2x"],
    imageUrl: "https://example.com/sample.jpg"
  })

  console.log("Upscaled URL:", image.url)
  console.log("Remaining API Calls:", image.remainingApiCalls)

  // Download directly to local disk
  await image.download("./output/upscaled.png")
}

run()
```

---

## Usage Guide

### 1. Upscale from a Remote URL

Provide any publicly accessible HTTP/HTTPS image URL:

```typescript
import { Bigjpg, Style, Noise, EnlargeValue } from "bigjpg"

const client = new Bigjpg({ apiKey: "YOUR_API_KEY" })

const image = await client.enlarge({
  style: Style.Photo,
  noise: Noise.Medium,
  enlargeValue: EnlargeValue["4x"],
  imageUrl: "https://example.com/portrait.jpg"
})

await image.download("./upscaled_photo.png")
```

---

### 2. Upscale from a Local File

You can pass a local file path directly. `bigjpg` will automatically upload the file to Bigjpg's secure storage and process it:

```typescript
import { Bigjpg, Style, Noise, EnlargeValue } from "bigjpg"

const client = new Bigjpg({ apiKey: "YOUR_API_KEY" })

const image = await client.enlarge({
  style: Style.Art,
  noise: Noise.Low,
  enlargeValue: EnlargeValue["2x"],
  filePath: "./assets/drawing.png"
})

await image.download("./output/drawing_2x.png")
```

---

### 3. Upscale from a Buffer (In-Memory)

Ideal for file uploads in web servers (Express, Fastify, NestJS, Next.js, etc.):

```typescript
import { Bigjpg, Style, Noise, EnlargeValue } from "bigjpg"

const client = new Bigjpg({ apiKey: "YOUR_API_KEY" })

const fileBuffer = Buffer.from(...) // your image buffer

const image = await client.enlarge({
  style: Style.Art,
  noise: Noise.None,
  enlargeValue: EnlargeValue["2x"],
  file: fileBuffer,
  fileName: "character.png",
  fileType: "image/png"
})

await image.download("./character_2x.png")
```

---

### 4. Uploading Images Directly (`uploadImage`)

If you want to manage image uploads separately:

```typescript
const upload = await client.uploadImage({
  filePath: "./avatar.jpg"
})

console.log("Presigned Upload URL:", upload.uploadUrl)
console.log("Public File URL:", upload.fileUrl)
```

---

### 5. Querying Task Statuses (`queryTasks`)

Check the status of up to 100 tasks at once:

```typescript
import { TaskStatus } from "bigjpg"

const results = await client.queryTasks(["tid123", "tid456"])

console.log(results["tid123"])
// {
//   status: "success", // "new" | "process" | "success" | "error"
//   url: "https://cdn.bigjpg.com/...",
//   size: "2.4M"
// }
```

---

### 6. Retrying Failed Tasks (`retryTasks`)

Retry one or more tasks that encountered an error during processing:

```typescript
await client.retryTasks(["tid_failed_1", "tid_failed_2"])
```

---

## Configuration & Options

### `Bigjpg` Client Options

```typescript
const client = new Bigjpg({
  apiKey: "YOUR_API_KEY",      // Required: Bigjpg API key
  taskCheckDelay: 2000,        // Optional: Polling interval in ms (default: 2000ms)
  taskTimeout: 300000          // Optional: Polling timeout in ms (e.g. 5 minutes)
})
```

### `EnlargeImageOptions`

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `style` | `Style` \| `string` | **Yes** | `Style.Art` (`"art"`) or `Style.Photo` (`"photo"`) |
| `noise` | `Noise` \| `string` | **Yes** | Noise reduction level (`Noise.None`, `Low`, `Medium`, `High`, `Highest`) |
| `enlargeValue` | `EnlargeValue` \| `string` | **Yes** | Upscale multiplier (`EnlargeValue["2x"]`, `"4x"`, `"8x"`, `"16x"`) |
| `imageUrl` | `string` | *Optional\** | Public URL of the image |
| `filePath` | `string` | *Optional\** | Local file system path to the image |
| `file` | `Buffer` \| `Uint8Array` | *Optional\** | In-memory binary file buffer |
| `fileName` | `string` | *Optional* | Name of the file (defaults to basename or `"image.jpg"`) |
| `fileType` | `string` | *Optional* | MIME type (e.g., `"image/png"`, `"image/jpeg"`) |

*\* Exactly one of `imageUrl`, `filePath`, or `file` must be provided.*

---

## Enums Reference

### `Style`
- `Style.Art` = `"art"` (Cartoon / Anime / Illustrations)
- `Style.Photo` = `"photo"` (Real-world photographs)

### `Noise`
- `Noise.None` = `"-1"`
- `Noise.Low` = `"0"`
- `Noise.Medium` = `"1"`
- `Noise.High` = `"2"`
- `Noise.Highest` = `"3"`

### `EnlargeValue`
- `EnlargeValue["2x"]` = `"1"`
- `EnlargeValue["4x"]` = `"2"`
- `EnlargeValue["8x"]` = `"3"` (VIP accounts)
- `EnlargeValue["16x"]` = `"4"` (VIP accounts)

### `TaskStatus`
- `TaskStatus.New` = `"new"`
- `TaskStatus.Process` = `"process"`
- `TaskStatus.Success` = `"success"`
- `TaskStatus.Error` = `"error"`

---

## Error Handling

All library errors throw an instance of `BigjpgError`, with clear messages describing the root cause:

```typescript
import { Bigjpg, BigjpgError } from "bigjpg"

const client = new Bigjpg({ apiKey: "bad_key" })

try {
  await client.enlarge({ ... })
} catch (error) {
  if (error instanceof BigjpgError) {
    console.error("Bigjpg Error:", error.message)
  } else {
    console.error("Unexpected Error:", error)
  }
}
```

### Known API Error Statuses

| Status | Cause & Resolution |
| :--- | :--- |
| `valid_api_key_required` | The `X-API-KEY` header is missing or unrecognized. Ensure your API key is correct. |
| `requires_vip` | The account is on a free plan or subscription expired. The Bigjpg API requires an active paid plan. |
| `month_limit` | The monthly API call quota has been exhausted. |
| `param_error` | One or more parameters are out of bounds (e.g. 8x requested on a plan limited to 2x/4x). |
| `input_url_error` | The input URL is not a valid or publicly accessible HTTP/HTTPS image URL. |

---

## License

[MIT](./LICENSE) © [Marcuth](https://github.com/marcuth)