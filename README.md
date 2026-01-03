# Install

Npm
```
npm i bigjpg
```

# Simple use example

```js
import { Bigjpg, Style, Noise, EnlargeValue } from "bigjpg"

(async () => {
    const bigjpg = new Bigjpg({ apiKey: "YOUR API TOKEN HERE" })

    const image = await bigjpg.enlarge({
        style: Style.Art,
        noise: Noise.None,
        enlargeValue: EnlargeValue["4x"],
        imageUrl: "https://avatars.githubusercontent.com/u/91915075?v=4"
    })

    const imageUrl = image.url // Enlarged image url
    await imageInfo.download("enlarged-image.png") // Method to download enlarged image

    console.log(imageUrl)
})()
```